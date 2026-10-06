// POLE RUSH — pseudo-3D arcade racing engine.
// Classic segment-based road renderer, original implementation.

import {
  SEGMENT_LENGTH, RUMBLE_LENGTH, LANES, ROAD_WIDTH, CAMERA_HEIGHT, CAMERA_DEPTH,
  PLAYER_Z, DRAW_DISTANCE, MAX_SPEED, ACCEL, BRAKING, DECEL,
  OFF_ROAD_DECEL, OFF_ROAD_LIMIT, CENTRIFUGAL, COLORS, buildTrack,
} from './track.js';
import { SoundEngine } from './audio.js';
import { drawBackdrop, drawCar, drawRoadside, PLAYER_COLORS, RIVAL_COLORS } from './sprites.js';

const WIDTH = 960;
const HEIGHT = 540;
const TOTAL_LAPS = 3;
const SEG = SEGMENT_LENGTH;

function interpolate(a, b, p) { return a + (b - a) * p; }
function exponentialFog(density, d) { return 1 / Math.pow(Math.E, d * d * density); }

function polygon(ctx, x1, y1, x2, y2, x3, y3, x4, y4, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.lineTo(x4, y4);
  ctx.closePath();
  ctx.fill();
}

function fmtTime(s) {
  if (s == null || !isFinite(s)) return '--:--.-';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const t = Math.floor((s % 1) * 10);
  return `${m}:${String(sec).padStart(2, '0')}.${t}`;
}

export class Game {
  constructor(canvas, onHud) {
    this.canvas = canvas;
    canvas.width = WIDTH; canvas.height = HEIGHT;
    this.ctx = canvas.getContext('2d');
    this.onHud = onHud;
    this.input = { left: false, right: false, up: false, down: false, tLeft: false, tRight: false, tUp: false, tDown: false };
    this.sound = new SoundEngine();
    const t = buildTrack();
    this.segments = t.segments;
    this.trackLength = t.trackLength;
    this.muted = false;
    this.raf = 0;
    this.last = performance.now();
    this.hudLast = 0;
    this._onKeyDown = (e) => this.handleKey(e, true);
    this._onKeyUp = (e) => this.handleKey(e, false);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    this.reset();
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.sound.stopEngine();
  }

  reset() {
    this.position = 0;
    this.playerX = 0;
    this.speed = 0;
    this.mode = 'title';
    this.countdown = 0;
    this.lastCount = 4;
    this.goTimer = 0;
    this.raceTime = 0;
    this.lap = 1;
    this.lapStart = 0;
    this.lapTimes = [];
    this.bestLap = null;
    this.finalPos = null;
    this.shake = 0;
    this.steerSmooth = 0;
    this.bgOffset = 0;
    this.offRoad = false;
    this.crashCooldown = 0;
    this.playerTotal = 0;
    this.opponents = RIVAL_COLORS.map((colors, i) => ({
      colors,
      z: (i + 1) * SEG * 4,
      offset: i % 2 === 0 ? -0.45 : 0.45,
      speed: 0,
      skill: 0.88 + Math.random() * 0.12,
      wander: (Math.random() - 0.5) * 0.5,
      total: (i + 1) * SEG * 4,
    }));
    this.pushHud(true);
  }

  startCountdown() {
    this.sound.ensure();
    this.reset();
    this.mode = 'countdown';
    this.countdown = 3.0;
    this.lastCount = 4;
  }

  restart() { this.startCountdown(); }

  toggleMute() {
    this.muted = !this.muted;
    this.sound.ensure();
    this.sound.setMuted(this.muted);
    this.pushHud(true);
    return this.muted;
  }

  setTouch(name, on) {
    if (name === 'left') this.input.tLeft = on;
    else if (name === 'right') this.input.tRight = on;
    else if (name === 'up') this.input.tUp = on;
    else if (name === 'down') this.input.tDown = on;
  }

  handleKey(e, down) {
    const k = e.code;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(k)) e.preventDefault();
    if (k === 'ArrowLeft' || k === 'KeyA') this.input.left = down;
    else if (k === 'ArrowRight' || k === 'KeyD') this.input.right = down;
    else if (k === 'ArrowUp' || k === 'KeyW') this.input.up = down;
    else if (k === 'ArrowDown' || k === 'KeyS') this.input.down = down;
    else if (down && (k === 'Enter' || k === 'Space')) {
      if (this.mode === 'title' || this.mode === 'finished') this.startCountdown();
    }
    else if (down && k === 'KeyM') this.toggleMute();
  }

  findSegment(z) {
    return this.segments[Math.floor(z / SEG) % this.segments.length];
  }

  project(p, cameraX, cameraY, cameraZ) {
    p.camera.x = (p.world.x || 0) - cameraX;
    p.camera.y = (p.world.y || 0) - cameraY;
    p.camera.z = (p.world.z || 0) - cameraZ;
    p.screen.scale = CAMERA_DEPTH / p.camera.z;
    p.screen.x = Math.round(WIDTH / 2 - p.screen.scale * p.camera.x * WIDTH / 2);
    p.screen.y = Math.round(HEIGHT / 2 - p.screen.scale * p.camera.y * HEIGHT / 2);
    p.screen.w = Math.round(p.screen.scale * ROAD_WIDTH * WIDTH / 2);
  }

  rank() {
    const all = [{ d: this.playerTotal, me: true }];
    for (const o of this.opponents) all.push({ d: o.total, me: false });
    all.sort((a, b) => b.d - a.d);
    return all.findIndex((a) => a.me) + 1;
  }

  frame(now) {
    this.raf = requestAnimationFrame((t) => this.frame(t));
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.05) dt = 0.05;
    this.update(dt);
    this.render();
    if (now - this.hudLast > 120) { this.hudLast = now; this.pushHud(); }
  }

  pushHud(force) {
    if (!this.onHud) return;
    this.onHud({
      mode: this.mode,
      speedKmh: Math.round((this.speed / MAX_SPEED) * 312),
      lap: Math.min(this.lap, TOTAL_LAPS),
      totalLaps: TOTAL_LAPS,
      pos: this.mode === 'finished' && this.finalPos ? this.finalPos : this.rank(),
      cars: 8,
      time: fmtTime(this.raceTime),
      countdown: Math.max(0, Math.ceil(this.countdown)),
      go: this.goTimer > 0,
      lapTimes: this.lapTimes.map(fmtTime),
      bestLap: fmtTime(this.bestLap),
      finalPos: this.finalPos,
      muted: this.muted,
    });
    if (force) this.hudLast = performance.now();
  }

  update(dt) {
    if (this.mode === 'title') {
      this.position = (this.position + MAX_SPEED * 0.35 * dt) % this.trackLength;
      const seg = this.findSegment(this.position + PLAYER_Z);
      this.bgOffset += seg.curve * 0.35 * dt * 140;
      return;
    }
    if (this.mode === 'countdown') {
      const cur = Math.ceil(this.countdown);
      if (cur < this.lastCount && cur >= 0) {
        this.lastCount = cur;
        this.sound.countdownBeep(cur === 0);
      }
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.mode = 'racing';
        this.goTimer = 1.4;
        this.lapStart = 0;
        this.sound.startEngine();
      }
      return;
    }
    if (this.goTimer > 0) this.goTimer -= dt;
    if (this.crashCooldown > 0) this.crashCooldown -= dt;

    const racing = this.mode === 'racing';
    if (racing) this.raceTime += dt;

    this.updatePlayer(dt, racing);
    this.updateOpponents(dt);
    if (racing) this.checkCollisions();

    // lap tracking
    const lapNow = Math.floor(this.playerTotal / this.trackLength) + 1;
    if (racing && lapNow > this.lap) {
      const lt = this.raceTime - this.lapStart;
      this.lapTimes.push(lt);
      this.lapStart = this.raceTime;
      if (!this.bestLap || lt < this.bestLap) this.bestLap = lt;
      this.lap = lapNow;
      if (this.lap > TOTAL_LAPS) this.finishRace();
      else this.sound.lapBeep();
    }

    this.sound.updateEngine(this.speed / MAX_SPEED, this.offRoad);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2.5);
  }

  updatePlayer(dt, racing) {
    const speedPercent = this.speed / MAX_SPEED;
    const playerSegment = this.findSegment(this.position + PLAYER_Z);
    const steerTarget =
      (this.input.right || this.input.tRight ? 1 : 0) -
      (this.input.left || this.input.tLeft ? 1 : 0);
    // Smooth the steering input so touch buttons feel analog, not binary.
    // Ramps toward the target at 8 units/sec, killing twitchy overcorrection.
    const maxDelta = 8 * dt;
    this.steerSmooth += Math.max(-maxDelta, Math.min(maxDelta, steerTarget - this.steerSmooth));
    // Steering stays effective at low speed so you can recover from the grass
    // instead of getting stuck crawling with no control.
    const dx = dt * 2.2 * (0.35 + 0.65 * speedPercent);

    this.position = (this.position + this.speed * dt) % this.trackLength;
    this.playerTotal += this.speed * dt;

    this.playerX += dx * this.steerSmooth;
    this.playerX -= dx * speedPercent * playerSegment.curve * CENTRIFUGAL;

    const gas = this.input.up || this.input.tUp;
    const brake = this.input.down || this.input.tDown;
    if (this.mode === 'finished') this.speed += DECEL * 1.5 * dt;
    else if (gas) this.speed += ACCEL * dt;
    else if (brake) this.speed += BRAKING * dt;
    else this.speed += DECEL * dt;

    this.offRoad = Math.abs(this.playerX) > 1.12;
    if (this.offRoad && this.speed > OFF_ROAD_LIMIT) this.speed += OFF_ROAD_DECEL * dt;

    this.speed = Math.max(0, Math.min(MAX_SPEED, this.speed));
    this.playerX = Math.max(-2.4, Math.min(2.4, this.playerX));

    this.bgOffset += playerSegment.curve * speedPercent * dt * 140;
  }

  threatsFor(o) {
    const res = [];
    const pdz = (((this.position - o.z) % this.trackLength) + this.trackLength) % this.trackLength;
    if (pdz > 1 && pdz < SEG * 10 && Math.abs(this.playerX - o.offset) < 0.4)
      res.push({ dz: pdz, speed: this.speed, ox: this.playerX });
    for (const q of this.opponents) {
      if (q === o) continue;
      const dz = (((q.z - o.z) % this.trackLength) + this.trackLength) % this.trackLength;
      if (dz > 1 && dz < SEG * 10 && Math.abs(q.offset - o.offset) < 0.4)
        res.push({ dz, speed: q.speed, ox: q.offset });
    }
    return res;
  }

  updateOpponents(dt) {
    const active = this.mode === 'racing' || this.mode === 'finished';
    for (const o of this.opponents) {
      const ahead = this.findSegment(o.z + SEG * 8);
      const curveF = Math.min(1, Math.abs(ahead.curve) / 5);
      let target = MAX_SPEED * (1 - curveF * 0.52) * o.skill;
      let desired = -ahead.curve * 0.13 + o.wander * (0.5 + curveF);
      for (const t of this.threatsFor(o)) {
        if (t.dz < SEG * 7) {
          target = Math.min(target, t.speed);
          desired = o.offset + (o.offset <= t.ox ? -0.5 : 0.5);
        }
      }
      desired = Math.max(-1.15, Math.min(1.15, desired));
      const dv = target - o.speed;
      o.speed += Math.max(-MAX_SPEED * 0.9 * dt, Math.min(MAX_SPEED * 0.4 * dt, dv));
      o.offset += (desired - o.offset) * Math.min(1, dt * 2.4);
      if (active) {
        o.z = (o.z + o.speed * dt) % this.trackLength;
        o.total += o.speed * dt;
      }
    }
  }

  checkCollisions() {
    for (const o of this.opponents) {
      let dz = (((o.z - this.position) % this.trackLength) + this.trackLength) % this.trackLength;
      if (dz > this.trackLength / 2) dz -= this.trackLength;
      if (Math.abs(dz) < SEG * 1.6 && Math.abs(o.offset - this.playerX) < 0.32) {
        if (this.speed > o.speed && this.crashCooldown <= 0) {
          this.speed = o.speed * 0.45;
          this.playerX += this.playerX <= o.offset ? -0.28 : 0.28;
          this.sound.crash();
          this.shake = 1;
          this.crashCooldown = 0.8;
        }
      }
    }
  }

  finishRace() {
    this.finalPos = this.rank();
    this.mode = 'finished';
    this.sound.stopEngine();
    this.sound.lapBeep();
    this.sound.beep(523, 0.15, 'square', 0.18, 0.3);
    this.sound.beep(659, 0.15, 'square', 0.18, 0.45);
    this.sound.beep(784, 0.35, 'square', 0.2, 0.6);
    this.pushHud(true);
  }

  renderSegment(x1, y1, w1, x2, y2, w2, fog, color) {
    const ctx = this.ctx;
    const r1 = w1 / 5, r2 = w2 / 5;
    const l1 = w1 / 28, l2 = w2 / 28;
    const c = COLORS[color];

    // grass
    ctx.fillStyle = c.grass;
    ctx.fillRect(0, y2, WIDTH, y1 - y2);

    polygon(ctx, x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, c.rumble);
    polygon(ctx, x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, c.rumble);
    polygon(ctx, x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, c.road);

    if (c.lane) {
      const lanew1 = (w1 * 2) / LANES, lanew2 = (w2 * 2) / LANES;
      let lanex1 = x1 - w1 + lanew1, lanex2 = x2 - w2 + lanew2;
      for (let lane = 1; lane < LANES; lane++) {
        polygon(ctx, lanex1 - l1 / 2, y1, lanex1 + l1 / 2, y1, lanex2 + l2 / 2, y2, lanex2 - l2 / 2, y2, c.lane);
        lanex1 += lanew1; lanex2 += lanew2;
      }
    }
    // fog
    if (fog > 0.01) {
      ctx.globalAlpha = Math.min(0.85, fog);
      ctx.fillStyle = COLORS.fog;
      ctx.fillRect(0, y2, WIDTH, y1 - y2);
      ctx.globalAlpha = 1;
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.save();
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * 14 * this.shake, (Math.random() - 0.5) * 10 * this.shake);
    }

    drawBackdrop(ctx, WIDTH, HEIGHT, this.bgOffset);

    const baseSegment = this.findSegment(this.position);
    const basePercent = (this.position % SEG) / SEG;
    const playerSegment = this.findSegment(this.position + PLAYER_Z);
    const playerPercent = ((this.position + PLAYER_Z) % SEG) / SEG;
    const playerY = interpolate(playerSegment.p1.world.y, playerSegment.p2.world.y, playerPercent);

    let maxy = HEIGHT;
    let x = 0;
    let dx = -(baseSegment.curve * basePercent);

    // bucket visible opponents by segment index
    const carsBySeg = new Map();
    for (const o of this.opponents) {
      const relZ = (((o.z - this.position) % this.trackLength) + this.trackLength) % this.trackLength;
      if (relZ > SEG * 0.5 && relZ < DRAW_DISTANCE * SEG) {
        const si = Math.floor(o.z / SEG) % this.segments.length;
        if (!carsBySeg.has(si)) carsBySeg.set(si, []);
        carsBySeg.get(si).push(o);
      }
    }

    for (let n = 0; n < DRAW_DISTANCE; n++) {
      const segment = this.segments[(baseSegment.index + n) % this.segments.length];
      segment.looped = segment.index < baseSegment.index;
      segment.fog = exponentialFog(5, n / DRAW_DISTANCE);
      segment.clip = maxy;

      const camZ = this.position - (segment.looped ? this.trackLength : 0);
      this.project(segment.p1, this.playerX * ROAD_WIDTH - x, playerY + CAMERA_HEIGHT, camZ);
      this.project(segment.p2, this.playerX * ROAD_WIDTH - x - dx, playerY + CAMERA_HEIGHT, camZ);

      x += dx;
      dx += segment.curve;

      if (segment.p1.camera.z <= CAMERA_DEPTH || segment.p2.screen.y >= segment.p1.screen.y || segment.p2.screen.y >= maxy)
        continue;

      this.renderSegment(
        segment.p1.screen.x, segment.p1.screen.y, segment.p1.screen.w,
        segment.p2.screen.x, segment.p2.screen.y, segment.p2.screen.w,
        segment.fog, segment.color
      );
      maxy = segment.p1.screen.y;
    }

    // sprites + opponents, back to front
    for (let n = DRAW_DISTANCE - 1; n > 0; n--) {
      const segment = this.segments[(baseSegment.index + n) % this.segments.length];
      const scale = segment.p1.screen.scale;

      for (const sprite of segment.sprites) {
        const sx = segment.p1.screen.x + scale * sprite.offset * ROAD_WIDTH * WIDTH / 2;
        const sy = segment.p1.screen.y;
        if (sy <= segment.clip || sy > HEIGHT + 40) continue;
        drawRoadside(ctx, sprite, sx, sy, scale * (HEIGHT / 2));
      }

      const cars = carsBySeg.get(segment.index);
      if (cars) {
        for (const o of cars) {
          const pct = (o.z % SEG) / SEG;
          const sy = segment.p1.screen.y + (segment.p2.screen.y - segment.p1.screen.y) * pct;
          if (sy <= segment.clip || sy > HEIGHT) continue;
          const sx = segment.p1.screen.x + scale * o.offset * ROAD_WIDTH * WIDTH / 2;
          const cw = scale * ROAD_WIDTH * (WIDTH / 2) * 0.17;
          if (cw < 4 || cw > WIDTH * 1.4) continue;
          drawCar(ctx, sx, sy, cw, o.colors, {});
        }
      }
    }

    // player car
    if (this.mode !== 'title') {
      const bounce = this.offRoad && this.speed > 1
        ? Math.sin(performance.now() / 40) * 3
        : Math.sin(performance.now() / 300) * 1.5;
      const steerLean = this.steerSmooth;
      drawCar(ctx, WIDTH / 2 + steerLean * 14, HEIGHT - 24 + bounce, WIDTH * 0.30, PLAYER_COLORS, {
        braking: this.input.down || this.input.tDown,
        flame: (this.input.up || this.input.tUp) && this.speed > MAX_SPEED * 0.5,
      });
    }

    ctx.restore();
  }
}
