/* BLOCKWAY — top-down arcade driving prototype
 * Registers <blockway-game>. Pure HTML5 Canvas + vanilla JS.
 * Structure:  CONFIG -> SPRITES -> ENTITIES -> INPUT -> UPDATE -> RENDER -> LOOP
 */
(() => {
  // ---------------------------------------------------------------- CONFIG
  const W = 360, H = 640;              // logical (pixel-art) resolution
  const TILE = 16;                     // voxel block size for road/verge
  const PX = 2;                        // sprite pixel scale
  const ROAD_X = 68, ROAD_W = 224;     // road bounds
  const LANES = 4, LANE_W = ROAD_W / LANES;
  const LANE_C = Array.from({ length: LANES }, (_, i) => ROAD_X + LANE_W * (i + 0.5));

  const CAR_W = 32, CAR_H = 36;
  const PLAYER_Y = H - 150;            // player is vertically anchored
  const SPEED_MIN = 220, SPEED_MAX = 900, ACCEL = 520, BRAKE = 900, DRAG = 160;
  const STEER = 300;                   // px/s lateral
  const SNAP = 6;                      // lane-snap easing (per second)
  const FUEL_MAX = 100, FUEL_BURN = 0.85, PX_PER_M = 8;
  const STAGE_TIME = 60;               // seconds per stage
  const CRASH_LIMIT = 3;               // wrecks allowed per run
  const GOAL_M = 12000;                // finish-line distance

  const PALETTES = [
    { name: 'Noon',  g1: '#5fa83c', g2: '#4f9433', a1: '#4a4a52', a2: '#434349', k1: '#c0392b', k2: '#e9edf0', t1: '#2f6b2a', t2: '#1f4a1c', dash: '#e9edf0' },
    { name: 'Dusk',  g1: '#7e7139', a1: '#55464f', g2: '#6b5f30', a2: '#4d4048', k1: '#d9603c', k2: '#f2d9b0', t1: '#5b5527', t2: '#3d3a1b', dash: '#f2d9b0' },
    { name: 'Night', g1: '#2b3a4a', g2: '#243140', a1: '#33333c', a2: '#2d2d35', k1: '#8e3b31', k2: '#b8c4ce', t1: '#22403a', t2: '#18302b', dash: '#b8c4ce' },
  ];
  const CAR_COLORS = ['#e84c3d', '#f2b233', '#3498db', '#9b59b6', '#1abc9c', '#e9edf0'];

  // ---------------------------------------------------------------- SPRITES
  // char grids -> palette keys. B body, D dark trim, T tyre, G glass, W stripe
  const CAR = [
    '....DDDDDDDD....',
    '...DBBBBBBBBD...',
    '..TTBBBBBBBBTT..',
    '..TTBBBBBBBBTT..',
    '...BBBBBBBBBB...',
    '...BGGGGGGGGB...',
    '...BGGGGGGGGB...',
    '...BBBBBBBBBB...',
    '...BBBWWWWBBB...',
    '...BBBWWWWBBB...',
    '...BBBWWWWBBB...',
    '...BBBBBBBBBB...',
    '...BGGGGGGGGB...',
    '...BGGGGGGGGB...',
    '...BBBBBBBBBB...',
    '..TTBBBBBBBBTT..',
    '..TTBBBBBBBBTT..',
    '....DDDDDDDD....',
  ];
  const TREE = [
    '..LLLL..',
    '.LLLLLL.',
    'LLLLLLLL',
    'LLLLLLLL',
    '.LLLLLL.',
    '..LKKL..',
    '...KK...',
    '...KK...',
  ];
  const CAN = [
    '.DDDDDD.',
    'DFFFFFFD',
    'DFWWWWFD',
    'DFWFFWFD',
    'DFWWWWFD',
    'DFFFFFFD',
    'DFFFFFFD',
    '.DDDDDD.',
  ];

  function blit(ctx, grid, pal, x, y, px) {
    x = Math.round(x); y = Math.round(y);
    for (let r = 0; r < grid.length; r++) {
      const row = grid[r];
      for (let c = 0; c < row.length; c++) {
        const col = pal[row[c]];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x + c * px, y + r * px, px, px);
      }
    }
  }

  const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };

  // ---------------------------------------------------------------- AUDIO
  // Tiny WebAudio synth: no files. Engine is a continuous voice whose pitch and
  // gain follow speed/throttle; everything else is one-shot.
  class Sfx {
    constructor() { this.ctx = null; this.muted = false; }
    boot() {
      if (this.ctx) return;
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      const a = new C();
      this.ctx = a;
      this.master = a.createGain(); this.master.gain.value = 0.35; this.master.connect(a.destination);
      this.eng = a.createOscillator(); this.eng.type = 'sawtooth'; this.eng.frequency.value = 60;
      this.sub = a.createOscillator(); this.sub.type = 'square'; this.sub.frequency.value = 30;
      this.lp = a.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 700;
      this.engGain = a.createGain(); this.engGain.gain.value = 0;
      this.eng.connect(this.lp); this.sub.connect(this.lp);
      this.lp.connect(this.engGain); this.engGain.connect(this.master);
      this.eng.start(); this.sub.start();
      const n = a.sampleRate * 1.2;
      this.noise = a.createBuffer(1, n, a.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

    engine(speed, throttle, live) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime, k = speed / SPEED_MAX;
      this.eng.frequency.setTargetAtTime(48 + k * 160, t, 0.08);
      this.sub.frequency.setTargetAtTime(24 + k * 80, t, 0.08);
      this.lp.frequency.setTargetAtTime(480 + k * 1900, t, 0.1);
      this.engGain.gain.setTargetAtTime(!live || this.muted ? 0 : (throttle ? 0.2 : 0.1), t, 0.12);
    }
    tone(f, dur, type, vol, to) {
      if (!this.ctx || this.muted) return;
      const a = this.ctx, t = a.currentTime;
      const o = a.createOscillator(), g = a.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(f, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
    }
    burst(dur, vol, type, from, to, q) {
      if (!this.ctx || this.muted) return;
      const a = this.ctx, t = a.currentTime;
      const s = a.createBufferSource(); s.buffer = this.noise;
      const f = a.createBiquadFilter(); f.type = type;
      f.frequency.setValueAtTime(from, t);
      f.frequency.exponentialRampToValueAtTime(to, t + dur);
      if (q) f.Q.value = q;
      const g = a.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(this.master);
      s.start(t); s.stop(t + dur + 0.02);
    }
    seq(notes, gap, dur, vol, type) { notes.forEach((f, i) => setTimeout(() => this.tone(f, dur, type, vol), i * gap)); }

    steer() { this.tone(540, 0.055, 'square', 0.07); }
    brake() { this.burst(0.45, 0.26, 'bandpass', 2800, 700, 6); }
    crash() { this.burst(0.6, 0.55, 'lowpass', 3200, 200); this.tone(190, 0.5, 'square', 0.32, 40); }
    pickup() { this.seq([880, 1320], 85, 0.11, 0.14); }
    launch() { this.seq([523, 659, 784, 1047], 85, 0.13, 0.15); }
    over() { this.seq([440, 349, 262, 196], 135, 0.24, 0.15, 'sawtooth'); }
    goal() { this.seq([523, 659, 784, 1047, 1319, 1047, 1319], 110, 0.24, 0.16); }
  }

  // ---------------------------------------------------------------- GAME
  class Game {
    constructor(ctx, sfx) {
      this.ctx = ctx;
      this.sfx = sfx;
      this.high = Number(localStorage.getItem('blockway.highscore') || 0);
      this.reset();
      this.mode = 'title';
    }

    reset() {
      this.speed = SPEED_MIN;
      this.px = LANE_C[1] - CAR_W / 2;
      this.dist = 0; this.score = 0; this.mult = 1; this.cleanM = 0;
      this.fuel = FUEL_MAX;
      this.stage = 1; this.stageT = STAGE_TIME;
      this.traffic = []; this.oils = []; this.cans = []; this.trees = [];
      this.spawnT = 0.6; this.oilT = 3; this.canT = 6; this.treeT = 0;
      this.slip = 0; this.invul = 0; this.shake = 0; this.flash = 0;
      this.scroll = 0; this.dashOff = 0;
      this.crashes = 0;
      this.finish = null;
      this.overTitle = 'OUT OF FUEL';
      this.banner = ''; this.bannerT = 0;
    }

    get pal() { return PALETTES[(this.stage - 1) % PALETTES.length]; }

    start() { this.reset(); this.mode = 'play'; this.sfx.launch(); }

    // ------------------------------------------------------------ UPDATE
    update(dt, keys) {
      if (this.mode !== 'play') return;
      const diff = 1 + (this.stage - 1) * 0.22;
      this.sfx.engine(this.speed, keys.up, true);

      // longitudinal
      if (keys.up) this.speed += ACCEL * dt;
      else if (keys.down) this.speed -= BRAKE * dt;
      else this.speed -= DRAG * dt * (this.speed > SPEED_MIN + 200 ? 1 : 0.3);
      this.speed = Math.max(SPEED_MIN, Math.min(SPEED_MAX * (1 + (this.stage - 1) * 0.06), this.speed));

      // lateral: free steering, with lane-snap when hands off
      const grip = this.slip > 0 ? 0.35 : 1;
      let steered = false;
      if (keys.left) { this.px -= STEER * grip * dt; steered = true; }
      if (keys.right) { this.px += STEER * grip * dt; steered = true; }
      if (this.slip > 0) {
        this.px += this.slipDir * 120 * dt;
        this.slip -= dt;
      } else if (!steered) {
        const c = LANE_C.reduce((b, v) => Math.abs(v - (this.px + CAR_W / 2)) < Math.abs(b - (this.px + CAR_W / 2)) ? v : b);
        this.px += (c - CAR_W / 2 - this.px) * Math.min(1, SNAP * dt);
      }
      // walls: scrape costs speed
      const lo = ROAD_X + 2, hi = ROAD_X + ROAD_W - CAR_W - 2;
      if (this.px < lo) { this.px = lo; this.speed *= 0.94; this.breakStreak(); }
      if (this.px > hi) { this.px = hi; this.speed *= 0.94; this.breakStreak(); }

      // world scroll + score
      const adv = this.speed * dt;
      this.scroll += adv; this.dashOff = (this.dashOff + adv) % (TILE * 4);
      const m = adv / PX_PER_M;
      this.dist += m; this.cleanM += m;
      this.score += m * this.mult;
      if (this.cleanM >= 300 && this.mult < 8) { this.cleanM = 0; this.mult++; this.say('x' + this.mult + ' MULTIPLIER'); }

      // fuel
      this.fuel -= dt * FUEL_BURN * (0.6 + this.speed / SPEED_MAX);
      if (this.fuel <= 0) { this.fuel = 0; this.gameOver('OUT OF FUEL'); return; }

      // finish line
      if (!this.finish && this.dist >= GOAL_M - 300) { this.finish = { y: -56 }; this.say('FINAL STRETCH'); }
      if (this.finish) {
        this.finish.y += adv;
        if (this.finish.y >= PLAYER_Y) { this.win(); return; }
      }

      // stage
      this.stageT -= dt;
      if (this.stageT <= 0) { this.stage++; this.stageT = STAGE_TIME; this.fuel = Math.min(FUEL_MAX, this.fuel + 30); this.say('STAGE ' + this.stage + ' — ' + this.pal.name); }

      // timers / spawns
      this.spawnT -= dt; this.oilT -= dt; this.canT -= dt; this.treeT -= dt;
      if (this.spawnT <= 0) { this.spawnCar(diff); this.spawnT = (0.95 - Math.min(0.5, diff * 0.14)) * (0.7 + hash(this.dist) * 0.8); }
      if (this.oilT <= 0) { this.oils.push({ x: LANE_C[(Math.random() * LANES) | 0] - 20, y: -48, r: 0 }); this.oilT = 4.5 / diff + Math.random() * 3; }
      if (this.canT <= 0) { this.cans.push({ x: LANE_C[(Math.random() * LANES) | 0] - 8, y: -32 }); this.canT = 9 + Math.random() * 6; }
      if (this.treeT <= 0) { const left = Math.random() < 0.5; this.trees.push({ x: left ? 8 + Math.random() * 40 : W - 56 + Math.random() * 40, y: -64 }); this.treeT = 0.35; }

      const move = (arr) => { for (const o of arr) o.y += adv * (o.rel || 1); };
      for (const c of this.traffic) c.y += (this.speed - c.speed) * dt;
      move(this.oils); move(this.cans); move(this.trees);
      this.traffic = this.traffic.filter(o => o.y < H + 80 && o.y > -300);
      this.oils = this.oils.filter(o => o.y < H + 60);
      this.cans = this.cans.filter(o => o.y < H + 60);
      this.trees = this.trees.filter(o => o.y < H + 80);

      if (this.invul > 0) this.invul -= dt;
      if (this.shake > 0) this.shake -= dt;
      if (this.flash > 0) this.flash -= dt;
      if (this.bannerT > 0) this.bannerT -= dt;

      this.collide();
    }

    spawnCar(diff) {
      const lane = (Math.random() * LANES) | 0;
      const x = LANE_C[lane] - CAR_W / 2;
      if (this.traffic.some(c => Math.abs(c.x - x) < CAR_W && c.y < 40)) return;
      this.traffic.push({
        x, y: -CAR_H - 20, lane,
        speed: (140 + Math.random() * 180) * diff,
        color: CAR_COLORS[(Math.random() * CAR_COLORS.length) | 0],
        passed: false,
      });
    }

    collide() {
      const box = { x: this.px + 4, y: PLAYER_Y + 4, w: CAR_W - 8, h: CAR_H - 8 };
      const hit = (a, x, y, w, h) => a.x < x + w && a.x + a.w > x && a.y < y + h && a.y + a.h > y;

      for (const c of this.traffic) {
        if (hit(box, c.x + 4, c.y + 4, CAR_W - 8, CAR_H - 8)) { if (this.invul <= 0) this.crash(); }
        else if (!c.passed && c.y > PLAYER_Y + CAR_H) {
          c.passed = true; this.score += 25 * this.mult;
          if (Math.abs(c.x - this.px) < CAR_W + 8) { this.score += 75 * this.mult; this.say('NEAR MISS +' + 75 * this.mult); }
        }
      }
      for (let i = this.oils.length - 1; i >= 0; i--) {
        const o = this.oils[i];
        if (hit(box, o.x, o.y, 40, 24) && this.slip <= 0) {
          this.slip = 1.1; this.slipDir = Math.random() < 0.5 ? -1 : 1;
          this.breakStreak(); this.say('SLICK!');
        }
      }
      for (let i = this.cans.length - 1; i >= 0; i--) {
        const c = this.cans[i];
        if (hit(box, c.x, c.y, 16, 16)) { this.cans.splice(i, 1); this.fuel = Math.min(FUEL_MAX, this.fuel + 25); this.say('+25 FUEL'); this.sfx.pickup(); }
      }
    }

    breakStreak() { this.mult = 1; this.cleanM = 0; }

    crash() {
      this.crashes++;
      this.speed = SPEED_MIN; this.fuel = Math.max(0, this.fuel - 5);
      this.breakStreak();
      this.invul = 1.4; this.shake = 0.35; this.flash = 0.2;
      this.px = LANE_C[1] - CAR_W / 2; this.slip = 0;
      this.traffic = this.traffic.filter(c => c.y < PLAYER_Y - 120);
      const left = CRASH_LIMIT - this.crashes;
      this.say(left > 0 ? 'CRASH!  ' + left + ' LEFT' : 'CRASH!');
      this.sfx.crash();
      if (this.crashes >= CRASH_LIMIT) { this.gameOver('WRECKED'); return; }
      if (this.fuel <= 0) this.gameOver('OUT OF FUEL');
    }

    win() {
      this.mode = 'win';
      this.score += 5000 + Math.floor(this.fuel * 50);
      this.sfx.engine(0, false, false);
      this.sfx.goal();
      this.saveHigh();
    }

    gameOver(title) {
      this.overTitle = title || 'OUT OF FUEL';
      this.mode = 'over';
      this.sfx.engine(0, false, false);
      this.sfx.over();
      this.saveHigh();
    }

    saveHigh() {
      if (this.score > this.high) { this.high = Math.floor(this.score); localStorage.setItem('blockway.highscore', String(this.high)); }
    }

    say(t) { this.banner = t; this.bannerT = 1.5; }

    // ------------------------------------------------------------ RENDER
    draw() {
      const ctx = this.ctx, p = this.pal;
      ctx.save();
      if (this.shake > 0) ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);

      // verge
      const off = this.scroll % TILE;
      for (let y = -TILE; y < H + TILE; y += TILE) {
        for (let x = 0; x < W; x += TILE) {
          if (x + TILE > ROAD_X && x < ROAD_X + ROAD_W) continue;
          const n = hash(Math.floor(x / TILE) * 31 + Math.floor((y + this.scroll) / TILE));
          ctx.fillStyle = n > 0.5 ? p.g1 : p.g2;
          ctx.fillRect(x, y + off, TILE, TILE);
        }
      }
      // asphalt
      for (let y = -TILE; y < H + TILE; y += TILE) {
        for (let x = ROAD_X; x < ROAD_X + ROAD_W; x += TILE) {
          const n = hash(Math.floor(x / TILE) * 17 + Math.floor((y + this.scroll) / TILE) * 3);
          ctx.fillStyle = n > 0.5 ? p.a1 : p.a2;
          ctx.fillRect(x, y + off, TILE, TILE);
        }
      }
      // kerbs
      const ko = this.scroll % (TILE * 2);
      for (let y = -TILE * 2; y < H + TILE * 2; y += TILE) {
        const alt = Math.floor((y + ko) / TILE) % 2 === 0;
        ctx.fillStyle = alt ? p.k1 : p.k2;
        ctx.fillRect(ROAD_X - 8, y + ko, 8, TILE);
        ctx.fillRect(ROAD_X + ROAD_W, y + ko, 8, TILE);
      }
      // lane dashes
      ctx.fillStyle = p.dash;
      for (let i = 1; i < LANES; i++) {
        const x = ROAD_X + LANE_W * i - 2;
        for (let y = -TILE * 4; y < H + TILE * 4; y += TILE * 4) ctx.fillRect(x, y + this.dashOff, 4, TILE * 2);
      }
      // trees
      for (const t of this.trees) blit(ctx, TREE, { L: p.t1, K: p.t2 }, t.x, t.y, 4);
      // oil
      for (const o of this.oils) {
        ctx.fillStyle = 'rgba(12,10,18,0.85)';
        ctx.fillRect(o.x, o.y, 40, 24);
        ctx.fillStyle = 'rgba(90,80,140,0.6)';
        ctx.fillRect(o.x + 8, o.y + 4, 24, 8);
        ctx.fillRect(o.x + 4, o.y + 16, 12, 4);
      }
      // finish line
      if (this.finish) {
        for (let r = 0; r < 3; r++) {
          for (let x = ROAD_X, i = 0; x < ROAD_X + ROAD_W; x += TILE, i++) {
            ctx.fillStyle = (i + r) % 2 ? '#12101a' : '#f7f4ef';
            ctx.fillRect(x, Math.round(this.finish.y) + r * TILE, TILE, TILE);
          }
        }
      }
      // cans
      for (const c of this.cans) blit(ctx, CAN, { D: '#1b1620', F: '#e84c3d', W: '#f7e7c8' }, c.x, c.y, 2);
      // traffic
      for (const c of this.traffic) blit(ctx, CAR, { B: c.color, D: '#1b1620', T: '#100e14', G: '#7fd3ef', W: 'rgba(255,255,255,0.35)' }, c.x, c.y, PX);
      // player
      if (!(this.invul > 0 && Math.floor(this.invul * 12) % 2)) {
        blit(ctx, CAR, { B: '#f2f2f2', D: '#1b1620', T: '#100e14', G: '#7fd3ef', W: '#e84c3d' }, this.px, PLAYER_Y, PX);
      }
      ctx.restore();

      if (this.flash > 0) { ctx.fillStyle = `rgba(255,90,60,${this.flash * 1.6})`; ctx.fillRect(0, 0, W, H); }

      this.hud();
      if (this.mode === 'title') this.card('ROAD WAGON', [
        'ARROWS  steer / gas / brake',
        'SPACE  start',
        '',
        'REACH ' + GOAL_M.toLocaleString() + ' m',
        'THREE CRASHES AND YOU ARE OUT',
      ]);
      if (this.mode === 'over') this.card(this.overTitle, [
        'SCORE  ' + Math.floor(this.score).toLocaleString(),
        'DIST   ' + Math.floor(this.dist).toLocaleString() + ' / ' + GOAL_M.toLocaleString() + ' m',
        'STAGE  ' + this.stage + '    CRASHES  ' + this.crashes,
        '', 'SPACE  drive again',
      ]);
      if (this.mode === 'win') this.card('GOAL!', [
        'FINAL  ' + Math.floor(this.score).toLocaleString(),
        'FUEL BONUS  ' + Math.floor(this.fuel * 50).toLocaleString(),
        'STAGE  ' + this.stage + '    CRASHES  ' + this.crashes,
        '', 'SPACE  run it again',
      ]);
      this.mark();
    }

    mark() {
      const ctx = this.ctx;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '8px Silkscreen, monospace';
      ctx.fillStyle = 'rgba(240,236,229,0.32)';
      ctx.fillText('CREATED BY AKPIXELS', W / 2, H - 16);
      if (this.mode === 'play') {
        ctx.textAlign = 'left';
        ctx.font = '10px Silkscreen, monospace';
        ctx.fillStyle = 'rgba(127,211,239,0.75)';
        ctx.fillText(Math.round(this.speed / 4) + ' KM/H', 8, H - 18);
      }
      ctx.restore();
    }

    hud() {
      const ctx = this.ctx;
      ctx.fillStyle = 'rgba(16,14,20,0.82)';
      ctx.fillRect(0, 0, W, 42);
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#f2b233';
      ctx.font = '10px Silkscreen, monospace';
      ctx.fillText('SCORE', 8, 5);
      ctx.fillText('DIST', 96, 5);
      ctx.fillText('ST', 168, 5);
      ctx.fillText('CARS', 196, 5);
      ctx.fillText('FUEL', 258, 5);
      ctx.fillStyle = '#7fd3ef';
      ctx.fillText('x' + this.mult, 54, 5);
      ctx.fillStyle = '#f7f4ef';
      ctx.font = '16px Silkscreen, monospace';
      ctx.fillText(String(Math.floor(this.score)).padStart(6, '0'), 8, 17);
      ctx.fillText(Math.floor(this.dist) + 'm', 96, 17);
      ctx.fillText(String(this.stage), 168, 17);
      const left = Math.max(0, CRASH_LIMIT - this.crashes);
      for (let i = 0; i < CRASH_LIMIT; i++) {
        ctx.fillStyle = i < left ? '#f7f4ef' : 'rgba(255,255,255,0.16)';
        ctx.fillRect(196 + i * 10, 20, 6, 10);
      }
      const cells = 10, on = Math.ceil(this.fuel / FUEL_MAX * cells);
      for (let i = 0; i < cells; i++) {
        ctx.fillStyle = i < on ? (on <= 2 ? '#e84c3d' : '#5fa83c') : 'rgba(255,255,255,0.14)';
        ctx.fillRect(258 + i * 9, 20, 7, 12);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(0, 42, W, 3);
      ctx.fillStyle = this.finish ? '#f7f4ef' : '#f2b233';
      ctx.fillRect(0, 42, Math.min(1, this.dist / GOAL_M) * W, 3);

      if (this.bannerT > 0) {
        ctx.font = '14px Silkscreen, monospace';
        const t = this.banner, w = ctx.measureText(t).width;
        ctx.fillStyle = 'rgba(16,14,20,0.8)';
        ctx.fillRect(W / 2 - w / 2 - 8, 60, w + 16, 24);
        ctx.fillStyle = '#f2b233';
        ctx.fillText(t, W / 2 - w / 2, 66);
      }
    }

    card(title, lines) {
      const ctx = this.ctx;
      ctx.fillStyle = 'rgba(16,14,20,0.86)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#f2b233';
      ctx.font = '26px Silkscreen, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(title, W / 2, H / 2 - 90);
      ctx.font = '12px Silkscreen, monospace';
      ctx.fillStyle = '#f7f4ef';
      lines.forEach((l, i) => ctx.fillText(l, W / 2, H / 2 - 40 + i * 22));
      ctx.fillStyle = '#7fd3ef';
      ctx.font = '10px Silkscreen, monospace';
      ctx.fillText('BEST  ' + this.high.toLocaleString(), W / 2, H - 60);
      ctx.textAlign = 'left';
    }
  }

  // ---------------------------------------------------------------- ELEMENT
  class BlockwayGame extends HTMLElement {
    connectedCallback() {
      if (this._up) return; this._up = true;
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `<style>
        :host{display:block;width:100%;height:100%}
        .wrap{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#0d0b11}
        canvas{image-rendering:pixelated;display:block;outline:none;box-shadow:0 0 0 4px #1b1620}
      </style><div class="wrap"><canvas tabindex="0"></canvas></div>`;
      const cv = root.querySelector('canvas');
      const ctx = cv.getContext('2d');
      this.sfx = new Sfx();
      this.game = new Game(ctx, this.sfx);

      const fit = () => {
        const r = this.getBoundingClientRect();
        // integer upscale when there is room; fractional downscale when there is not
        const raw = Math.min((r.width || W) / W, (r.height || H) / H);
        const s = raw >= 1 ? Math.floor(raw) : Math.max(0.25, raw);
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = W * dpr; cv.height = H * dpr;
        cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = false;
      };
      fit();
      this._ro = new ResizeObserver(fit); this._ro.observe(this);

      const keys = { left: 0, right: 0, up: 0, down: 0 };
      const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down' };
      this._kd = (e) => {
        const k = map[e.key];
        if (k || e.code === 'Space') { this.sfx.boot(); this.sfx.resume(); this.sfx.muted = this.getAttribute('muted') === 'true'; }
        if (k) {
          if (!keys[k]) {
            if (k === 'left' || k === 'right') this.sfx.steer();
            if (k === 'down' && this.game.mode === 'play') this.sfx.brake();
          }
          keys[k] = 1; e.preventDefault();
        }
        if (e.code === 'Space') {
          e.preventDefault();
          if (this.game.mode !== 'play') this.game.start();
        }
      };
      this._ku = (e) => { if (map[e.key]) { keys[map[e.key]] = 0; e.preventDefault(); } };
      window.addEventListener('keydown', this._kd);
      window.addEventListener('keyup', this._ku);
      this._blur = () => { keys.left = keys.right = keys.up = keys.down = 0; this.sfx.engine(0, false, false); };
      window.addEventListener('blur', this._blur);
      cv.addEventListener('pointerdown', () => cv.focus());

      let last = performance.now();
      const loop = (t) => {
        const dt = Math.min(0.05, (t - last) / 1000); last = t;
        this.sfx.muted = this.getAttribute('muted') === 'true';
        this.game.update(dt, keys);
        ctx.clearRect(0, 0, W, H);
        this.game.draw();
        this._raf = requestAnimationFrame(loop);
      };
      this._raf = requestAnimationFrame(loop);
    }
    disconnectedCallback() {
      cancelAnimationFrame(this._raf);
      if (this.sfx && this.sfx.ctx) this.sfx.ctx.close();
      this._ro && this._ro.disconnect();
      window.removeEventListener('keydown', this._kd);
      window.removeEventListener('keyup', this._ku);
      window.removeEventListener('blur', this._blur);
      this._up = false;
    }
  }
  if (!customElements.get('blockway-game')) customElements.define('blockway-game', BlockwayGame);
})();
