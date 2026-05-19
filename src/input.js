// === FILE: src/input.js ===
// Unified touch + mouse input handler with tap, drag, and cell hit-testing

import { STATE } from './constants.js';

export class InputHandler {
  constructor(game) {
    this.game       = game;
    this.hoverCell  = null;   // { col, row } – cell under pointer
    this._touches   = {};     // active touch tracking
    this._dragStart = null;   // { x, y, time }
    this._TAP_THRESH = 12;    // px – max movement to count as tap
    this._TAP_TIME   = 300;   // ms – max duration for tap
    this._bound      = {};    // stored bound listeners for cleanup
  }

  attach() {
    const canvas = this.game.canvas;
    const el     = document;

    this._bound.touchstart  = e => this._onTouchStart(e);
    this._bound.touchmove   = e => this._onTouchMove(e);
    this._bound.touchend    = e => this._onTouchEnd(e);
    this._bound.mousedown   = e => this._onMouseDown(e);
    this._bound.mousemove   = e => this._onMouseMove(e);
    this._bound.mouseup     = e => this._onMouseUp(e);

    canvas.addEventListener('touchstart', this._bound.touchstart, { passive: false });
    canvas.addEventListener('touchmove',  this._bound.touchmove,  { passive: false });
    canvas.addEventListener('touchend',   this._bound.touchend,   { passive: false });
    canvas.addEventListener('mousedown',  this._bound.mousedown);
    canvas.addEventListener('mousemove',  this._bound.mousemove);
    canvas.addEventListener('mouseup',    this._bound.mouseup);
  }

  detach() {
    const canvas = this.game.canvas;
    canvas.removeEventListener('touchstart', this._bound.touchstart);
    canvas.removeEventListener('touchmove',  this._bound.touchmove);
    canvas.removeEventListener('touchend',   this._bound.touchend);
    canvas.removeEventListener('mousedown',  this._bound.mousedown);
    canvas.removeEventListener('mousemove',  this._bound.mousemove);
    canvas.removeEventListener('mouseup',    this._bound.mouseup);
  }

  // ── Touch ───────────────────────────────────────────────────────────────────
  _onTouchStart(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      this._touches[t.identifier] = { x: t.clientX, y: t.clientY, startX: t.clientX, startY: t.clientY, time: Date.now() };
    }
    if (e.touches.length === 1) {
      const t = e.touches[0];
      this._dragStart = { x: t.clientX, y: t.clientY, time: Date.now() };
      this._updateHover(t.clientX, t.clientY);
    }
  }

  _onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      this._updateHover(t.clientX, t.clientY);
    }
  }

  _onTouchEnd(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const start = this._touches[t.identifier];
      if (start) {
        const dx   = t.clientX - start.startX;
        const dy   = t.clientY - start.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dt   = Date.now() - start.time;
        if (dist < this._TAP_THRESH && dt < this._TAP_TIME) {
          this._onTap(t.clientX, t.clientY);
        }
        delete this._touches[t.identifier];
      }
    }
    if (e.touches.length === 0) {
      this.hoverCell  = null;
      this._dragStart = null;
    }
  }

  // ── Mouse ───────────────────────────────────────────────────────────────────
  _onMouseDown(e) {
    this._dragStart = { x: e.clientX, y: e.clientY, time: Date.now() };
    this._updateHover(e.clientX, e.clientY);
  }

  _onMouseMove(e) {
    this._updateHover(e.clientX, e.clientY);
  }

  _onMouseUp(e) {
    if (!this._dragStart) return;
    const dx   = e.clientX - this._dragStart.x;
    const dy   = e.clientY - this._dragStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dt   = Date.now() - this._dragStart.time;
    if (dist < this._TAP_THRESH && dt < this._TAP_TIME) {
      this._onTap(e.clientX, e.clientY);
    }
    this._dragStart = null;
  }

  // ── Hover tracking ───────────────────────────────────────────────────────────
  _updateHover(x, y) {
    const game = this.game;
    if (!game.mapData) { this.hoverCell = null; return; }
    const cell = game.pixelToCell(x, y);
    if (game.isValidCell(cell.col, cell.row)) {
      this.hoverCell = cell;
    } else {
      this.hoverCell = null;
    }
  }

  // ── Tap dispatch ─────────────────────────────────────────────────────────────
  _onTap(x, y) {
    const game  = this.game;
    const state = game.state;

    if (state !== STATE.PLAYING && state !== STATE.WAVE_PREP) return;
    if (!game.mapData) return;

    const cell = game.pixelToCell(x, y);
    if (!game.isValidCell(cell.col, cell.row)) return;

    const { col, row } = cell;
    const isPath = game.isPathCell(col, row);
    const existingTower = game.towers.getTowerAt(col, row);

    if (existingTower) {
      // Select existing tower for upgrade panel
      game.ui.openTowerPanel(existingTower);
      return;
    }

    if (isPath) {
      game.ui.showToast("Can't place on path!", 'error');
      return;
    }

    // Place selected tower type
    const type = game.towers.selectedType;
    if (!type) {
      game.ui.showToast('Select a tower first', 'info');
      return;
    }

    const def = game.towers.getDef(type);
    if (!def) return;

    if (game.gold < def.cost) {
      game.ui.showToast('Not enough gold!', 'error');
      game.audio.playSound('error');
      return;
    }

    if (!game.spendGold(def.cost)) return;

    game.towers.placeTower(type, col, row);
    game.audio.playSound('place_tower');
    game.achievements.check('tower_placed', game.towers.count());
  }
}
