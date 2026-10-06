// Track construction for POLE RUSH — classic segment-based pseudo-3D road.
// All original code; no external assets.

export const SEGMENT_LENGTH = 200;
export const RUMBLE_LENGTH = 3;
export const LANES = 3;
export const ROAD_WIDTH = 2100;
export const FIELD_OF_VIEW = 100;
export const CAMERA_HEIGHT = 1150;
export const CAMERA_DEPTH = 1 / Math.tan(((FIELD_OF_VIEW / 2) * Math.PI) / 180);
export const PLAYER_Z = CAMERA_HEIGHT * CAMERA_DEPTH;
export const DRAW_DISTANCE = 280;

export const MAX_SPEED = SEGMENT_LENGTH * 60; // world units / second
export const ACCEL = MAX_SPEED / 5;
export const BRAKING = -MAX_SPEED;
export const DECEL = -MAX_SPEED / 5;
export const OFF_ROAD_DECEL = -MAX_SPEED / 1.4;
export const OFF_ROAD_LIMIT = MAX_SPEED / 4;
export const CENTRIFUGAL = 0.32;

export const COLORS = {
  light: {
    road: '#6e6e6e', grass: '#62a84b', rumble: '#e8e8e8', lane: '#f4f4f4',
  },
  dark: {
    road: '#686868', grass: '#57a047', rumble: '#c82828', lane: null,
  },
  fog: '#0b1026',
};

// ---- easing helpers ----
function easeIn(a, b, p) { return a + (b - a) * p * p; }
function easeInOut(a, b, p) { return a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5); }

const LENGTH = { short: 15, medium: 30, long: 60 };

export function buildTrack() {
  const segments = [];

  function lastY() {
    return segments.length === 0 ? 0 : segments[segments.length - 1].p2.world.y;
  }

  function addSegment(curve, y) {
    const n = segments.length;
    segments.push({
      index: n,
      curve,
      sprites: [],
      p1: { world: { x: 0, y: lastY(), z: n * SEGMENT_LENGTH }, camera: {}, screen: {} },
      p2: { world: { x: 0, y, z: (n + 1) * SEGMENT_LENGTH }, camera: {}, screen: {} },
      color: Math.floor(n / RUMBLE_LENGTH) % 2 ? 'dark' : 'light',
      looped: false,
      fog: 0,
      clip: 0,
    });
  }

  function addRoad(enter, hold, leave, curve, dy) {
    const startY = lastY();
    const endY = startY + dy * SEGMENT_LENGTH;
    const total = enter + hold + leave;
    for (let n = 0; n < enter; n++)
      addSegment(easeIn(0, curve, n / enter), easeInOut(startY, endY, n / total));
    for (let n = 0; n < hold; n++)
      addSegment(curve, easeInOut(startY, endY, (enter + n) / total));
    for (let n = 0; n < leave; n++)
      addSegment(easeInOut(curve, 0, n / leave), easeInOut(startY, endY, (enter + hold + n) / total));
  }

  function addStraight(num) { addRoad(num, num, num, 0, 0); }
  function addHill(num, height) { addRoad(num, num, num, 0, height); }
  function addCurve(num, curve, height) { addRoad(num, num, num, curve, height || 0); }
  function addSCurves() {
    addRoad(LENGTH.medium, LENGTH.medium, LENGTH.medium, -2, 0);
    addRoad(LENGTH.medium, LENGTH.medium, LENGTH.medium, 3, 20);
    addRoad(LENGTH.medium, LENGTH.medium, LENGTH.medium, 2, -20);
    addRoad(LENGTH.medium, LENGTH.medium, LENGTH.medium, -3, -10);
    addRoad(LENGTH.medium, LENGTH.medium, LENGTH.medium, 2, 10);
  }
  function addBumps() {
    addRoad(10, 10, 10, 0, 8);
    addRoad(10, 10, 10, 0, -8);
    addRoad(10, 10, 10, 0, 5);
    addRoad(10, 10, 10, 0, -5);
  }
  function addLowRollingHills() {
    addRoad(LENGTH.short, LENGTH.short, LENGTH.short, 0, 12);
    addRoad(LENGTH.short, LENGTH.short, LENGTH.short, 0, -12);
    addRoad(LENGTH.short, LENGTH.short, LENGTH.short, 2, 6);
    addRoad(LENGTH.short, LENGTH.short, LENGTH.short, 0, -6);
    addRoad(LENGTH.short, LENGTH.short, LENGTH.short, -2, 8);
    addRoad(LENGTH.short, LENGTH.short, LENGTH.short, 0, -8);
  }

  // --- circuit layout (original design) ---
  addStraight(LENGTH.medium);
  addLowRollingHills();
  addSCurves();
  addCurve(LENGTH.long, 4, 15);      // long right sweeper uphill
  addStraight(LENGTH.medium);
  addHill(LENGTH.medium, 30);
  addCurve(LENGTH.long, -5, -25);    // fast left downhill
  addBumps();
  addCurve(LENGTH.medium, 2, 0);
  addCurve(LENGTH.medium, -2, 0);
  addStraight(LENGTH.long);          // start/finish straight
  addCurve(LENGTH.medium, 3, 10);
  addLowRollingHills();
  addCurve(LENGTH.long, -4, 0);
  addStraight(LENGTH.medium);

  // --- roadside decoration: trees, signs, billboards ---
  const rand = (() => { let s = 1234567; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (i % 9 === 0) {
      seg.sprites.push({ type: 'tree', offset: (rand() > 0.5 ? 1 : -1) * (1.6 + rand() * 2.2), variant: Math.floor(rand() * 3) });
    }
    if (i % 47 === 5) {
      seg.sprites.push({ type: 'sign', offset: (rand() > 0.5 ? 1 : -1) * 1.35, dir: seg.curve > 0.5 ? 1 : seg.curve < -0.5 ? -1 : 0 });
    }
    if (i % 130 === 20) {
      seg.sprites.push({ type: 'billboard', offset: (rand() > 0.5 ? 1 : -1) * 2.6 });
    }
    if (i % 11 === 3 && rand() > 0.6) {
      seg.sprites.push({ type: 'tree', offset: (rand() > 0.5 ? 1 : -1) * (3 + rand() * 3), variant: Math.floor(rand() * 3) });
    }
  }
  // start/finish gantry on segment 10
  segments[10].sprites.push({ type: 'gantry', offset: 0 });

  return { segments, trackLength: segments.length * SEGMENT_LENGTH };
}
