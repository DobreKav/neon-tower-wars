// === FILE: src/saveSystem.js ===
// LocalStorage persistence with versioned schema migration and auto-save

const SAVE_KEY     = 'ntw_save_v1';
const SAVE_VERSION = 1;
const AUTO_SAVE_INTERVAL = 30; // seconds

export class SaveSystem {
  constructor(game) {
    this.game      = game;
    this._timer    = 0;
    this._dirty    = false;
  }

  // ── Public API ────────────────────────────────────────────────────────────────
  save() {
    const data = this._serialize();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      this._dirty = false;
    } catch (e) {
      console.warn('Save failed:', e);
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      const migrated = this._migrate(data);
      this._deserialize(migrated);
    } catch (e) {
      console.warn('Load failed – using defaults:', e);
    }
  }

  reset() {
    localStorage.removeItem(SAVE_KEY);
    // Reload page for clean state
    window.location.reload();
  }

  markDirty() {
    this._dirty = true;
  }

  // Auto-save tick (called from uiSystem or game loop)
  tick(dt) {
    this._timer += dt;
    if (this._timer >= AUTO_SAVE_INTERVAL) {
      this._timer = 0;
      if (this._dirty || this.game.waveActive) this.save();
    }
  }

  // ── Serialization ─────────────────────────────────────────────────────────────
  _serialize() {
    const p = this.game.player;
    return {
      version:    SAVE_VERSION,
      savedAt:    Date.now(),
      // Player progression
      level:      p.level,
      xp:         p.xp,
      xpToNext:   p.xpToNext,
      gems:       p.gems,
      bestWave:   p.bestWave,
      totalKills: p.totalKills,
      totalGoldEarned: p.totalGoldEarned,
      towersPlaced: p.towersPlaced,
      bossKills: p.bossKills,
      upgradesTotal: p.upgradesTotal,
      bestAnyWave: p.bestAnyWave,
      skillPoints:p.skillPoints,
      skills:     p.skills,
      prestige:   p.prestige,
      // Unlocks
      unlockedMaps:   p.unlockedMaps,
      unlockedTowers: p.unlockedTowers,
      // Tracking
      achievements: p.achievements,
      dailyStreak:  p.dailyStreak,
      lastLogin:    p.lastLogin,
      streakShield: p.streakShield,
      // Settings
      settings: p.settings,
      // Skins
      equippedSkins:  this.game.skins ? this.game.skins.equipped : {},
      ownedSkins:     this.game.skins ? this.game.skins.owned    : [],
      // Progression systems
      progression:    this.game.progression ? this.game.progression.serialize() : {},
    };
  }

  _deserialize(data) {
    const p = this.game.player;
    p.level           = data.level           ?? 1;
    p.xp              = data.xp              ?? 0;
    p.xpToNext        = data.xpToNext        ?? 500;
    p.gems            = data.gems            ?? 0;
    p.bestWave        = data.bestWave        ?? {};
    p.totalKills      = data.totalKills      ?? 0;
    p.totalGoldEarned = data.totalGoldEarned ?? 0;
    p.towersPlaced    = data.towersPlaced    ?? 0;
    p.bossKills       = data.bossKills       ?? 0;
    p.upgradesTotal   = data.upgradesTotal   ?? 0;
    p.bestAnyWave     = data.bestAnyWave     ?? Math.max(0, ...Object.values(data.bestWave || {}));
    p.skillPoints     = data.skillPoints     ?? 0;
    p.skills          = data.skills          ?? {};
    p.prestige        = data.prestige        ?? 0;
    p.unlockedMaps    = data.unlockedMaps    ?? ['forest'];
    p.unlockedTowers  = data.unlockedTowers  ?? [];
    p.achievements    = data.achievements    ?? {};
    p.dailyStreak     = data.dailyStreak     ?? 0;
    p.lastLogin       = data.lastLogin       ?? 0;
    p.streakShield    = data.streakShield    ?? false;
    p.settings        = Object.assign({
      music: true, sfx: true, haptic: true, particles: true, fps: false, quality: 'medium',
    }, data.settings || {});

    // Mirror gems to game
    this.game.gems = p.gems;

    // Store skins data for deferred init (SkinsSystem is created after save.load())
    this._pendingSkins = { owned: data.ownedSkins || [], equipped: data.equippedSkins || {} };

    // Store progression data for deferred init
    this._pendingProgression = data.progression || {};

    // Offline gold reward: 1 gold per minute offline, up to 30 minutes
    if (data.savedAt) {
      const elapsed = Math.min((Date.now() - data.savedAt) / 60000, 30); // minutes, max 30
      const offlineGold = Math.floor(elapsed * 5);
      if (offlineGold > 0) {
        // Store for display after menu loads
        this._offlineReward = offlineGold;
      }
    }
  }

  // ── Migration ─────────────────────────────────────────────────────────────────
  _migrate(data) {
    // Future-proof: if save version < current, migrate fields
    if (!data.version || data.version < SAVE_VERSION) {
      // v0 → v1: add missing fields
      data.version      = SAVE_VERSION;
      data.prestige     = data.prestige     ?? 0;
      data.skillPoints  = data.skillPoints  ?? 0;
      data.skills       = data.skills       ?? {};
      data.unlockedTowers = data.unlockedTowers ?? [];
    }
    return data;
  }

  getOfflineReward() {
    const r = this._offlineReward || 0;
    this._offlineReward = 0;
    return r;
  }
}
