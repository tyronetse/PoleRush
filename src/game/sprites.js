// Original canvas-drawn art for POLE RUSH. No external images, no trademarks.

export function drawBackdrop(ctx, w, h, skyOffset) {
  // sky gradient — sunset arcade vibe
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.55);
  sky.addColorStop(0, '#1b1040');
  sky.addColorStop(0.45, '#5b1f5e');
  sky.addColorStop(0.75, '#c94f4f');
  sky.addColorStop(1, '#f2a65a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.55);

  // sun
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(w * 0.5 + (skyOffset * 0.02 % w), h * 0.38, h * 0.09, 0, Math.PI * 2);
  ctx.fill();
  // sun slats (retro)
  ctx.fillStyle = '#c94f4f';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(w * 0.5 - h * 0.09 + (skyOffset * 0.02 % w), h * 0.38 + h * 0.02 + i * h * 0.022, h * 0.18, h * 0.008);
  }

  // far mountains (parallax layer 1)
  drawRidge(ctx, w, h, skyOffset * 0.08, h * 0.52, h * 0.16, '#3a2358');
  // near hills (parallax layer 2)
  drawRidge(ctx, w, h, skyOffset * 0.18, h * 0.56, h * 0.10, '#241640');
}

function drawRidge(ctx, w, h, offset, baseY, amp, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, baseY);
  const step = w / 8;
  for (let x = -step * 2; x < w + step * 2; x += step) {
    const px = ((x - (offset % (step * 4))) % (w + step * 4) + (w + step * 4)) % (w + step * 4) - step * 2;
    const peak = baseY - amp * (0.5 + 0.5 * Math.abs(Math.sin(x * 0.7)));
    ctx.lineTo(px + step / 2, peak);
    ctx.lineTo(px + step, baseY);
  }
  ctx.lineTo(w, h * 0.62);
  ctx.lineTo(0, h * 0.62);
  ctx.closePath();
  ctx.fill();
}

// F1-style rear-view car. x,y = center-bottom of car, w = pixel width.
export function drawCar(ctx, x, y, w, colors, opts = {}) {
  const h = w * 0.52;
  const { main, accent, dark } = colors;
  ctx.save();
  ctx.translate(x, y);

  // ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.02, w * 0.52, h * 0.10, 0, 0, Math.PI * 2);
  ctx.fill();

  // rear wheels
  ctx.fillStyle = '#141414';
  const ww = w * 0.16, wh = h * 0.42;
  roundRect(ctx, -w * 0.52, -wh, ww, wh, w * 0.03); ctx.fill();
  roundRect(ctx, w * 0.52 - ww, -wh, ww, wh, w * 0.03); ctx.fill();
  // wheel highlights
  ctx.fillStyle = '#3a3a3a';
  roundRect(ctx, -w * 0.52 + ww * 0.25, -wh * 0.8, ww * 0.5, wh * 0.6, w * 0.02); ctx.fill();
  roundRect(ctx, w * 0.52 - ww * 0.75, -wh * 0.8, ww * 0.5, wh * 0.6, w * 0.02); ctx.fill();

  // rear wing
  ctx.fillStyle = dark;
  ctx.fillRect(-w * 0.46, -h * 0.98, w * 0.92, h * 0.16);
  ctx.fillStyle = accent;
  ctx.fillRect(-w * 0.46, -h * 0.98, w * 0.92, h * 0.045);
  // wing endplates
  ctx.fillStyle = dark;
  ctx.fillRect(-w * 0.50, -h * 1.04, w * 0.05, h * 0.30);
  ctx.fillRect(w * 0.45, -h * 1.04, w * 0.05, h * 0.30);

  // main body (tapered monocoque)
  ctx.fillStyle = main;
  ctx.beginPath();
  ctx.moveTo(-w * 0.30, -h * 0.10);
  ctx.lineTo(-w * 0.20, -h * 0.82);
  ctx.lineTo(w * 0.20, -h * 0.82);
  ctx.lineTo(w * 0.30, -h * 0.10);
  ctx.closePath();
  ctx.fill();
  // nose stripe
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(-w * 0.05, -h * 0.10);
  ctx.lineTo(-w * 0.035, -h * 0.82);
  ctx.lineTo(w * 0.035, -h * 0.82);
  ctx.lineTo(w * 0.05, -h * 0.10);
  ctx.closePath();
  ctx.fill();

  // engine cover / halo hint
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.72, w * 0.085, h * 0.10, 0, 0, Math.PI * 2);
  ctx.fill();
  // driver helmet
  ctx.fillStyle = opts.visor || '#ffd75e';
  ctx.beginPath();
  ctx.arc(0, -h * 0.70, w * 0.055, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,20,30,0.85)';
  ctx.fillRect(-w * 0.05, -h * 0.72, w * 0.10, h * 0.035);

  // sidepods
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(-w * 0.30, -h * 0.12);
  ctx.lineTo(-w * 0.36, -h * 0.42);
  ctx.lineTo(-w * 0.26, -h * 0.42);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.30, -h * 0.12);
  ctx.lineTo(w * 0.36, -h * 0.42);
  ctx.lineTo(w * 0.26, -h * 0.42);
  ctx.closePath(); ctx.fill();

  // rain light
  if (opts.braking) {
    ctx.fillStyle = '#ff2a2a';
    ctx.shadowColor = '#ff2a2a'; ctx.shadowBlur = w * 0.06;
    ctx.fillRect(-w * 0.03, -h * 0.52, w * 0.06, h * 0.10);
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = '#7a1010';
    ctx.fillRect(-w * 0.03, -h * 0.52, w * 0.06, h * 0.10);
  }

  // exhaust flame when accelerating hard
  if (opts.flame) {
    ctx.fillStyle = '#ffb13d';
    ctx.beginPath();
    ctx.moveTo(-w * 0.045, -h * 0.06);
    ctx.lineTo(0, -h * 0.06 + w * 0.06 * (0.7 + Math.random() * 0.6));
    ctx.lineTo(w * 0.045, -h * 0.06);
    ctx.closePath(); ctx.fill();
  }

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// --- roadside billboards (original art) ---
export function drawRoadside(ctx, sprite, x, y, scale) {
  // y = ground point on screen; scale = pixels per world-ish unit
  if (sprite.type === 'tree') {
    const h = 900 * scale;
    const w = h * 0.55;
    ctx.fillStyle = '#4a2f1d';
    ctx.fillRect(x - w * 0.06, y - h * 0.45, w * 0.12, h * 0.45);
    const greens = ['#2e7d32', '#388e3c', '#43a047'];
    ctx.fillStyle = greens[sprite.variant % 3];
    for (let i = 0; i < 3; i++) {
      const r = w * (0.5 - i * 0.09);
      ctx.beginPath();
      ctx.arc(x, y - h * 0.45 - h * 0.16 * i - r * 0.4, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (sprite.type === 'sign') {
    const h = 620 * scale;
    ctx.fillStyle = '#888';
    ctx.fillRect(x - h * 0.03, y - h, h * 0.06, h);
    const bw = h * 1.1, bh = h * 0.55;
    ctx.fillStyle = '#f5c518';
    roundRect(ctx, x - bw / 2, y - h - bh / 2, bw, bh, h * 0.06);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.font = `900 ${bh * 0.55}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const arrow = sprite.dir > 0 ? '▶' : sprite.dir < 0 ? '◀' : '▲';
    ctx.fillText(arrow, x, y - h - bh * 0.02);
  } else if (sprite.type === 'billboard') {
    const h = 1100 * scale;
    const bw = h * 2.4, bh = h * 0.8;
    ctx.fillStyle = '#333';
    ctx.fillRect(x - bw * 0.32, y - h, bw * 0.05, h);
    ctx.fillRect(x + bw * 0.27, y - h, bw * 0.05, h);
    ctx.fillStyle = '#101018';
    roundRect(ctx, x - bw / 2, y - h - bh, bw, bh, h * 0.05);
    ctx.fill();
    ctx.strokeStyle = '#ff2fb3'; ctx.lineWidth = Math.max(2, h * 0.02);
    roundRect(ctx, x - bw / 2, y - h - bh, bw, bh, h * 0.05);
    ctx.stroke();
    ctx.fillStyle = '#ff2fb3';
    ctx.font = `900 ${bh * 0.42}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('POLE RUSH', x, y - h - bh * 0.48);
    ctx.fillStyle = '#37e2ff';
    ctx.font = `700 ${bh * 0.2}px Arial`;
    ctx.fillText('★ ARCADE GP ★', x, y - h - bh * 0.16);
  } else if (sprite.type === 'gantry') {
    // start/finish gantry spanning the road
    const h = 1500 * scale;
    const span = 4600 * scale;
    ctx.fillStyle = '#222';
    ctx.fillRect(x - span / 2, y - h, span * 0.04, h);
    ctx.fillRect(x + span / 2 - span * 0.04, y - h, span * 0.04, h);
    ctx.fillStyle = '#f2f2f2';
    const bh = h * 0.22;
    ctx.fillRect(x - span / 2, y - h, span, bh);
    // checkered strip
    const sq = bh / 2;
    for (let i = 0; i * sq < span; i++) {
      ctx.fillStyle = (i % 2 === 0) ? '#111' : '#f2f2f2';
      ctx.fillRect(x - span / 2 + i * sq, y - h, sq, sq);
      ctx.fillStyle = (i % 2 === 0) ? '#f2f2f2' : '#111';
      ctx.fillRect(x - span / 2 + i * sq, y - h + sq, sq, sq);
    }
    ctx.fillStyle = '#d21f3c';
    ctx.font = `900 ${bh * 0.5}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('POLE RUSH', x, y - h + bh * 1.7);
  }
}

export const PLAYER_COLORS = { main: '#e8382a', accent: '#ffffff', dark: '#5c1210' };
export const RIVAL_COLORS = [
  { main: '#2456e0', accent: '#9fc2ff', dark: '#0e1f5c' },
  { main: '#18b35a', accent: '#d2ffd2', dark: '#0a4d27' },
  { main: '#f2b705', accent: '#3a2b00', dark: '#7a5c00' },
  { main: '#8a2be2', accent: '#e6ccff', dark: '#3d1166' },
  { main: '#ff7b1c', accent: '#fff3d6', dark: '#7a3a08' },
  { main: '#19c2d8', accent: '#06333a', dark: '#0a5a66' },
  { main: '#e8e8e8', accent: '#c82828', dark: '#555555' },
];
