import { useEffect, useRef, useState, useCallback } from 'react';
import { Game } from './game/engine.js';

const isTouchDevice = () =>
  typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

const DEFAULT_HUD = {
  mode: 'title', speedKmh: 0, lap: 1, totalLaps: 3, pos: 8, cars: 8,
  time: '0:00.0', countdown: 3, go: false, lapTimes: [], bestLap: '--:--.-',
  finalPos: null, muted: false,
};

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function TouchButton({ label, sub, onChange, className }) {
  const set = (on) => (e) => { e.preventDefault(); onChange(on); };
  return (
    <button
      className={`touch-btn ${className || ''}`}
      onPointerDown={set(true)}
      onPointerUp={set(false)}
      onPointerLeave={set(false)}
      onPointerCancel={set(false)}
      onContextMenu={(e) => e.preventDefault()}
      touch-action="none"
    >
      <span className="touch-label">{label}</span>
      {sub && <span className="touch-sub">{sub}</span>}
    </button>
  );
}

export default function App() {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const [hud, setHud] = useState(DEFAULT_HUD);
  const [touch] = useState(isTouchDevice);
  const [portrait, setPortrait] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(orientation: portrait)').matches);

  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const onChange = (e) => setPortrait(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const game = new Game(canvasRef.current, (h) => setHud(h));
    gameRef.current = game;
    return () => game.destroy();
  }, []);

  const start = useCallback(() => gameRef.current?.startCountdown(), []);
  const restart = useCallback(() => gameRef.current?.restart(), []);
  const toggleMute = useCallback(() => {
    const g = gameRef.current;
    if (g) setHud((h) => ({ ...h, muted: g.toggleMute() }));
  }, []);
  const touchInput = useCallback((name) => (on) => gameRef.current?.setTouch(name, on), []);

  const racing = hud.mode === 'racing' || hud.mode === 'countdown';

  return (
    <div className="cabinet">
      <div className="screen-wrap">
        <canvas ref={canvasRef} className="game-canvas" />
        <div className="scanlines" />

        {/* HUD */}
        {(hud.mode === 'racing' || hud.mode === 'countdown' || hud.mode === 'finished') && (
          <div className="hud">
            <div className="hud-box"><span className="hud-tag">SPEED</span><span className="hud-val">{hud.speedKmh}</span><span className="hud-unit">km/h</span></div>
            <div className="hud-box"><span className="hud-tag">LAP</span><span className="hud-val">{hud.lap}<span className="hud-dim">/{hud.totalLaps}</span></span></div>
            <div className="hud-box pos"><span className="hud-tag">POS</span><span className="hud-val">{hud.pos}<span className="hud-dim">/{hud.cars}</span></span></div>
            <div className="hud-box"><span className="hud-tag">TIME</span><span className="hud-val time">{hud.time}</span></div>
          </div>
        )}

        <button className="mute-btn" onClick={toggleMute} aria-label="mute">
          {hud.muted ? '🔇' : '🔊'}
        </button>

        {touch && portrait && (
          <div className="rotate-hint">⟳ ROTATE FOR FULL SCREEN</div>
        )}

        {/* countdown */}
        {hud.mode === 'countdown' && (
          <div className="overlay center">
            <div className="countdown">{hud.countdown > 0 ? hud.countdown : 'GO!'}</div>
          </div>
        )}
        {hud.go && hud.mode === 'racing' && (
          <div className="overlay center pointer-none"><div className="countdown go">GO!</div></div>
        )}

        {/* title */}
        {hud.mode === 'title' && (
          <div className="overlay center">
            <div className="title-logo">
              <div className="logo-top">POLE</div>
              <div className="logo-bottom">RUSH</div>
            </div>
            <div className="tagline">★ 3 LAPS • 8 RACERS • ARCADE GP ★</div>
            <button className="arcade-btn" onClick={start}>▶ START RACE</button>
            <div className="controls-hint">
              {touch ? 'Use the on-screen pedals & steering' : '← → steer • ↑ gas • ↓ brake • M mute'}
            </div>
          </div>
        )}

        {/* results */}
        {hud.mode === 'finished' && (
          <div className="overlay center">
            <div className="results-card">
              <div className="results-title">🏁 RACE FINISHED</div>
              <div className="results-pos">{ordinal(hud.finalPos || hud.pos)} <span>PLACE</span></div>
              <div className="results-row head"><span>LAP</span><span>TIME</span></div>
              {hud.lapTimes.map((t, i) => (
                <div className="results-row" key={i}><span>Lap {i + 1}</span><span>{t}</span></div>
              ))}
              <div className="results-row best"><span>BEST</span><span>{hud.bestLap}</span></div>
              <div className="results-row total"><span>TOTAL</span><span>{hud.time}</span></div>
              <button className="arcade-btn" onClick={restart}>↻ RACE AGAIN</button>
            </div>
          </div>
        )}

        {/* touch controls */}
        {touch && racing && (
          <>
            <div className="touch-cluster left">
              <TouchButton label="◀" onChange={touchInput('left')} />
              <TouchButton label="▶" onChange={touchInput('right')} />
            </div>
            <div className="touch-cluster right">
              <TouchButton label="BRAKE" className="brake" onChange={touchInput('down')} />
              <TouchButton label="GAS" className="gas" onChange={touchInput('up')} />
            </div>
          </>
        )}
      </div>
      <div className="cabinet-footer">POLE RUSH © 2026 — INSERT COIN</div>
    </div>
  );
}
