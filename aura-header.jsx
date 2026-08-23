// Looping AK Pixels aura banner — same composition as the animation piece,
// driven by rAF instead of the video engine so it can live in a page header.
const W = 1300, H = 440, CX = W / 2, CY = H / 2, S = 0.40;

const PALETTE = { blue: '#2f6bff', magenta: '#ff2fd0', cyan: '#5ceaff', purple: '#7a2cff' };

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

function AuraHeader({ height = 440, logo = 'uploads/AkpixelsLogo2.png', intensity = 1, sparks = true }) {
  const [turn, setTurn] = React.useState(0);
  const reduced = React.useRef(false);

  React.useEffect(() => {
    reduced.current = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced.current) { setTurn(0.4); return; }
    let raf, t0 = null;
    const loop = (t) => {
      if (t0 === null) t0 = t;
      setTurn(((t - t0) / 22000) % 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const a = turn * Math.PI * 2;
  const energy = (1.05 + 0.35 * Math.sin(a)) * intensity;
  const spread = 0.98 + 0.07 * Math.sin(a * 2 + 0.6);
  const glow = (0.9 + 0.22 * Math.sin(a + 1.2)) * intensity;
  const logoScale = 1 + 0.02 * Math.sin(a * 2);

  const dots = [];
  if (sparks) {
    for (let i = 0; i < 22; i++) {
      const seed = i * 2.399963;
      const dir = i % 2 ? 1 : -1;
      const ang = seed + a * (2 + (i % 3)) * dir;
      const R = ((250 + ((i * 37) % 130)) * spread * S) + Math.sin(a * 3 + seed) * 8 * energy;
      dots.push(
        <circle key={i} cx={CX + R * Math.cos(ang)} cy={CY + R * Math.sin(ang) * 0.66}
          r={(1.6 + ((i * 13) % 5) * 0.7) * 0.8}
          fill={[PALETTE.cyan, PALETTE.magenta, PALETTE.blue, PALETTE.purple][i % 4]}
          opacity={(0.3 + 0.45 * (0.5 + 0.5 * Math.sin(a * 4 + seed))) * energy} filter="url(#hTight)" />
      );
    }
  }

  const grads = [
    ['hA', PALETTE.cyan, PALETTE.blue, PALETTE.magenta, 0, 0, 1, 1],
    ['hB', PALETTE.magenta, PALETTE.purple, PALETTE.cyan, 1, 0, 0, 1],
    ['hC', PALETTE.purple, PALETTE.blue, PALETTE.cyan, 0, 1, 1, 0],
    ['hD', PALETTE.blue, PALETTE.magenta, PALETTE.purple, 0, 0, 1, 0],
  ];

  return (
    <div style={{ position: 'relative', width: '100%', height: height, overflow: 'visible', background: 'transparent',
      maskImage: 'radial-gradient(closest-side, #000 55%, transparent 100%)',
      WebkitMaskImage: 'radial-gradient(closest-side, #000 55%, transparent 100%)' }}>
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: H * 1.9, height: H * 1.9,
        marginLeft: -(H * 1.9) / 2, marginTop: -(H * 1.9) / 2, borderRadius: '50%',
        transform: `rotate(${turn * 360}deg)`,
        background: `conic-gradient(from 0deg, ${PALETTE.blue}, ${PALETTE.magenta}, ${PALETTE.purple}, ${PALETTE.cyan}, ${PALETTE.blue})`,
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
              <path d={d} fill="none" stroke={`url(#${rb.grad})`} strokeWidth={rb.w * 4} strokeLinecap="round" filter="url(#hSoft)" opacity={0.45 * glow} />
              <path d={d} fill="none" stroke={`url(#${rb.grad})`} strokeWidth={rb.w * 0.8} strokeLinecap="round" filter="url(#hTight)" opacity={0.95 * glow} />
            </g>
          );
        })}
        {dots}
      </svg>

      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 210, height: 210,
        marginLeft: -105, marginTop: -105, transform: `scale(${logoScale})` }}>
        <div style={{ position: 'absolute', inset: -30, borderRadius: '50%',
          background: `radial-gradient(circle, ${PALETTE.cyan}44 0%, transparent 70%)`, filter: 'blur(26px)', opacity: 0.9 * glow }} />
        <img src={logo} alt="AK Pixels" width={210} height={210}
          style={{ position: 'relative', display: 'block', width: 210, height: 210, objectFit: 'contain',
            filter: `drop-shadow(0 0 ${16 * glow}px rgba(92,234,255,${0.5 * glow})) drop-shadow(0 0 ${44 * glow}px rgba(122,44,255,${0.35 * glow}))` }} />
      </div>
    </div>
  );
}

window.AuraHeader = AuraHeader;
module.exports = { AuraHeader };
