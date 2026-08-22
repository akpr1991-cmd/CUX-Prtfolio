// Fluid neon ribbon aura, extracted from the AK Pixels Aura composition and
// re-timed to a self-contained looping clock so it can sit inside a static page.
const S = 760, C = S / 2, LOOP = 11; // seconds per cycle

const PALETTES = {
  "Siri spectrum": { blue: '#2f6bff', magenta: '#ff2fd0', cyan: '#5ceaff', purple: '#7a2cff' },
  "Electric ice":  { blue: '#2f8bff', magenta: '#7ef0ff', cyan: '#bfe8ff', purple: '#4a6bff' },
  "Magenta dusk":  { blue: '#7a2cff', magenta: '#ff2f8c', cyan: '#ff8f5c', purple: '#b400c8' },
  "Brand lime":    { blue: '#14785a', magenta: '#acd03d', cyan: '#e6ff78', purple: '#00dcb4' },
};

const RIBBONS = [
  { r: 292, amp: 26, k1: 3, k2: 5, spin: 1,  tilt: 0.94, w: 7,   grad: 'gA', drift: 1 },
  { r: 318, amp: 34, k1: 2, k2: 4, spin: -1, tilt: 1.0,  w: 5,   grad: 'gB', drift: -1 },
  { r: 268, amp: 20, k1: 4, k2: 6, spin: 1,  tilt: 1.04, w: 4,   grad: 'gC', drift: 2 },
  { r: 344, amp: 44, k1: 2, k2: 3, spin: -1, tilt: 0.9,  w: 3,   grad: 'gD', drift: -2 },
  { r: 246, amp: 16, k1: 5, k2: 7, spin: 1,  tilt: 1.0,  w: 2.5, grad: 'gB', drift: 1 },
];

const K = 0.62; // radius scale: original 1920 canvas -> this 760 box

function ribbonPath(R, amp, phase, k1, k2, tilt, steps) {
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r = R + amp * Math.sin(k1 * a + phase) + amp * 0.55 * Math.sin(k2 * a - phase * 1.35 + 1.1);
    d += (i ? 'L' : 'M') + (C + r * Math.cos(a)).toFixed(1) + ' ' + (C + r * Math.sin(a) * tilt).toFixed(1);
  }
  return d + 'Z';
}

function AuraCore({ intensity = 0.7, sparks = true, palette = 'Siri spectrum', uid = 'ac' }) {
  const P = PALETTES[palette] || PALETTES['Siri spectrum'];
  const [t, setT] = React.useState(0);

  React.useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf, t0 = performance.now();
    const tick = (now) => { setT(((now - t0) / 1000) % LOOP); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const turn = (t / LOOP) * Math.PI * 2;
  // breathing energy/spread/glow envelope — seamless across the loop seam
  const wave = 0.5 + 0.5 * Math.sin(turn - Math.PI / 2);
  const energy = (0.62 + 0.75 * wave) * intensity;
  const spread = 0.94 + 0.12 * wave;
  const glow = (0.78 + 0.38 * wave) * intensity;
  const g = (n) => `${uid}-${n}`;

  const dots = [];
  if (sparks) {
    for (let i = 0; i < 26; i++) {
      const seed = i * 2.399963;
      const dir = i % 2 ? 1 : -1;
      const a = seed + turn * (2 + (i % 3)) * dir;
      const R = ((250 + ((i * 37) % 130)) * spread + Math.sin(turn * 3 + seed) * 14 * energy) * K;
      const col = [P.cyan, P.magenta, P.blue, P.purple][i % 4];
      dots.push(React.createElement('circle', {
        key: i, cx: C + R * Math.cos(a), cy: C + R * Math.sin(a) * 0.98,
        r: (1.6 + ((i * 13) % 5) * 0.7) * 0.8, fill: col,
        opacity: (0.3 + 0.45 * (0.5 + 0.5 * Math.sin(turn * 4 + seed))) * energy,
        filter: `url(#${g('tight')})`,
      }));
    }
  }

  const grad = (id, x1, y1, x2, y2, stops) => React.createElement('linearGradient',
    { id: g(id), x1, y1, x2, y2 },
    stops.map(([o, c2], i) => React.createElement('stop', { key: i, offset: o, stopColor: c2 })));

  return React.createElement('div', { style: { position: 'absolute', inset: 0, pointerEvents: 'none' } },
    React.createElement('div', { style: {
      position: 'absolute', left: '50%', top: '50%', width: 940 * K * 2, height: 940 * K * 2,
      marginLeft: -940 * K, marginTop: -940 * K, borderRadius: '50%',
      transform: `rotate(${(t / LOOP) * 360}deg)`,
      background: `conic-gradient(from 0deg, ${P.blue}, ${P.magenta}, ${P.purple}, ${P.cyan}, ${P.blue})`,
      filter: 'blur(110px)', opacity: 0.3 * glow,
    } }),
    React.createElement('svg', {
      width: S, height: S, viewBox: `0 0 ${S} ${S}`,
      style: { position: 'absolute', left: '50%', top: '50%', marginLeft: -C, marginTop: -C, mixBlendMode: 'screen' },
    },
      React.createElement('defs', null,
        grad('gA', '0', '0', '1', '1', [['0%', P.cyan], ['45%', P.blue], ['100%', P.magenta]]),
        grad('gB', '1', '0', '0', '1', [['0%', P.magenta], ['55%', P.purple], ['100%', P.cyan]]),
        grad('gC', '0', '1', '1', '0', [['0%', P.purple], ['50%', P.blue], ['100%', P.cyan]]),
        grad('gD', '0', '0', '1', '0', [['0%', P.blue], ['50%', P.magenta], ['100%', P.purple]]),
        React.createElement('filter', { id: g('soft'), x: '-40%', y: '-40%', width: '180%', height: '180%' },
          React.createElement('feGaussianBlur', { stdDeviation: 18 })),
        React.createElement('filter', { id: g('tight'), x: '-40%', y: '-40%', width: '180%', height: '180%' },
          React.createElement('feGaussianBlur', { stdDeviation: 2.2 }))
      ),
      React.createElement('g', null, RIBBONS.map((rb, i) => {
        const phase = turn * (2 * rb.drift) + i * 1.7;
        const d = ribbonPath(rb.r * spread * K, rb.amp * energy * K, phase, rb.k1, rb.k2, rb.tilt, 200);
        const rot = ((turn * rb.spin * 180) / Math.PI) * 0.5;
        return React.createElement('g', { key: i, transform: `rotate(${rot} ${C} ${C})` },
          React.createElement('path', { d, fill: 'none', stroke: `url(#${g(rb.grad)})`,
            strokeWidth: rb.w * 5.5 * K, strokeLinecap: 'round', filter: `url(#${g('soft')})`, opacity: 0.5 * glow }),
          React.createElement('path', { d, fill: 'none', stroke: `url(#${g(rb.grad)})`,
            strokeWidth: rb.w * K, strokeLinecap: 'round', filter: `url(#${g('tight')})`, opacity: 0.95 * glow })
        );
      })),
      React.createElement('g', null, dots)
    )
  );
}

window.AuraCore = AuraCore;
if (typeof module !== 'undefined') module.exports = { AuraCore };
