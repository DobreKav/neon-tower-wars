// === FILE: src/particles.js ===
// Object-pooled particle system: sparks, explosions, damage numbers, loot

const POOL_SIZE_PARTICLES = 600;
const POOL_SIZE_NUMBERS   = 80;

export class ParticleSystem {
  constructor(game) {
    this.game      = game;
    this._pool     = [];
    this._poolFree = [];   // O(1) free-list for particles
    this._numbers  = [];
    this._numFree  = [];   // O(1) free-list for numbers
    this._active   = [];
    this._activeN  = [];

    // Pre-allocate pool
    for (let i = 0; i < POOL_SIZE_PARTICLES; i++) {
      const p = this._createParticle();
      this._pool.push(p);
      this._poolFree.push(p);
    }
    for (let i = 0; i < POOL_SIZE_NUMBERS; i++) {
      const n = this._createNumber();
      this._numbers.push(n);
      this._numFree.push(n);
    }
  }

  reset() {
    for (const p of this._active)  { p.alive = false; this._poolFree.push(p); }
    for (const n of this._activeN) { n.alive = false; this._numFree.push(n); }
    this._active  = [];
    this._activeN = [];
  }

  // ── Factory helpers ───────────────────────────────────────────────────────────
  _createParticle() {
    return {
      alive: false, x: 0, y: 0,
      vx: 0, vy: 0,
      life: 0, maxLife: 1,
      r: 2, color: '#fff',
      gravity: 0, fade: true,
      shape: 'circle',  // circle | square | spark
    };
  }

  _createNumber() {
    return {
      alive: false, x: 0, y: 0,
      vy: -60, life: 0, maxLife: 1.2,
      text: '', color: '#fff',
      size: 14, bold: false,
    };
  }

  _getParticle() {
    if (this._poolFree.length > 0) return this._poolFree.pop();
    // Pool exhausted — allocate extra (rarely happens)
    const p = this._createParticle();
    this._pool.push(p);
    return p;
  }

  _getNumber() {
    if (this._numFree.length > 0) return this._numFree.pop();
    const n = this._createNumber();
    this._numbers.push(n);
    return n;
  }

  // ── Emission API ──────────────────────────────────────────────────────────────
  /** Hit spark – small burst on impact */
  hitSpark(x, y, color, count = 6) {
    if (!this.game.player.settings.particles) return;
    count = Math.ceil(count * (this.game._particleScale ?? 1));
    for (let i = 0; i < count; i++) {
      const p   = this._getParticle();
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * 80 + 20;
      p.alive   = true;
      p.x       = x + (Math.random() - 0.5) * 6;
      p.y       = y + (Math.random() - 0.5) * 6;
      p.vx      = Math.cos(ang) * spd;
      p.vy      = Math.sin(ang) * spd;
      p.life    = 0;
      p.maxLife = Math.random() * 0.3 + 0.15;
      p.r       = Math.random() * 2.5 + 1;
      p.color   = color;
      p.gravity = 80;
      p.fade    = true;
      p.shape   = 'spark';
      this._active.push(p);
    }
  }

  /** Explosion burst – enemy death */
  explosion(x, y, size = 1, color = '#ff6b00') {
    if (!this.game.player.settings.particles) return;
    const count = Math.ceil(12 * size * (this.game._particleScale ?? 1));
    for (let i = 0; i < count; i++) {
      const p   = this._getParticle();
      const ang = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const spd = (Math.random() * 80 + 40) * size;
      p.alive   = true;
      p.x       = x; p.y = y;
      p.vx      = Math.cos(ang) * spd;
      p.vy      = Math.sin(ang) * spd - 30;
      p.life    = 0;
      p.maxLife = Math.random() * 0.4 + 0.3;
      p.r       = Math.random() * 5 * size + 2;
      p.color   = color;
      p.gravity = 60;
      p.fade    = true;
      p.shape   = 'circle';
      this._active.push(p);
    }
    // Inner white flash
    const flash = this._getParticle();
    flash.alive   = true;
    flash.x       = x; flash.y = y;
    flash.vx      = 0; flash.vy = 0;
    flash.life    = 0; flash.maxLife = 0.12;
    flash.r       = 10 * size;
    flash.color   = '#ffffff';
    flash.gravity = 0; flash.fade = true;
    flash.shape   = 'circle';
    this._active.push(flash);
  }

  /** Boss death explosion */
  bossExplosion(x, y) {
    if (!this.game.player.settings.particles) return;
    const colors = ['#ff6b00','#ff0000','#ffff00','#ff4400','#ffffff'];
    const total  = Math.ceil(50 * (this.game._particleScale ?? 1));
    for (let i = 0; i < total; i++) {
      const p   = this._getParticle();
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * 200 + 50;
      p.alive   = true;
      p.x       = x + (Math.random() - 0.5) * 20;
      p.y       = y + (Math.random() - 0.5) * 20;
      p.vx      = Math.cos(ang) * spd;
      p.vy      = Math.sin(ang) * spd - 50;
      p.life    = 0;
      p.maxLife = Math.random() * 0.8 + 0.4;
      p.r       = Math.random() * 8 + 3;
      p.color   = colors[Math.floor(Math.random() * colors.length)];
      p.gravity = 40;
      p.fade    = true;
      p.shape   = 'circle';
      this._active.push(p);
    }
  }

  /** Loot drop – gold/gem particles */
  lootBurst(x, y, type = 'gold') {
    if (!this.game.player.settings.particles) return;
    const color = type === 'gem' ? '#a855f7' : '#fbbf24';
    for (let i = 0; i < 8; i++) {
      const p   = this._getParticle();
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      const spd = Math.random() * 60 + 30;
      p.alive   = true;
      p.x       = x; p.y = y;
      p.vx      = Math.cos(ang) * spd;
      p.vy      = Math.sin(ang) * spd;
      p.life    = 0;
      p.maxLife = Math.random() * 0.5 + 0.4;
      p.r       = Math.random() * 3 + 2;
      p.color   = color;
      p.gravity = 100;
      p.fade    = true;
      p.shape   = 'square';
      this._active.push(p);
    }
  }

  /** Freeze effect */
  freezeParticles(x, y) {
    if (!this.game.player.settings.particles) return;
    for (let i = 0; i < 8; i++) {
      const p = this._getParticle();
      const ang = Math.random() * Math.PI * 2;
      p.alive   = true;
      p.x       = x + (Math.random() - 0.5) * 20;
      p.y       = y + (Math.random() - 0.5) * 20;
      p.vx      = Math.cos(ang) * 20;
      p.vy      = Math.sin(ang) * 20;
      p.life    = 0;
      p.maxLife = 0.5;
      p.r       = Math.random() * 3 + 1;
      p.color   = '#88eeff';
      p.gravity = 0;
      p.fade    = true;
      p.shape   = 'spark';
      this._active.push(p);
    }
  }

  /** Poison cloud */
  poisonCloud(x, y) {
    if (!this.game.player.settings.particles) return;
    for (let i = 0; i < 6; i++) {
      const p = this._getParticle();
      p.alive   = true;
      p.x       = x + (Math.random() - 0.5) * 16;
      p.y       = y + (Math.random() - 0.5) * 16;
      p.vx      = (Math.random() - 0.5) * 15;
      p.vy      = -Math.random() * 20 - 10;
      p.life    = 0;
      p.maxLife = Math.random() * 0.6 + 0.3;
      p.r       = Math.random() * 4 + 3;
      p.color   = '#7dba47';
      p.gravity = -10;
      p.fade    = true;
      p.shape   = 'circle';
      this._active.push(p);
    }
  }

  // ── Damage / Reward Numbers ───────────────────────────────────────────────────
  damageNumber(x, y, value, isCrit = false, isOverkill = false) {
    const n = this._getNumber();
    n.alive   = true;
    n.x       = x + (Math.random() - 0.5) * 20;
    n.y       = y - 10;
    n.vy      = isCrit ? -90 : -60;
    n.life    = 0;
    n.maxLife = isCrit ? 1.5 : 1.0;
    n.text    = isCrit ? `✦${value}` : String(value);
    n.color   = isOverkill ? '#ff4444' : isCrit ? '#ffff00' : '#ffffff';
    n.size    = isCrit ? 18 : 13;
    n.bold    = isCrit;
    this._activeN.push(n);
  }

  rewardNumber(x, y, text, color = '#fbbf24') {
    const n = this._getNumber();
    n.alive   = true;
    n.x       = x;
    n.y       = y;
    n.vy      = -70;
    n.life    = 0;
    n.maxLife = 1.3;
    n.text    = text;
    n.color   = color;
    n.size    = 15;
    n.bold    = true;
    this._activeN.push(n);
  }

  // ── Update ────────────────────────────────────────────────────────────────────
  update(dt) {
    // Update particles — swap-pop (O(1)) instead of splice (O(n))
    for (let i = this._active.length - 1; i >= 0; i--) {
      const p = this._active[i];
      p.life += dt;
      if (!p.alive || p.life >= p.maxLife) {
        p.alive = false;
        this._poolFree.push(p);
        this._active[i] = this._active[this._active.length - 1];
        this._active.pop();
        continue;
      }
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
    }
    // Update floating numbers
    for (let i = this._activeN.length - 1; i >= 0; i--) {
      const n = this._activeN[i];
      n.life += dt;
      if (!n.alive || n.life >= n.maxLife) {
        n.alive = false;
        this._numFree.push(n);
        this._activeN[i] = this._activeN[this._activeN.length - 1];
        this._activeN.pop();
        continue;
      }
      n.y  += n.vy * dt;
      n.vy *= 0.94;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  render(ctx) {
    // Particles — no shadowBlur; no per-particle save/restore for circles+squares
    ctx.save();
    ctx.shadowBlur = 0;
    for (const p of this._active) {
      const alpha = p.fade ? Math.max(0, 1 - p.life / p.maxLife) : 1;
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = p.color;
      if (p.shape === 'square') {
        ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      } else if (p.shape === 'spark') {
        // Rotated rect — save/restore only for spark shape
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.fillRect(-p.r * 3, -p.r * 0.5, p.r * 3, p.r);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Floating numbers — shadow only for crits (bold), not every number
    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    for (const n of this._activeN) {
      const t     = n.life / n.maxLife;
      const alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.font        = `${n.bold ? 'bold ' : ''}${n.size}px monospace`;
      ctx.fillStyle   = n.color;
      if (n.bold) {
        ctx.shadowBlur  = 6;
        ctx.shadowColor = n.color;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fillText(n.text, n.x, n.y);
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}
