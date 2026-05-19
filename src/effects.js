// === FILE: src/effects.js ===
// Screen shake, flash, shockwave visual effects

export class Effects {
  constructor(game) {
    this.game = game;

    // Screen shake state
    this._shakeX        = 0;
    this._shakeY        = 0;
    this._shakeIntensity= 0;
    this._shakeDuration = 0;
    this._shakeTimer    = 0;

    // Screen flash state
    this._flashColor    = '#ffffff';
    this._flashAlpha    = 0;
    this._flashDecay    = 2.0;

    // Active shockwaves
    this._shockwaves    = [];

    // Ongoing screen tint (e.g. red when low on lives)
    this._tintColor     = null;
    this._tintAlpha     = 0;
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  /**
   * Shake the camera.
   * @param {number} intensity - Pixel offset magnitude
   * @param {number} duration  - Seconds
   */
  screenShake(intensity, duration) {
    // Allow stacking: take the greater intensity
    if (intensity > this._shakeIntensity) this._shakeIntensity = intensity;
    if (duration  > this._shakeDuration ) {
      this._shakeDuration = duration;
      this._shakeTimer    = duration;
    }
  }

  /**
   * Flash a colour overlay across the entire screen.
   * @param {string} color  - CSS colour string
   * @param {number} alpha  - Starting alpha (0–1)
   * @param {number} [decay=2.0] - How fast it fades (alpha/sec)
   */
  screenFlash(color, alpha, decay = 2.0) {
    this._flashColor = color;
    this._flashAlpha = Math.min(alpha + this._flashAlpha, 0.95); // stack
    this._flashDecay = decay;
  }

  /**
   * Emit an expanding ring shockwave at (x, y).
   * @param {number} x
   * @param {number} y
   * @param {number} maxRadius
   * @param {string} [color='#ffffff']
   */
  shockwave(x, y, maxRadius, color = '#ffffff') {
    this._shockwaves.push({
      x, y,
      radius:    0,
      maxRadius: maxRadius || 80,
      alpha:     0.7,
      color,
    });
  }

  /**
   * Set a persistent screen tint (e.g. red pulsing when lives are low).
   */
  setTint(color, alpha) {
    this._tintColor = color;
    this._tintAlpha = alpha;
  }

  clearTint() {
    this._tintColor = null;
    this._tintAlpha = 0;
  }

  // ── Update ────────────────────────────────────────────────────────────────────
  update(dt) {
    // Screen shake
    if (this._shakeTimer > 0) {
      this._shakeTimer -= dt;
      const prog   = this._shakeTimer / this._shakeDuration;
      const mag    = this._shakeIntensity * prog;
      this._shakeX = (Math.random() * 2 - 1) * mag;
      this._shakeY = (Math.random() * 2 - 1) * mag;
      if (this._shakeTimer <= 0) {
        this._shakeX        = 0;
        this._shakeY        = 0;
        this._shakeIntensity= 0;
        this._shakeDuration = 0;
      }
    }

    // Flash decay
    if (this._flashAlpha > 0) {
      this._flashAlpha -= this._flashDecay * dt;
      if (this._flashAlpha < 0) this._flashAlpha = 0;
    }

    // Shockwaves — swap-pop (O(1)) instead of splice (O(n))
    for (let i = this._shockwaves.length - 1; i >= 0; i--) {
      const s  = this._shockwaves[i];
      s.radius += s.maxRadius * 2.5 * dt;
      s.alpha  -= 1.8 * dt;
      if (s.alpha <= 0 || s.radius >= s.maxRadius) {
        this._shockwaves[i] = this._shockwaves[this._shockwaves.length - 1];
        this._shockwaves.pop();
      }
    }

    // Low-life red tint pulse
    if (this.game.lives <= 5 && this.game.lives > 0) {
      this._tintColor = '#ff0000';
      this._tintAlpha = 0.04 + 0.04 * Math.sin(Date.now() / 400);
    } else {
      this.clearTint();
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────────

  /** Apply shake offset — call ctx.save() before, ctx.restore() after the frame */
  applyShake(ctx) {
    if (this._shakeX !== 0 || this._shakeY !== 0) {
      ctx.translate(this._shakeX, this._shakeY);
    }
  }

  /** Draw shockwave rings and flash/tint overlays on top of the scene */
  render(ctx) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Shockwave rings
    for (const s of this._shockwaves) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = Math.max(0, s.alpha);
      ctx.lineWidth   = 3;
      ctx.shadowBlur  = 12;
      ctx.shadowColor = s.color;
      ctx.stroke();
      ctx.restore();
    }

    // Screen tint (e.g. low-life red pulse)
    if (this._tintColor && this._tintAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = this._tintAlpha;
      ctx.fillStyle   = this._tintColor;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // Screen flash
    if (this._flashAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = this._flashAlpha;
      ctx.fillStyle   = this._flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }
}
