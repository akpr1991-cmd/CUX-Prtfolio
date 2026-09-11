import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const ACCENT = 0x9184d9;
const P1_COL = 0x9184d9;
const P2_COL = 0x6fc6cf;
const LANES = [7.2, 9.4, 11.6];
const MATCH_TIME = 90;
const TAU = Math.PI * 2;

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.18, 'rgba(255,255,255,0.75)');
  grd.addColorStop(0.5, 'rgba(255,255,255,0.18)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function noise(x, y, z) {
  return Math.sin(x * 3.1 + 1.3) * Math.sin(y * 3.7) * Math.sin(z * 2.9 + 0.7) * 0.6
    + Math.sin(x * 7.3) * Math.sin(y * 6.1 + 2.2) * Math.sin(z * 8.0) * 0.3
    + Math.sin(x * 14.0 + 0.5) * Math.sin(y * 12.5) * Math.sin(z * 13.1) * 0.12;
}

/* ---------- audio ---------- */
class Sfx {
  constructor() { this.ctx = null; this.on = true; }
  ready() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }
  tone({ f = 440, f2 = null, t = 0.12, type = 'sine', g = 0.12, delay = 0 }) {
    const ctx = this.ready(); if (!ctx || !this.on) return;
    const o = ctx.createOscillator(), gn = ctx.createGain();
    const now = ctx.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(f, now);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), now + t);
    gn.gain.setValueAtTime(0, now);
    gn.gain.linearRampToValueAtTime(g, now + 0.01);
    gn.gain.exponentialRampToValueAtTime(0.0001, now + t);
    o.connect(gn).connect(ctx.destination);
    o.start(now); o.stop(now + t + 0.02);
  }
  noise({ t = 0.25, g = 0.2, f = 900 }) {
    const ctx = this.ready(); if (!ctx || !this.on) return;
    const len = Math.floor(ctx.sampleRate * t);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = f;
    const gn = ctx.createGain(); gn.gain.value = g;
    src.connect(flt).connect(gn).connect(ctx.destination);
    src.start();
  }
  hop() { this.tone({ f: 520, f2: 880, t: 0.08, type: 'triangle', g: 0.07 }); }
  fire(p) { this.tone({ f: 220 + p * 260, f2: 90, t: 0.18, type: 'sawtooth', g: 0.07 }); }
  hit() { this.noise({ t: 0.35, g: 0.22, f: 1400 }); this.tone({ f: 140, f2: 40, t: 0.3, type: 'square', g: 0.08 }); }
  block() { this.tone({ f: 900, f2: 1400, t: 0.14, type: 'sine', g: 0.09 }); }
  shield() { this.tone({ f: 300, f2: 700, t: 0.3, type: 'sine', g: 0.08 }); }
  pick() { [660, 880, 1180].forEach((f, i) => this.tone({ f, t: 0.1, type: 'triangle', g: 0.07, delay: i * 0.06 })); }
  beep(h) { this.tone({ f: h ? 880 : 520, t: 0.12, type: 'square', g: 0.06 }); }
}

/* ---------- element ---------- */
class DuelStage extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;
    this.style.cssText = 'position:absolute;inset:0;display:block;overflow:hidden';
    this.sfx = new Sfx();
    this.phase = 'idle';
    this.mode = 'two';
    this.shake = 0;
    this.time = MATCH_TIME;
    this.countdown = 0;
    this.build();
    this.resetMatch();
    this.bindKeys();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this);
    this.clock = new THREE.Clock();
    this.tick = this.tick.bind(this);
    this.frame = 0;
    requestAnimationFrame(this.tick);
  }

  /* --- scene --- */
  build() {
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    r.setClearColor(0x0f1120, 1);
    r.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    this.appendChild(r.domElement);

    const s = this.scene = new THREE.Scene();
    const cam = this.camera = new THREE.PerspectiveCamera(46, 16 / 9, 0.1, 400);
    cam.position.set(0, 15.5, 19);
    cam.lookAt(0, 0, 0);
    this.camBase = cam.position.clone();

    s.add(new THREE.AmbientLight(0x2a2c44, 0.9));
    const d1 = new THREE.DirectionalLight(0xd6d2f7, 2.3); d1.position.set(-9, 10, 8); s.add(d1);
    const d2 = new THREE.DirectionalLight(0x6f86c4, 0.9); d2.position.set(10, -2, -9); s.add(d2);
    const core = new THREE.PointLight(ACCENT, 3.2, 26, 2); core.position.set(0, 0, 0); s.add(core);

    this.glowTex = glowTexture();

    // stars
    const N = 2600, pos = new Float32Array(N * 3), sz = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(80 + Math.random() * 120);
      pos.set([v.x, v.y, v.z], i * 3);
      sz[i] = Math.random() < 0.08 ? 1.9 : 0.55 + Math.random() * 0.7;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sg.setAttribute('asize', new THREE.BufferAttribute(sz, 1));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({
      size: 1.1, map: this.glowTex, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, color: 0xcfd2ea, sizeAttenuation: true, opacity: 0.85
    }));
    s.add(this.stars);

    // planet
    const pg = new THREE.SphereGeometry(4.3, 128, 128);
    const p = pg.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const l = Math.hypot(x, y, z), n = noise(x / l, y / l, z / l);
      const k = (l + n * 0.34) / l;
      p.setXYZ(i, x * k, y * k, z * k);
    }
    pg.computeVertexNormals();
    this.planet = new THREE.Mesh(pg, new THREE.MeshStandardMaterial({
      color: 0x454a72, roughness: 0.92, metalness: 0.06, emissive: 0x1e2138, emissiveIntensity: 1, flatShading: true
    }));
    s.add(this.planet);

    const atmoMat = new THREE.ShaderMaterial({
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide,
      uniforms: { uColor: { value: new THREE.Color(ACCENT) } },
      vertexShader: `varying vec3 vN; varying vec3 vP;
        void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vP = mv.xyz; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform vec3 uColor; varying vec3 vN; varying vec3 vP;
        void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(-vP))), 3.2);
        gl_FragColor = vec4(uColor, 1.0) * f * 1.25; }`
    });
    s.add(new THREE.Mesh(new THREE.SphereGeometry(4.95, 64, 64), atmoMat));

    // lanes
    this.laneRings = LANES.map((rad, i) => {
      const m = new THREE.Mesh(
        new THREE.TorusGeometry(rad, 0.016, 3, 240),
        new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.16 + i * 0.02, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      m.rotation.x = Math.PI / 2; s.add(m); return m;
    });

    // dust ring
    const DN = 1400, dp = new Float32Array(DN * 3);
    this.dustAng = new Float32Array(DN); this.dustRad = new Float32Array(DN);
    for (let i = 0; i < DN; i++) {
      this.dustAng[i] = Math.random() * TAU;
      this.dustRad[i] = 6.4 + Math.random() * 6.2;
      dp[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({
      size: 0.14, map: this.glowTex, color: 0x8e87c8, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    s.add(this.dust);

    this.ships = [this.makeShip(P1_COL), this.makeShip(P2_COL)];

    // particles
    const PN = 600, pp = new Float32Array(PN * 3), pc = new Float32Array(PN * 3);
    this.pVel = new Float32Array(PN * 3); this.pLife = new Float32Array(PN); this.pCur = 0;
    const ppg = new THREE.BufferGeometry();
    ppg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    ppg.setAttribute('color', new THREE.BufferAttribute(pc, 3));
    this.parts = new THREE.Points(ppg, new THREE.PointsMaterial({
      size: 0.3, map: this.glowTex, vertexColors: true, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    s.add(this.parts);

    this.shots = [];
    this.powerups = [];
    this.resize();
  }

  makeShip(color) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 1.5, 4),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.55), emissive: color, emissiveIntensity: 2.4, roughness: 0.3, metalness: 0.5, flatShading: true })
    );
    body.rotation.z = -Math.PI / 2;
    g.add(body);
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.06, 1.05),
      new THREE.MeshStandardMaterial({ color: 0x2c2f4a, emissive: color, emissiveIntensity: 0.35, roughness: 0.5, metalness: 0.4 })
    );
    fin.position.x = -0.45; g.add(fin);

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85 }));
    glow.scale.set(2.6, 2.6, 1); g.add(glow);

    const chargeRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.05, 6, 40),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    chargeRing.rotation.y = Math.PI / 2; g.add(chargeRing);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 28, 28),
      new THREE.MeshBasicMaterial({ color: 0xe9e9ed, transparent: true, opacity: 0, wireframe: true })
    );
    g.add(dome);

    // trail
    const TN = 70, tp = new Float32Array(TN * 3), tc = new Float32Array(TN * 3);
    const col = new THREE.Color(color);
    for (let i = 0; i < TN; i++) { const f = 1 - i / TN; tc.set([col.r * f, col.g * f, col.b * f], i * 3); }
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(tp, 3));
    tg.setAttribute('color', new THREE.BufferAttribute(tc, 3));
    const trail = new THREE.Line(tg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 1 }));
    this.scene.add(trail);

    this.scene.add(g);
    return { group: g, body, glow, chargeRing, dome, trail, trailN: TN, color, colorHex: color };
  }

  /* --- state --- */
  resetMatch() {
    this.time = MATCH_TIME;
    this.shake = 0;
    this.shots.forEach(s => this.scene.remove(s.mesh));
    this.shots = [];
    this.powerups.forEach(p => this.scene.remove(p.mesh));
    this.powerups = [];
    this.puTimer = 5;
    this.players = [0, 1].map(i => ({
      idx: i, score: 0, angle: i === 0 ? 0 : Math.PI, lane: 1, radius: LANES[1],
      dir: 1, speed: 0.62, held: false, heldAt: 0, charge: 0,
      shieldUntil: 0, shieldReady: 0, cool: 0, rapidUntil: 0, speedUntil: 0,
      aiNext: 1.2, flash: 0
    }));
    this.t = 0;
  }

  startMatch(mode) {
    this.mode = mode || 'two';
    this.resetMatch();
    this.phase = 'countdown';
    this.countdown = 3.2;
    this.sfx.ready();
    this._lastBeep = 4;
    this.emit();
  }
  togglePause() {
    if (this.phase === 'playing') this.phase = 'paused';
    else if (this.phase === 'paused') this.phase = 'playing';
    this.emit();
  }
  toIdle() { this.phase = 'idle'; this.resetMatch(); this.emit(); }

  emit() {
    const [a, b] = this.players;
    this.dispatchEvent(new CustomEvent('duelupdate', {
      bubbles: true, detail: {
        phase: this.phase, mode: this.mode, time: Math.max(0, this.time),
        countdown: Math.ceil(this.countdown),
        p: [a, b].map(p => ({
          score: p.score, lane: p.lane, charge: p.charge,
          shield: Math.max(0, p.shieldUntil - this.t),
          shieldCd: Math.max(0, p.shieldReady - this.t),
          rapid: Math.max(0, p.rapidUntil - this.t),
          boost: Math.max(0, p.speedUntil - this.t)
        }))
      }
    }));
  }

  /* --- input --- */
  bindKeys() {
    const keyFor = e => {
      const k = e.key.toLowerCase();
      if (k === 'f' || k === 'a' || k === 'arrowleft') return 0;
      if (k === 'j' || k === 'l' || k === 'arrowright') return 1;
      return -1;
    };
    this._kd = e => {
      const k = e.key.toLowerCase();
      if (k === ' ' || k === 'p') { e.preventDefault(); if (this.phase === 'playing' || this.phase === 'paused') this.togglePause(); return; }
      const i = keyFor(e);
      if (i < 0 || this.phase !== 'playing') return;
      if (this.mode === 'ai' && i === 1) return;
      const p = this.players[i];
      if (p.held) return;
      e.preventDefault();
      p.held = true; p.heldAt = this.t; p.charge = 0;
    };
    this._ku = e => {
      const i = keyFor(e);
      if (i < 0) return;
      if (this.mode === 'ai' && i === 1) return;
      const p = this.players[i];
      if (!p.held) return;
      p.held = false;
      const dur = this.t - p.heldAt;
      if (dur < 0.2) this.hop(p);
      else if (dur > 0.95 && p.shieldReady <= this.t) this.raiseShield(p);
      else this.fire(p, Math.min(1, (dur - 0.2) / 0.7));
      p.charge = 0;
    };
    addEventListener('keydown', this._kd);
    addEventListener('keyup', this._ku);
  }
  disconnectedCallback() {
    removeEventListener('keydown', this._kd);
    removeEventListener('keyup', this._ku);
    if (this.ro) this.ro.disconnect();
    this._stop = true;
  }

  /* --- actions --- */
  hop(p) {
    p.lane = (p.lane + 1) % LANES.length;
    p.bank = 0.55;
    this.sfx.hop();
    this.burst(this.posOf(p.angle, p.radius), p.colorOf || p.idx === 0 ? P1_COL : P2_COL, 8, 0.4);
  }
  fire(p, power) {
    if (p.cool > 0) return;
    p.cool = p.rapidUntil > this.t ? 0.18 : 0.5;
    const pw = p.rapidUntil > this.t ? 0.55 : power;
    const geo = new THREE.SphereGeometry(0.16 + pw * 0.14, 12, 12);
    const col = p.idx === 0 ? P1_COL : P2_COL;
    const mesh = new THREE.Group();
    mesh.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(col).lerp(new THREE.Color(0xffffff), 0.6) })));
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    sp.scale.setScalar(1.6 + pw * 1.2); mesh.add(sp);
    this.scene.add(mesh);
    this.shots.push({ owner: p.idx, lane: p.lane, angle: p.angle + 0.35, speed: 1.5 + pw * 1.5, travel: 0, mesh });
    this.sfx.fire(pw);
  }
  raiseShield(p) {
    p.shieldUntil = this.t + 1.1;
    p.shieldReady = this.t + 5.5;
    this.sfx.shield();
    this.emit();
  }

  posOf(angle, radius, y = 0) { return new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius); }

  burst(v, color, n = 22, spread = 1) {
    const pos = this.parts.geometry.attributes.position, col = this.parts.geometry.attributes.color;
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      const j = this.pCur = (this.pCur + 1) % this.pLife.length;
      pos.setXYZ(j, v.x, v.y, v.z);
      col.setXYZ(j, c.r, c.g, c.b);
      const d = new THREE.Vector3().randomDirection().multiplyScalar((1.5 + Math.random() * 3.5) * spread);
      this.pVel.set([d.x, d.y * 0.6, d.z], j * 3);
      this.pLife[j] = 0.5 + Math.random() * 0.5;
    }
    pos.needsUpdate = true; col.needsUpdate = true;
  }

  spawnPowerup() {
    const types = ['rapid', 'shield', 'boost'];
    const type = types[Math.floor(Math.random() * 3)];
    const col = type === 'rapid' ? 0xd9c184 : type === 'shield' ? 0xe9e9ed : 0x9184d9;
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.1, roughness: 0.3, metalness: 0.7, flatShading: true })));
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 }));
    sp.scale.setScalar(2.2); g.add(sp);
    this.scene.add(g);
    const lane = Math.floor(Math.random() * LANES.length);
    this.powerups.push({ type, lane, angle: Math.random() * TAU, mesh: g, color: col, life: 14 });
  }

  applyPowerup(p, type) {
    if (type === 'rapid') p.rapidUntil = this.t + 6;
    else if (type === 'shield') { p.shieldReady = 0; p.shieldUntil = this.t + 1.6; }
    else p.speedUntil = this.t + 6;
    this.sfx.pick();
    this.emit();
  }

  hitPlayer(target, shooter) {
    if (target.shieldUntil > this.t) {
      this.sfx.block();
      this.burst(this.posOf(target.angle, target.radius), 0xe9e9ed, 26, 1.2);
      this.shake = Math.max(this.shake, 0.25);
      return;
    }
    shooter.score += 1;
    target.flash = 0.45;
    target.lane = (target.lane + 2) % LANES.length;
    this.shake = 0.85;
    this.sfx.hit();
    this.burst(this.posOf(target.angle, target.radius), target.idx === 0 ? P1_COL : P2_COL, 46, 1.8);
    this.burst(this.posOf(target.angle, target.radius), 0xffffff, 18, 2.6);
    this.emit();
  }

  /* --- ai --- */
  ai(p, dt) {
    const foe = this.players[0];
    // dodge incoming
    let danger = false;
    for (const s of this.shots) {
      if (s.owner === p.idx || s.lane !== p.lane) continue;
      let d = ((p.angle - s.angle) % TAU + TAU) % TAU;
      if (d < 1.1) danger = true;
    }
    if (danger && p.cool <= 0) {
      if (p.shieldReady <= this.t && Math.random() < 0.35) this.raiseShield(p);
      else this.hop(p);
      p.aiNext = 0.35;
      return;
    }
    p.aiNext -= dt;
    if (p.aiNext > 0) return;
    // chase powerup
    const pu = this.powerups.find(u => Math.abs(((u.angle - p.angle) % TAU + TAU) % TAU) < 1.4);
    if (pu && pu.lane !== p.lane && Math.random() < 0.6) { this.hop(p); p.aiNext = 0.5; return; }
    // line up a shot
    let d = ((foe.angle - p.angle) % TAU + TAU) % TAU;
    if (foe.lane !== p.lane && Math.random() < 0.55) { this.hop(p); p.aiNext = 0.4 + Math.random() * 0.4; return; }
    if (d < 2.6 && foe.lane === p.lane) { this.fire(p, 0.4 + Math.random() * 0.6); p.aiNext = 0.5 + Math.random() * 0.6; }
    else p.aiNext = 0.25 + Math.random() * 0.3;
  }

  /* --- loop --- */
  tick() {
    if (this._stop) return;
    requestAnimationFrame(this.tick);
    const dt = Math.min(0.05, this.clock.getDelta());
    const playing = this.phase === 'playing';
    this.t += dt;

    if (this.phase === 'countdown') {
      this.countdown -= dt;
      const c = Math.ceil(this.countdown);
      if (c !== this._lastBeep) { this._lastBeep = c; if (c > 0) this.sfx.beep(false); else this.sfx.beep(true); this.emit(); }
      if (this.countdown <= 0) { this.phase = 'playing'; this.emit(); }
    }

    if (playing) {
      this.time -= dt;
      if (this.time <= 0) {
        this.time = 0; this.phase = 'over';
        const [a, b] = this.players;
        this.dispatchEvent(new CustomEvent('duelend', { bubbles: true, detail: { p1: a.score, p2: b.score, mode: this.mode } }));
        this.emit();
      }
      this.puTimer -= dt;
      if (this.puTimer <= 0 && this.powerups.length < 3) { this.spawnPowerup(); this.puTimer = 7 + Math.random() * 5; }
    }

    // players
    this.players.forEach(p => {
      const boost = p.speedUntil > this.t ? 1.38 : 1;
      if (playing || this.phase === 'idle' || this.phase === 'countdown' || this.phase === 'over') {
        p.angle = (p.angle + p.speed * boost * dt * (this.phase === 'idle' ? 0.5 : 1)) % TAU;
      }
      p.radius += (LANES[p.lane] - p.radius) * Math.min(1, dt * 9);
      if (p.cool > 0) p.cool -= dt;
      if (p.flash > 0) p.flash -= dt;
      if (p.bank > 0) p.bank = Math.max(0, p.bank - dt * 1.6);
      if (p.held && playing) p.charge = Math.min(1.25, (this.t - p.heldAt) / 1.0);
      if (playing && this.mode === 'ai' && p.idx === 1) this.ai(p, dt);

      const sh = this.ships[p.idx];
      const pos = this.posOf(p.angle, p.radius);
      sh.group.position.copy(pos);
      sh.group.rotation.set(0, -p.angle + Math.PI / 2, 0);
      sh.body.rotation.x = (p.bank || 0) * 1.2;
      sh.glow.material.opacity = 0.65 + (p.flash > 0 ? 0.9 : 0) + Math.sin(this.t * 6 + p.idx) * 0.06;
      sh.glow.scale.setScalar(2.5 + (p.flash > 0 ? 2.5 * p.flash : 0));
      const ch = p.held ? Math.min(1, (this.t - p.heldAt) / 0.95) : 0;
      const overCharge = p.held && (this.t - p.heldAt) > 0.95 && p.shieldReady <= this.t;
      sh.chargeRing.material.opacity = ch * 0.85;
      sh.chargeRing.material.color.setHex(overCharge ? 0xe9e9ed : sh.colorHex);
      sh.chargeRing.scale.setScalar(0.55 + ch * 0.7);
      const shieldOn = p.shieldUntil > this.t;
      sh.dome.material.opacity += ((shieldOn ? 0.5 : 0) - sh.dome.material.opacity) * Math.min(1, dt * 8);
      sh.dome.rotation.y += dt * 1.6; sh.dome.rotation.x += dt * 0.8;

      // trail
      const a = sh.trail.geometry.attributes.position.array;
      for (let i = a.length - 1; i >= 3; i--) a[i] = a[i - 3];
      a[0] = pos.x; a[1] = pos.y; a[2] = pos.z;
      sh.trail.geometry.attributes.position.needsUpdate = true;
    });

    // shots
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      if (playing) {
        const step = s.speed * dt;
        s.angle = (s.angle + step) % TAU; s.travel += step;
      }
      s.mesh.position.copy(this.posOf(s.angle, LANES[s.lane]));
      this.burst(s.mesh.position, s.owner === 0 ? P1_COL : P2_COL, 2, 0.2);
      const target = this.players[1 - s.owner];
      let d = Math.abs(((s.angle - target.angle + Math.PI) % TAU + TAU) % TAU - Math.PI);
      if (playing && target.lane === s.lane && Math.abs(target.radius - LANES[s.lane]) < 0.5 && d < 0.12) {
        this.hitPlayer(target, this.players[s.owner]);
        this.scene.remove(s.mesh); this.shots.splice(i, 1); continue;
      }
      if (s.travel > TAU * 1.35) { this.scene.remove(s.mesh); this.shots.splice(i, 1); }
    }

    // powerups
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const u = this.powerups[i];
      u.mesh.position.copy(this.posOf(u.angle, LANES[u.lane], Math.sin(this.t * 2 + i) * 0.12));
      u.mesh.rotation.y += dt * 1.4; u.mesh.rotation.x += dt * 0.9;
      if (playing) u.life -= dt;
      let taken = false;
      for (const p of this.players) {
        const d = Math.abs(((u.angle - p.angle + Math.PI) % TAU + TAU) % TAU - Math.PI);
        if (playing && p.lane === u.lane && d < 0.16) {
          this.applyPowerup(p, u.type);
          this.burst(u.mesh.position, u.color, 28, 1.2);
          taken = true; break;
        }
      }
      if (taken || u.life <= 0) { this.scene.remove(u.mesh); this.powerups.splice(i, 1); }
    }

    // particles
    const pp = this.parts.geometry.attributes.position, pc = this.parts.geometry.attributes.color;
    for (let j = 0; j < this.pLife.length; j++) {
      if (this.pLife[j] <= 0) continue;
      this.pLife[j] -= dt;
      pp.setXYZ(j, pp.getX(j) + this.pVel[j * 3] * dt, pp.getY(j) + this.pVel[j * 3 + 1] * dt, pp.getZ(j) + this.pVel[j * 3 + 2] * dt);
      const f = Math.max(0, this.pLife[j]);
      pc.setXYZ(j, pc.getX(j) * 0.94, pc.getY(j) * 0.94, pc.getZ(j) * 0.94);
      if (f <= 0) pp.setXYZ(j, 0, -999, 0);
    }
    pp.needsUpdate = true; pc.needsUpdate = true;

    // world motion
    this.planet.rotation.y += dt * 0.045;
    this.stars.rotation.y += dt * 0.006;
    const dpos = this.dust.geometry.attributes.position;
    for (let i = 0; i < this.dustAng.length; i++) {
      this.dustAng[i] += dt * (0.16 + (12 - this.dustRad[i]) * 0.012);
      dpos.setX(i, Math.cos(this.dustAng[i]) * this.dustRad[i]);
      dpos.setZ(i, Math.sin(this.dustAng[i]) * this.dustRad[i]);
    }
    dpos.needsUpdate = true;
    this.laneRings.forEach((r, i) => {
      const active = this.players.some(p => p.lane === i);
      r.material.opacity += ((active ? 0.34 : 0.13) - r.material.opacity) * Math.min(1, dt * 5);
    });

    // camera
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2.2);
    const sway = this.phase === 'idle' ? this.t * 0.08 : 0;
    const base = this.camBase;
    this.camera.position.set(
      Math.sin(sway) * 21 + (Math.random() - 0.5) * this.shake * 1.6,
      base.y + Math.sin(this.t * 0.3) * 0.7 + (Math.random() - 0.5) * this.shake,
      Math.cos(sway) * 21 + (Math.random() - 0.5) * this.shake * 1.6
    );
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
    if ((this.frame++ % 6) === 0 && (playing || this.phase === 'countdown')) this.emit();
  }

  resize() {
    const w = this.clientWidth || 800, h = this.clientHeight || 450;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
if (!customElements.get('duel-stage')) customElements.define('duel-stage', DuelStage);
