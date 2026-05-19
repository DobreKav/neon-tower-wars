// === FILE: src/game.js ===
// Master game orchestrator – state machine, system coordination

import { Engine }           from './engine.js';
import { Renderer }         from './renderer.js';
import { InputHandler }     from './input.js';
import { AudioManager }     from './audio.js';
import { SaveSystem }       from './saveSystem.js';
import { AdsManager }       from './adsManager.js';
import { ParticleSystem }   from './particles.js';
import { WaveManager }      from './waveManager.js';
import { EnemyManager }     from './enemyManager.js';
import { TowerManager }     from './towerManager.js';
import { UpgradeSystem }    from './upgradeSystem.js';
import { UISystem }         from './uiSystem.js';
import { Effects }          from './effects.js';
import { BossSystem }       from './bossSystem.js';
import { AchievementSystem} from './achievementSystem.js';
import { DailyRewards }     from './dailyRewards.js';
import { SkinsSystem }           from './skinsSystem.js';
import { ProgressionSystem }     from './progressionSystem.js';
import { STATE, GRID_COLS, GRID_ROWS } from './constants.js';
import { MAPS }                  from './maps.js';

export class Game {
  constructor() {
    this.state      = STATE.LOADING;
    this.canvas     = document.getElementById('game-canvas');
    this.ctx        = this.canvas.getContext('2d');
    this.mapData    = null;   // current map definition
    this.pathCells  = new Set(); // "col,row" strings of path tiles
    this.tileSize   = 32;
    this.gridOffX   = 0;
    this.gridOffY   = 0;

    // Session runtime data
    this.lives        = 20;
    this.gold         = 200;
    this.gems         = 0;
    this.currentWave  = 0;
    this.currentMapId = null;
    this.totalWaves   = 0;
    this.score        = 0;
    this.combo      = 0;
    this.comboTimer = 0;
    this.speed      = 1;       // 1× or 2× game speed
    this.paused     = false;
    this.waveActive = false;
    this.endlesMode = false;

    // Persistent player data (loaded from save)
    this.player = {
      level:         1,
      xp:            0,
      xpToNext:      500,
      gems:          0,
      bestWave:      {},
      totalKills:    0,
      totalGoldEarned:0,
      skillPoints:   0,
      skills:        {},
      prestige:      0,
      unlockedMaps:  ['forest'],
      unlockedTowers:[],
      achievements:  {},
      dailyStreak:   0,
      lastLogin:     0,
      settings: {
        music:     true,
        sfx:       true,
        haptic:    true,
        particles: true,
        fps:       false,
        quality:   'medium',
      },
    };

    // Systems – instantiated in init()
    this.engine       = null;
    this.renderer     = null;
    this.input        = null;
    this.audio        = null;
    this.save         = null;
    this.ads          = null;
    this.particles    = null;
    this.waves        = null;
    this.enemies      = null;
    this.towers       = null;
    this.upgrades     = null;
    this.ui           = null;
    this.effects      = null;
    this.bosses       = null;
    this.achievements = null;
    this.daily        = null;
    this.skins        = null;
    this.progression  = null;

    // Event bus for decoupled communication
    this._listeners = {};

    // Performance: DPR cached on resize; particle scale for adaptive quality
    this._dpr           = 1;
    this._particleScale = 1.0;
  }

  // ── Initialization ──────────────────────────────────────────────────────────
  async init() {
    this._setLoadingProgress(5, 'Setting up canvas...');
    this._resizeCanvas();
    window.addEventListener('resize', () => this._resizeCanvas());

    this._setLoadingProgress(15, 'Loading save data...');
    this.save         = new SaveSystem(this);
    this.save.load();

    this._setLoadingProgress(25, 'Initializing audio...');
    this.audio        = new AudioManager(this);
    await this.audio.init();

    this._setLoadingProgress(35, 'Building systems...');
    this.ads          = new AdsManager(this);
    this.particles    = new ParticleSystem(this);
    this.effects      = new Effects(this);
    this.enemies      = new EnemyManager(this);
    this.towers       = new TowerManager(this);
    this.waves        = new WaveManager(this);
    this.upgrades     = new UpgradeSystem(this);
    this.bosses       = new BossSystem(this);
    this.achievements = new AchievementSystem(this);
    this.daily        = new DailyRewards(this);
    this.skins        = new SkinsSystem(this);
    this.skins.init(this.save._pendingSkins);
    this.save._pendingSkins = null; // release reference
    this.progression  = new ProgressionSystem(this);
    this.progression.init(this.save._pendingProgression);
    this.save._pendingProgression = null;

    this._setLoadingProgress(65, 'Building renderer...');
    this.renderer     = new Renderer(this);

    this._setLoadingProgress(80, 'Connecting input...');
    this.input        = new InputHandler(this);
    this.input.attach();

    this._setLoadingProgress(90, 'Initializing UI...');
    this.ui           = new UISystem(this);
    this.ui.init();

    this._setLoadingProgress(100, 'Ready!');

    // Start the engine
    this.engine = new Engine(this);
    await this._delay(400);

    this._showMenu();
    this.engine.start();
  }

  // ── Canvas resize ────────────────────────────────────────────────────────────
  _resizeCanvas() {
    this._dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width  = window.innerWidth  * this._dpr;
    this.canvas.height = window.innerHeight * this._dpr;
    this.canvas.style.width  = window.innerWidth  + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.scale(this._dpr, this._dpr);
    this._recalcGrid();
  }

  _recalcGrid() {
    if (!this.mapData) return;
    const W  = window.innerWidth;
    const H  = window.innerHeight;
    const HUD_TOP    = 54;  // top HUD height
    const HUD_BOTTOM = 84;  // tower bar height
    const availW = W;
    const availH = H - HUD_TOP - HUD_BOTTOM;
    this.tileSize = Math.floor(Math.min(availW / GRID_COLS, availH / GRID_ROWS));
    this.gridOffX = Math.floor((W - this.tileSize * GRID_COLS) / 2);
    this.gridOffY = HUD_TOP + Math.floor((availH - this.tileSize * GRID_ROWS) / 2);
  }

  // ── Map setup ────────────────────────────────────────────────────────────────
  setupMap(mapId) {
    this.mapData = MAPS.find(m => m.id === mapId) || MAPS[0];
    this._recalcGrid();
    this._buildPathCells();

    // Reset session state
    this.currentMapId = mapId;
    this.totalWaves   = this.mapData.waves;
    this.lives        = this.mapData.lives;
    this.gold         = this.mapData.startGold;
    this.currentWave  = 0;
    this.score      = 0;
    this.combo      = 0;
    this.comboTimer = 0;
    this.speed      = 1;
    this.waveActive = false;
    this.endlesMode = false;

    this.enemies.reset();
    this.towers.reset();
    this.particles.reset();
    this.waves.setup(this.mapData);
    this.bosses.reset();
    this.progression.onRunStart();
  }

  _buildPathCells() {
    this.pathCells.clear();
    const wps = this.mapData.waypoints;
    for (let i = 0; i < wps.length - 1; i++) {
      const a = wps[i], b = wps[i + 1];
      // Walk from a to b in grid steps
      let c = a.col, r = a.row;
      while (c !== b.col || r !== b.row) {
        this.pathCells.add(`${c},${r}`);
        if (c < b.col) c++;
        else if (c > b.col) c--;
        else if (r < b.row) r++;
        else r--;
      }
      this.pathCells.add(`${b.col},${b.row}`);
    }
  }

  isPathCell(col, row) {
    return this.pathCells.has(`${col},${row}`);
  }

  // Convert grid cell to pixel center
  cellToPixel(col, row) {
    return {
      x: this.gridOffX + col * this.tileSize + this.tileSize / 2,
      y: this.gridOffY + row * this.tileSize + this.tileSize / 2,
    };
  }

  // Convert pixel to grid cell
  pixelToCell(x, y) {
    const col = Math.floor((x - this.gridOffX) / this.tileSize);
    const row = Math.floor((y - this.gridOffY) / this.tileSize);
    return { col, row };
  }

  isValidCell(col, row) {
    return col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS;
  }

  // ── Game State Machine ───────────────────────────────────────────────────────
  _showMenu() {
    this.state = STATE.MENU;
    this.ui.showMenu();
    this.audio.playMusic('menu');
    this.daily.checkDailyLogin();
  }

  startMapSelect() {
    this.state = STATE.MAP_SELECT;
    this.ui.showMapSelect();
  }

  startGame(mapId) {
    this.setupMap(mapId);
    this.ui.showGame();
    this.state = STATE.WAVE_PREP;
    this.audio.playMusic('gameplay');
    this.emit('gameStart', { mapId });
  }

  startWave() {
    if (this.waveActive) return;
    this.currentWave++;
    this.waveActive = true;
    this.waves.startWave(this.currentWave);
    this.ui.setWaveButton(true, this.currentWave);
    this.ui.updateHUD();
    this.audio.playSound('wave_start');
    this.emit('waveStart', { wave: this.currentWave });

    // Reset session-level challenge trackers on wave start
    this.achievements.check('wave_start', 1);
    this.progression.track('wave_start', 1);
  }

  onWaveComplete() {
    this.waveActive = false;
    const goldReward = 50 + this.currentWave * 10;
    const gemReward  = this.currentWave % 5 === 0 ? 2 : 0;
    const xpReward   = 100 + this.currentWave * 20;

    // Welcome bonus: double gold for first 5 waves
    const wMult = this.progression.welcomeMultiplier;
    this.addGold(goldReward * wMult);
    if (gemReward > 0) this.addGems(gemReward);
    this.addXP(xpReward);

    if (wMult > 1) this.ui.showToast(`⭐ Welcome bonus: 2× gold!`, 'reward');

    this.ui.setWaveButton(false, 0);

    // Check if final wave
    if (this.currentWave >= this.totalWaves) {
      this._showVictory();
      return;
    }

    this.state = STATE.WAVE_COMPLETE;
    this.ui.showWaveComplete(goldReward, gemReward, xpReward);
    this.audio.playSound('wave_complete');
    this.emit('waveComplete', { wave: this.currentWave, goldReward, gemReward });

    // Save best wave per map
    const prev = this.player.bestWave[this.currentMapId] || 0;
    if (this.currentWave > prev) {
      this.player.bestWave[this.currentMapId] = this.currentWave;
    }
    // Sync bestAnyWave for weekly mission tracking
    this.player.bestAnyWave = Math.max(0, ...Object.values(this.player.bestWave));
    this.save.save();
    this.achievements.check('wave', this.currentWave);
    this.progression.onWaveComplete(this.currentWave);

    // No-damage wave achievement
    this.achievements.check('wave_complete', 1);
    this.progression.track('no_damage_wave', 1);
  }

  _showVictory() {
    this.state = STATE.VICTORY;
    const goldBonus = 500 + this.currentWave * 50;
    const gemBonus  = 10;
    this.addGold(goldBonus);
    this.addGems(gemBonus);
    this.ui.showVictory(goldBonus, gemBonus);
    this.audio.playMusic('victory');
    this.emit('victory', {});
    this.progression.onVictory();
    this.save.save();
  }

  startEndlessMode() {
    this.endlesMode  = true;
    this.totalWaves  = 9999;
    this.state       = STATE.WAVE_PREP;
    this.ui.showHUD();
    this.ui.setWaveButton(false, 0);
    this.ui.updateHUD();
    this.audio.playMusic('game');
  }

  loseLife(amount = 1) {
    this.lives = Math.max(0, this.lives - amount);
    this.ui.updateHUD();
    this.effects.screenFlash('#ff0000', 0.3);
    if (this.player.settings.haptic) navigator.vibrate && navigator.vibrate([50]);
    this.audio.playSound('life_lost');

    if (this.lives <= 0) {
      this._showDefeat();
    }
  }

  _showDefeat() {
    this.state = STATE.DEFEAT;
    this.waveActive = false;
    this.ui.showDefeat();
    this.audio.playMusic('defeat');
    this.emit('defeat', { wave: this.currentWave });
    this.progression.onDefeat(this.currentWave, this.totalWaves);
    this.progression.track('win_streak_reset', 0);
    this.save.save();
  }

  returnToMenu() {
    this.state = STATE.MENU;
    this.ui.returnToMenu();
    this.audio.playMusic('menu');

    // Cleanup
    if (this.mapData) {
      this.enemies.reset();
      this.towers.reset();
      this.particles.reset();
      this.mapData = null;
    }
  }

  pauseGame() {
    if (this.state !== STATE.PLAYING && this.state !== STATE.WAVE_PREP) return;
    this.state = STATE.PAUSED;
    this.ui.pause();
    this.audio.pauseMusic();
  }

  resumeGame() {
    this.ui.resume();
    this.state = this.waveActive ? STATE.PLAYING : STATE.WAVE_PREP;
    this.audio.resumeMusic();
  }

  continueAfterDefeat(lives = 5) {
    this.lives = lives;
    this.ui.hideDefeatScreen();
    this.state = this.waveActive ? STATE.PLAYING : STATE.WAVE_PREP;
    this.audio.playMusic('gameplay');
    this.ui.updateHUD();
  }

  toggleSpeed() {
    this.speed = this.speed === 1 ? 2 : 1;
    this.ui._refreshSpeedBtn();
  }

  // ── Economy ──────────────────────────────────────────────────────────────────
  addGold(amount) {
    const bonus = 1 + (this.player.skills.gold_bonus || 0) * 0.1;
    this.gold += Math.round(amount * bonus);
    this.player.totalGoldEarned += amount;
    this.ui.updateHUD();
  }

  spendGold(amount) {
    if (this.gold < amount) return false;
    this.gold -= amount;
    this.ui.updateHUD();
    this.progression.track('gold_spent', amount);
    return true;
  }

  addGems(amount) {
    this.player.gems += amount;
    this.gems = this.player.gems;
    this.ui.updateHUD();
    this.save.save();
  }

  spendGems(amount) {
    if (this.player.gems < amount) return false;
    this.player.gems -= amount;
    this.gems = this.player.gems;
    this.ui.updateHUD();
    this.save.save();
    return true;
  }

  addXP(amount) {
    const bonus = 1 + (this.player.skills.xp_bonus || 0) * 0.1;
    this.player.xp += Math.round(amount * bonus);
    while (this.player.xp >= this.player.xpToNext) {
      this.player.xp      -= this.player.xpToNext;
      this.player.level++;
      this.player.xpToNext = Math.floor(500 * Math.pow(1.3, this.player.level - 1));
      this.player.skillPoints++;
      this.ui.showToast(`Level Up! Now level ${this.player.level}`, 'success');
      this.audio.playSound('level_up');
      this.achievements.check('level', this.player.level);
    }
    this.ui.updateXPBar();
  }

  addKill(enemy) {
    this.player.totalKills++;
    this.score += enemy.reward.score || 10;
    this.combo++;
    this.comboTimer = 3.0;
    if (this.combo >= 5) {
      this.ui.showCombo(this.combo);
    }
    this.achievements.check('kill', this.player.totalKills);
    this.progression.track('kill', 1);
    this.emit('enemyKilled', { enemy });
  }

  // ── Main Update Loop ─────────────────────────────────────────────────────────
  update(dt) {
    if (this.state === STATE.PAUSED) return;

    const scaledDt = dt * this.speed;

    // Update combo timer
    if (this.comboTimer > 0) {
      this.comboTimer -= scaledDt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.ui.hideCombo();
      }
    }

    if (this.state === STATE.PLAYING || this.state === STATE.WAVE_PREP) {
      this.waves.update(scaledDt);
      this.enemies.update(scaledDt);
      this.towers.update(scaledDt);
      this.particles.update(scaledDt);
      this.effects.update(scaledDt);
      this.bosses.update(scaledDt);

      // Check wave completion
      if (this.waveActive && this.waves.isWaveComplete() && this.enemies.isEmpty()) {
        this.state = STATE.WAVE_PREP;
        this.onWaveComplete();
      }
    }

    // Update UI elements that need per-frame updates
    if (this.state !== STATE.MENU && this.state !== STATE.MAP_SELECT) {
      this.ui.updateFPS();
    }
  }

  // ── Main Render Loop ─────────────────────────────────────────────────────────
  render() {
    const ctx = this.ctx;
    // Use cached logical dimensions — avoids DOM property access every frame
    const W   = this.canvas.width  / this._dpr;
    const H   = this.canvas.height / this._dpr;

    ctx.clearRect(0, 0, W, H);

    if (this.state === STATE.MENU) {
      this.renderer.renderMenuBackground(ctx, W, H);
      return;
    }

    if (this.state === STATE.MAP_SELECT) {
      this.renderer.renderMenuBackground(ctx, W, H);
      return;
    }

    if (!this.mapData) return;

    // Game world
    this.renderer.renderMap(ctx);
    this.towers.render(ctx);
    this.enemies.render(ctx);
    this.towers.renderProjectiles(ctx);
    this.particles.render(ctx);
    this.effects.render(ctx);
    this.renderer.renderHUDCanvas(ctx);
  }

  // ── Event Bus ────────────────────────────────────────────────────────────────
  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (!this._listeners[event]) return;
    for (const cb of this._listeners[event]) cb(data);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  _setLoadingProgress(pct, text) {
    const bar = document.getElementById('loading-bar');
    const txt = document.getElementById('loading-text');
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.textContent = text;
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
