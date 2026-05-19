// === FILE: src/renderer.js ===
// Canvas rendering: map, HUD canvas elements, menu background animation

import { GRID_COLS, GRID_ROWS } from './constants.js';

export class Renderer {
  constructor(game) {
    this.game = game;
    // Animated menu background particles (30 is plenty on mobile)
    this._menuParticles = Array.from({ length: 30 }, () => this._newMenuParticle());
    this._menuTime  = 0;
    this._menuGrad  = null;
    this._menuGradW = 0;
    this._menuGradH = 0;
    // Offscreen map tile cache — rebuilt only when map/skin/layout changes
    this._mapCanvas   = null;
    this._mapCacheKey = '';
  }

  // ── Map ─────────────────────────────────────────────────────────────────────
  renderMap(ctx) {
    const { game } = this;
    const { tileSize, gridOffX, gridOffY, mapData } = game;
    if (!mapData) return;

    const skinTheme  = game.skins ? game.skins.getActiveSkin('map') : null;
    const grassColor = (skinTheme && skinTheme.grassColor) || mapData.grassColor;
    const pathColor  = (skinTheme && skinTheme.pathColor)  || mapData.pathColor;
    const bgColor    = (skinTheme && skinTheme.bgColor)    || mapData.bgColor;

    // Rebuild tile cache only when map/skin/layout changes — 140 draws → 1 drawImage
    const cacheKey = `${mapData.id}|${bgColor}|${pathColor}|${grassColor}|${tileSize}|${gridOffX}|${gridOffY}`;
    if (this._mapCacheKey !== cacheKey) {
      this._rebuildMapCache(bgColor, pathColor, grassColor, tileSize, gridOffX, gridOffY);
      this._mapCacheKey = cacheKey;
    }
    ctx.drawImage(this._mapCanvas, 0, 0);

    // Entry/exit arrows (drawn on top of cache — static per map)
    this._drawEntryExit(ctx);

    // Hover cell highlight (dynamic — only when player is hovering)
    if (game.input && game.input.hoverCell) {
      const { col, row } = game.input.hoverCell;
      if (game.isValidCell(col, row) && !game.isPathCell(col, row)) {
        const canPlace  = !game.towers.getTowerAt(col, row);
        const selTower  = game.towers.selectedType;
        const canAfford = selTower ? game.gold >= game.towers.getDef(selTower).cost : false;
        const px = gridOffX + col * tileSize;
        const py = gridOffY + row * tileSize;
        ctx.fillStyle = (canPlace && canAfford) ? 'rgba(0,245,255,0.15)' : 'rgba(255,60,60,0.15)';
        ctx.fillRect(px, py, tileSize, tileSize);
        ctx.strokeStyle = (canPlace && canAfford) ? 'rgba(0,245,255,0.6)' : 'rgba(255,60,60,0.6)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px + 1, py + 1, tileSize - 2, tileSize - 2);
      }
    }
  }

  // Build / rebuild the OffscreenCanvas for the static map tiles + grid
  _rebuildMapCache(bgColor, pathColor, grassColor, tileSize, gridOffX, gridOffY) {
    const game = this.game;
    const W    = Math.ceil(game.canvas.width  / game._dpr);
    const H    = Math.ceil(game.canvas.height / game._dpr);

    if (!this._mapCanvas || this._mapCanvas.width !== W || this._mapCanvas.height !== H) {
      this._mapCanvas = (typeof OffscreenCanvas !== 'undefined')
        ? new OffscreenCanvas(W, H)
        : Object.assign(document.createElement('canvas'), { width: W, height: H });
    }

    const oc = this._mapCanvas.getContext('2d');

    // Background
    oc.fillStyle = bgColor;
    oc.fillRect(0, 0, W, H);

    // Tile fill pass – group by color to halve fillStyle changes
    oc.fillStyle = grassColor;
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (!game.isPathCell(col, row)) {
          oc.fillRect(gridOffX + col * tileSize, gridOffY + row * tileSize, tileSize, tileSize);
        }
      }
    }
    oc.fillStyle = pathColor;
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (game.isPathCell(col, row)) {
          oc.fillRect(gridOffX + col * tileSize, gridOffY + row * tileSize, tileSize, tileSize);
        }
      }
    }

    // Grid lines – single batched stroke
    oc.strokeStyle = 'rgba(0,0,0,0.15)';
    oc.lineWidth   = 0.5;
    oc.beginPath();
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        oc.rect(gridOffX + col * tileSize + 0.5, gridOffY + row * tileSize + 0.5, tileSize - 1, tileSize - 1);
      }
    }
    oc.stroke();
  }

  _drawEntryExit(ctx) {
    const { tileSize, gridOffX, gridOffY, mapData } = this.game;
    if (!mapData) return;
    const wps = mapData.waypoints;
    // Entry: first real waypoint
    const entry = wps[1] || wps[0];
    // Exit: last real waypoint
    const exitWp = wps[wps.length - 2] || wps[wps.length - 1];

    // Green entry arrow
    ctx.save();
    ctx.fillStyle = '#22c55e';
    ctx.font = `bold ${Math.max(10, tileSize * 0.5)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const ex = gridOffX + entry.col * tileSize + tileSize / 2;
    const ey = gridOffY + entry.row * tileSize + tileSize / 2;
    ctx.fillText('▶', ex - tileSize * 0.8, ey);

    // Red exit marker
    ctx.fillStyle = '#ef4444';
    const xx = gridOffX + exitWp.col * tileSize + tileSize / 2;
    const xy = gridOffY + exitWp.row * tileSize + tileSize / 2;
    ctx.fillText('⚑', xx + tileSize * 0.8, xy);
    ctx.restore();
  }

  // ── HUD canvas layer (range ring for selected tower) ─────────────────────────
  renderHUDCanvas(ctx) {
    const { game } = this;
    // Draw range ring around selected tower
    const panel = game.ui && game.ui.selectedTowerInst;
    if (panel) {
      const t = panel;
      ctx.save();
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,245,255,0.25)';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(0,245,255,0.04)';
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Animated menu background ─────────────────────────────────────────────────
  renderMenuBackground(ctx, W, H) {
    this._menuTime += 0.016;

    // Deep space gradient (cached until resize)
    if (!this._menuGrad || this._menuGradW !== W || this._menuGradH !== H) {
      this._menuGrad = ctx.createRadialGradient(W / 2, H * 0.35, 0, W / 2, H * 0.35, W);
      this._menuGrad.addColorStop(0, '#0f1628');
      this._menuGrad.addColorStop(1, '#0a0e1a');
      this._menuGradW = W;
      this._menuGradH = H;
    }
    ctx.fillStyle = this._menuGrad;
    ctx.fillRect(0, 0, W, H);

    // Animated grid lines (batched)
    ctx.strokeStyle = 'rgba(0,245,255,0.04)';
    ctx.lineWidth = 1;
    const spacing = 40;
    ctx.beginPath();
    for (let x = 0; x < W; x += spacing) {
      ctx.moveTo(x, 0); ctx.lineTo(x, H);
    }
    for (let y = 0; y < H; y += spacing) {
      ctx.moveTo(0, y); ctx.lineTo(W, y);
    }
    ctx.stroke();

    // Floating particles — one save/restore for all; no shadowBlur (too costly on mobile)
    ctx.save();
    ctx.shadowBlur = 0;
    for (const p of this._menuParticles) {
      p.y -= p.vy;
      p.x += Math.sin(this._menuTime * p.wobble) * 0.3;
      if (p.y < -10) Object.assign(p, this._newMenuParticle(true, W, H));
      ctx.globalAlpha = p.alpha * (0.5 + 0.5 * Math.sin(this._menuTime * p.blink));
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  _newMenuParticle(respawn = false, W = window.innerWidth, H = window.innerHeight) {
    const colors = ['#00f5ff', '#a855f7', '#f97316', '#22c55e', '#fbbf24'];
    return {
      x:      Math.random() * W,
      y:      respawn ? H + 10 : Math.random() * H,
      r:      Math.random() * 2.5 + 0.5,
      vy:     Math.random() * 0.4 + 0.1,
      wobble: Math.random() * 2 + 0.5,
      blink:  Math.random() * 3 + 1,
      alpha:  Math.random() * 0.6 + 0.2,
      color:  colors[Math.floor(Math.random() * colors.length)],
    };
  }
}
