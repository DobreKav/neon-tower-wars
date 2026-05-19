// === FILE: src/engine.js ===
// Fixed-timestep game loop with RAF, FPS tracking, and delta capping

export class Engine {
  constructor(game) {
    this.game = game;
    this.running = false;
    this.lastTime = 0;
    this.accumulator = 0;
    this.FIXED_STEP = 1000 / 60;   // 16.67ms – fixed physics step
    this.MAX_DELTA  = 50;           // cap: prevents spiral of death
    this.fps        = 60;
    this._fpsCount  = 0;
    this._fpsTimer  = 0;
    this._rafId     = null;
    this._bound     = this._loop.bind(this);
    // Adaptive quality: track consecutive low-FPS seconds
    this._lowFpsTicks = 0;
  }

  start() {
    this.running  = true;
    this.lastTime = performance.now();
    this._rafId   = requestAnimationFrame(this._bound);
  }

  stop() {
    this.running = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  _loop(timestamp) {
    if (!this.running) return;
    this._rafId = requestAnimationFrame(this._bound);

    let delta = timestamp - this.lastTime;
    this.lastTime = timestamp;
    if (delta > this.MAX_DELTA) delta = this.MAX_DELTA;

    // FPS calculation
    this._fpsCount++;
    this._fpsTimer += delta;
    if (this._fpsTimer >= 1000) {
      this.fps        = this._fpsCount;
      this._fpsCount  = 0;
      this._fpsTimer -= 1000;
      this._adaptQuality();
    }

    // Fixed-step accumulator
    this.accumulator += delta;
    while (this.accumulator >= this.FIXED_STEP) {
      this.game.update(this.FIXED_STEP / 1000); // pass seconds
      this.accumulator -= this.FIXED_STEP;
    }

    // Interpolation factor (unused but available for smooth rendering)
    const alpha = this.accumulator / this.FIXED_STEP;
    this.game.render(alpha);
  }

  // Adaptive quality: auto-scale particle emissions when sustained low FPS
  _adaptQuality() {
    if (this.fps < 40) {
      this._lowFpsTicks = Math.min(this._lowFpsTicks + 1, 10);
      if (this._lowFpsTicks >= 3) {
        // Reduce to half particle emission
        this.game._particleScale = 0.4;
      }
    } else if (this.fps >= 55) {
      this._lowFpsTicks = Math.max(this._lowFpsTicks - 1, 0);
      if (this._lowFpsTicks === 0) {
        // Restore full particle emission
        this.game._particleScale = 1.0;
      }
    }
  }
}
