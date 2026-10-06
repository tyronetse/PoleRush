// WebAudio sound for POLE RUSH: engine hum tied to speed, beeps, collision.
// Created lazily on first user gesture (autoplay policy safe).

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.engineNodes = null;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 1;
  }

  beep(freq = 440, dur = 0.15, type = 'square', vol = 0.18, when = 0) {
    this.ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  countdownBeep(final) {
    // 3-2-1 low, GO high
    this.beep(final ? 880 : 440, final ? 0.5 : 0.18, 'square', 0.2);
  }

  lapBeep() {
    this.beep(660, 0.12, 'square', 0.16);
    this.beep(990, 0.2, 'square', 0.16, 0.12);
  }

  crash() {
    this.ensure();
    if (!this.ctx) return;
    // filtered noise burst + low thud
    const t = this.ctx.currentTime;
    const dur = 0.3;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 900;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
    this.beep(90, 0.25, 'sawtooth', 0.3);
  }

  startEngine() {
    this.ensure();
    if (!this.ctx || this.engineNodes) return;
    const o1 = this.ctx.createOscillator();
    o1.type = 'sawtooth';
    const o2 = this.ctx.createOscillator();
    o2.type = 'square';
    o2.detune.value = 8;
    const g = this.ctx.createGain();
    g.gain.value = 0.045;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 700;
    f.Q.value = 2;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(this.master);
    o1.start(); o2.start();
    this.engineNodes = { o1, o2, g, f };
    this.updateEngine(0, false);
  }

  updateEngine(speedPercent, offRoad) {
    if (!this.engineNodes || !this.ctx) return;
    const t = this.ctx.currentTime;
    const base = 55 + speedPercent * 240;
    this.engineNodes.o1.frequency.setTargetAtTime(base, t, 0.05);
    this.engineNodes.o2.frequency.setTargetAtTime(base * 0.5 + 3, t, 0.05);
    this.engineNodes.f.frequency.setTargetAtTime(500 + speedPercent * 2200 + (offRoad ? 900 : 0), t, 0.08);
    this.engineNodes.g.gain.setTargetAtTime(offRoad ? 0.075 : 0.045, t, 0.08);
  }

  stopEngine() {
    if (!this.engineNodes) return;
    try {
      this.engineNodes.o1.stop();
      this.engineNodes.o2.stop();
    } catch (e) { /* already stopped */ }
    this.engineNodes = null;
  }
}
