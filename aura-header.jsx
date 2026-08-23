// Looping AK Pixels aura banner — same composition as the animation piece,
// driven by rAF instead of the video engine so it can live in a page header.
// Optionally audio-reactive: pass audioSrc and the ribbons follow amplitude
// (energy) and pitch (colour), the way a voice assistant's waveform does.
const W = 1300, H = 440, CX = W / 2, CY = H / 2, S = 0.40;

const PALETTE = { blue: '#2f6bff', magenta: '#ff2fd0', cyan: '#5ceaff', purple: '#7a2cff' };
const ACCENT_LOW = '#1d3a4a';
const ACCENT_HIGH = '#8b5cf6';

const INTRO = {};   // audioSrc -> { el, ctx, ana, freq, time, api }

function makeIntro(src) {
  if (INTRO[src]) return INTRO[src];
  const el = new Audio(src);
  el.preload = 'auto';
  el.crossOrigin = 'anonymous';
  const node = { el, ctx: null, ana: null, freq: null, time: null };
  let listeners = [];
  const emit = (p) => listeners.forEach((f) => f(p));

  const connect = () => {
    if (node.ana) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const ana = ctx.createAnalyser();
    ana.fftSize = 1024;
    ana.smoothingTimeConstant = 0.72;
    ctx.createMediaElementSource(el).connect(ana);
    ana.connect(ctx.destination);
    Object.assign(node, { ctx, ana, freq: new Uint8Array(ana.frequencyBinCount), time: new Uint8Array(ana.fftSize) });
  };

  const api = {
    play: () => { connect(); if (node.ctx && node.ctx.state === 'suspended') node.ctx.resume(); return el.play().catch(() => {}); },
    pause: () => el.pause(),
    toggle: () => (el.paused ? api.play() : api.pause()),
    stop: () => { el.pause(); el.currentTime = 0; },
    isPlaying: () => !el.paused,
    subscribe: (f) => { listeners.push(f); f(!el.paused); return () => { listeners = listeners.filter((x) => x !== f); }; }
  };
  node.api = api;
  window.__akIntro = api;

  // Autoplay: try as soon as it buffers; if the browser refuses unmuted audio
  // without a gesture, start on the visitor's first interaction instead.
  let armed = null;
  const keys = ['pointerdown', 'keydown', 'touchstart', 'wheel'];
  const disarm = () => { if (armed) { keys.forEach((e) => window.removeEventListener(e, armed)); armed = null; } };
  const arm = () => {
    if (armed) return;
    armed = () => { api.play(); disarm(); };
    keys.forEach((e) => window.addEventListener(e, armed, { once: true, passive: true }));
  };
  const tryAutoplay = () => {
    connect();
    const p = el.play();
    if (p && p.catch) p.catch(arm); else if (el.paused) arm();
  };
  if (el.readyState >= 2) tryAutoplay();
  else el.addEventListener('canplay', tryAutoplay, { once: true });

  el.addEventListener('play', () => { disarm(); emit(true); });
  el.addEventListener('pause', () => emit(false));
  el.addEventListener('ended', () => emit(false));

  INTRO[src] = node;
  return node;
}

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const v = A.map((x, i) => Math.round(x + (B[i] - x) * t));
  return 'rgb(' + v[0] + ',' + v[1] + ',' + v[2] + ')';
}

const RIBBONS = [
  { r: 292, amp: 26, k1: 3, k2: 5, spin: 1,  tilt: 0.62, w: 7,   grad: 'hA', drift: 1 },
  { r: 318, amp: 34, k1: 2, k2: 4, spin: -1, tilt: 0.66, w: 5,   grad: 'hB', drift: -1 },
  { r: 268, amp: 20, k1: 4, k2: 6, spin: 1,  tilt: 0.70, w: 4,   grad: 'hC', drift: 2 },
  { r: 344, amp: 44, k1: 2, k2: 3, spin: -1, tilt: 0.58, w: 3,   grad: 'hD', drift: -2 },
  { r: 246, amp: 16, k1: 5, k2: 7, spin: 1,  tilt: 0.66, w: 2.5, grad: 'hB', drift: 1 },
];

function ribbonPath(R, amp, phase, k1, k2, tilt, steps) {
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r = R + amp * Math.sin(k1 * a + phase) + amp * 0.55 * Math.sin(k2 * a - phase * 1.35 + 1.1);
    d += (i ? 'L' : 'M') + (CX + r * Math.cos(a)).toFixed(1) + ' ' + (CY + r * Math.sin(a) * tilt).toFixed(1);
  }
  return d + 'Z';
}

function AuraHeader({ height = 440, logo = 'uploads/AkpixelsLogo2.png', intensity = 1, sparks = true, audioSrc = null }) {
  const [turn, setTurn] = React.useState(0);
  const [amp, setAmp] = React.useState(0);
  const [pitch, setPitch] = React.useState(0.5);
  const reduced = React.useRef(false);
  const audioRef = React.useRef(null);
  const anaRef = React.useRef(null);
  const smooth = React.useRef({ a: 0, p: 0.5 });
  // auto-calibration so ANY voice-over file maps across the full colour range
  const cal = React.useRef({ lo: null, hi: null, peak: 0.12 });

  React.useEffect(() => {
    if (!audioSrc) return;
    cal.current = { lo: null, hi: null, peak: 0.12 };
    const node = makeIntro(audioSrc);
    audioRef.current = node.el;
    anaRef.current = node;   // survives unmount by design — see makeIntro
  }, [audioSrc]);

  React.useEffect(() => {
    reduced.current = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf, t0 = null;
    const loop = (t) => {
      if (t0 === null) t0 = t;
      if (!reduced.current) setTurn(((t - t0) / 22000) % 1);

      const A = anaRef.current;
      if (A && A.ana && audioRef.current && !audioRef.current.paused) {
        A.ana.getByteTimeDomainData(A.time);
        let sum = 0;
        for (let i = 0; i < A.time.length; i++) { const v = (A.time[i] - 128) / 128; sum += v * v; }
        const rms = Math.min(1, Math.sqrt(sum / A.time.length) * 3.4);

        A.ana.getByteFrequencyData(A.freq);
        let num = 0, den = 0;
        for (let i = 1; i < A.freq.length; i++) { num += i * A.freq[i]; den += A.freq[i]; }
        const binHz = A.ctx.sampleRate / 2 / A.freq.length;
        const cHz = den > 0 ? (num / den) * binHz : 260;
        const C = cal.current;
        let p = 0.5, aN = 0;
        if (rms > 0.035) {                       // only learn from actual voice, not silence
          const l = Math.log(Math.max(cHz, 60));
          if (C.lo === null) { C.lo = l - 0.25; C.hi = l + 0.25; }
          if (l < C.lo) C.lo += (l - C.lo) * 0.35; else C.lo += 0.0008;   // expand fast, relax slowly
          if (l > C.hi) C.hi += (l - C.hi) * 0.35; else C.hi -= 0.0008;
          if (C.hi - C.lo < 0.45) { const m = (C.hi + C.lo) / 2; C.lo = m - 0.225; C.hi = m + 0.225; }
          p = (l - C.lo) / (C.hi - C.lo);
          C.peak = Math.max(rms, C.peak * 0.9995);
          aN = rms / Math.max(C.peak, 0.08);
        }
        p = Math.max(0, Math.min(1, p));

        smooth.current.a += (Math.min(1, aN) - smooth.current.a) * 0.22;
        smooth.current.p += (p - smooth.current.p) * 0.12;
      } else {
        smooth.current.a += (0 - smooth.current.a) * 0.06;
        smooth.current.p += (0.5 - smooth.current.p) * 0.05;
      }
      setAmp(smooth.current.a);
      setPitch(smooth.current.p);
      raf = requestAnimationFrame(loop);
    };
    if (reduced.current) setTurn(0.4);
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const a = turn * Math.PI * 2;
  const boost = 1 + amp * 1.15;
  const energy = (1.05 + 0.35 * Math.sin(a)) * intensity * boost;
  const spread = (0.98 + 0.07 * Math.sin(a * 2 + 0.6)) * (1 + amp * 0.1);
  const glow = (0.9 + 0.22 * Math.sin(a + 1.2)) * intensity * (1 + amp * 0.55);
  const logoScale = 1 + 0.02 * Math.sin(a * 2) + amp * 0.075;

  // pitch shifts the whole palette: low → deep teal, high → violet
  const shift = Math.abs(pitch - 0.5) * 2 * (0.3 + amp * 0.55);
  const target = pitch < 0.5 ? ACCENT_LOW : ACCENT_HIGH;
  const P = {
    blue: mixHex(PALETTE.blue, target, shift),
    magenta: mixHex(PALETTE.magenta, target, shift),
    cyan: mixHex(PALETTE.cyan, target, shift),
    purple: mixHex(PALETTE.purple, target, shift)
  };

  const dots = [];
  if (sparks) {
    for (let i = 0; i < 22; i++) {
      const seed = i * 2.399963;
      const dir = i % 2 ? 1 : -1;
      const ang = seed + a * (2 + (i % 3)) * dir;
      const R = ((250 + ((i * 37) % 130)) * spread * S) + Math.sin(a * 3 + seed) * 8 * energy;
      dots.push(
        <circle key={i} cx={CX + R * Math.cos(ang)} cy={CY + R * Math.sin(ang) * 0.66}
          r={(1.6 + ((i * 13) % 5) * 0.7) * 0.8 * (1 + amp * 0.5)}
          fill={[P.cyan, P.magenta, P.blue, P.purple][i % 4]}
          opacity={(0.3 + 0.45 * (0.5 + 0.5 * Math.sin(a * 4 + seed))) * energy} filter="url(#hTight)" />
      );
    }
  }

  const grads = [
    ['hA', P.cyan, P.blue, P.magenta, 0, 0, 1, 1],
    ['hB', P.magenta, P.purple, P.cyan, 1, 0, 0, 1],
    ['hC', P.purple, P.blue, P.cyan, 0, 1, 1, 0],
    ['hD', P.blue, P.magenta, P.purple, 0, 0, 1, 0],
  ];

  return (
    <div style={{ position: 'relative', width: '100%', height: height, overflow: 'visible', background: 'transparent',
      maskImage: 'radial-gradient(closest-side, #000 55%, transparent 100%)',
      WebkitMaskImage: 'radial-gradient(closest-side, #000 55%, transparent 100%)' }}>
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: H * 1.9, height: H * 1.9,
        marginLeft: -(H * 1.9) / 2, marginTop: -(H * 1.9) / 2, borderRadius: '50%',
        transform: `rotate(${turn * 360}deg)`,
        background: `conic-gradient(from 0deg, ${P.blue}, ${P.magenta}, ${P.purple}, ${P.cyan}, ${P.blue})`,
        filter: 'blur(90px)', opacity: 0.22 * glow }} />

      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', mixBlendMode: 'screen' }}>
        <defs>
          {grads.map(([id, c1, c2, c3, x1, y1, x2, y2]) => (
            <linearGradient key={id} id={id} x1={x1} y1={y1} x2={x2} y2={y2}>
              <stop offset="0%" stopColor={c1} />
              <stop offset="50%" stopColor={c2} />
              <stop offset="100%" stopColor={c3} />
            </linearGradient>
          ))}
          <filter id="hSoft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="18" /></filter>
          <filter id="hTight" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.2" /></filter>
        </defs>
        {RIBBONS.map((rb, i) => {
          const phase = a * (2 * rb.drift) + i * 1.7;
          const d = ribbonPath(rb.r * spread * S, rb.amp * energy * S, phase, rb.k1, rb.k2, rb.tilt, 160);
          const rot = (a * rb.spin * 180) / Math.PI * 0.5;
          return (
            <g key={i} transform={`rotate(${rot} ${CX} ${CY})`}>
              <path d={d} fill="none" stroke={`url(#${rb.grad})`} strokeWidth={rb.w * 4 * (1 + amp * 0.35)} strokeLinecap="round" filter="url(#hSoft)" opacity={0.45 * glow} />
              <path d={d} fill="none" stroke={`url(#${rb.grad})`} strokeWidth={rb.w * 0.8} strokeLinecap="round" filter="url(#hTight)" opacity={0.95 * glow} />
            </g>
          );
        })}
        {dots}
      </svg>

      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 210, height: 210,
        marginLeft: -105, marginTop: -105, transform: `scale(${logoScale})` }}>
        <div style={{ position: 'absolute', inset: -30, borderRadius: '50%',
          background: `radial-gradient(circle, ${P.cyan}44 0%, transparent 70%)`, filter: 'blur(26px)', opacity: 0.9 * glow }} />
        <img src={logo} alt="AK Pixels" width={210} height={210}
          style={{ position: 'relative', display: 'block', width: 210, height: 210, objectFit: 'contain',
            filter: `drop-shadow(0 0 ${16 * glow}px rgba(92,234,255,${0.5 * glow})) drop-shadow(0 0 ${44 * glow}px rgba(139,92,246,${0.35 * glow}))` }} />
      </div>
    </div>
  );
}

window.AuraHeader = AuraHeader;
module.exports = { AuraHeader };
