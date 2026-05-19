// === FILE: src/achievementSystem.js ===
// 30+ achievements, unlock logic, popup, and list builder

const ACHIEVEMENTS = [
  // ── Combat ──────────────────────────────────────────────────────────────────
  { id:'first_kill',       name:'First Blood',       desc:'Kill your first enemy',              icon:'🩸', cat:'combat',      type:'kills',         target:1,    reward:{ gems:1  } },
  { id:'kills_100',        name:'Warrior',           desc:'Kill 100 enemies',                   icon:'⚔️', cat:'combat',      type:'kills',         target:100,  reward:{ gems:2  } },
  { id:'kills_1000',       name:'Veteran',           desc:'Kill 1,000 enemies',                 icon:'🗡️',cat:'combat',      type:'kills',         target:1000, reward:{ gems:5  } },
  { id:'kills_10000',      name:'Legend',            desc:'Kill 10,000 enemies',                icon:'🏆', cat:'combat',      type:'kills',         target:10000,reward:{ gems:15 } },
  { id:'first_boss',       name:'Boss Slayer',        desc:'Defeat your first boss',             icon:'💀', cat:'combat',      type:'boss_killed',   target:1,    reward:{ gems:5  } },
  { id:'bosses_10',        name:'Boss Hunter',        desc:'Defeat 10 bosses',                   icon:'🎯', cat:'combat',      type:'boss_killed',   target:10,   reward:{ gems:10 } },
  { id:'no_damage_wave',   name:'Untouchable',       desc:'Complete a wave losing 0 lives',     icon:'🛡️',cat:'combat',      type:'no_damage_wave',target:1,    reward:{ gems:3  } },
  { id:'overkill',         name:'Overkill',          desc:'Deal 500+ damage in one hit',        icon:'💥', cat:'combat',      type:'overkill',      target:500,  reward:{ gems:3  } },
  { id:'crit_streak',      name:'Critical Mass',     desc:'Land 10 crits in a row',             icon:'🎲', cat:'combat',      type:'crit_streak',   target:10,   reward:{ gems:4  } },

  // ── Progression ──────────────────────────────────────────────────────────────
  { id:'wave_10',          name:'Getting Started',   desc:'Reach Wave 10',                      icon:'📈', cat:'progression', type:'wave',          target:10,   reward:{ gems:2  } },
  { id:'wave_20',          name:'Halfway There',     desc:'Reach Wave 20',                      icon:'🌊', cat:'progression', type:'wave',          target:20,   reward:{ gems:4  } },
  { id:'wave_30',          name:'Almost Done',       desc:'Reach Wave 30',                      icon:'🏅', cat:'progression', type:'wave',          target:30,   reward:{ gems:6  } },
  { id:'wave_40',          name:'Conqueror',         desc:'Complete Wave 40',                   icon:'👑', cat:'progression', type:'wave',          target:40,   reward:{ gems:20 } },
  { id:'endless_50',       name:'Endless Warrior',  desc:'Reach Wave 50 in endless mode',      icon:'♾️', cat:'progression', type:'wave',          target:50,   reward:{ gems:10 } },
  { id:'level_10',         name:'Rising Star',       desc:'Reach player Level 10',              icon:'⭐', cat:'progression', type:'level',         target:10,   reward:{ gems:3  } },
  { id:'level_20',         name:'Expert',            desc:'Reach player Level 20',              icon:'🌟', cat:'progression', type:'level',         target:20,   reward:{ gems:6  } },
  { id:'prestige_1',       name:'Reborn',            desc:'Prestige for the first time',        icon:'🔄', cat:'progression', type:'prestige',      target:1,    reward:{ gems:15 } },
  { id:'map_unlock',       name:'Explorer',          desc:'Unlock a new map',                   icon:'🗺️',cat:'progression', type:'maps_unlocked', target:2,    reward:{ gems:5  } },
  { id:'all_maps',         name:'Cartographer',      desc:'Unlock all maps',                    icon:'🌏', cat:'progression', type:'maps_unlocked', target:3,    reward:{ gems:10 } },

  // ── Collection ────────────────────────────────────────────────────────────────
  { id:'first_tower',      name:'Builder',           desc:'Place your first tower',             icon:'🏗️',cat:'collection',  type:'towers_placed', target:1,    reward:{ gems:1  } },
  { id:'towers_50',        name:'Architect',         desc:'Place 50 towers total',              icon:'🏛️',cat:'collection',  type:'towers_placed', target:50,   reward:{ gems:3  } },
  { id:'all_towers',       name:'Collector',         desc:'Place all 12 tower types',           icon:'🎪', cat:'collection',  type:'unique_towers', target:12,   reward:{ gems:10 } },
  { id:'max_upgrade',      name:'Maxed Out',         desc:'Fully upgrade any tower',            icon:'⚡', cat:'collection',  type:'upgrade_bought',target:6,    reward:{ gems:5  } },
  { id:'first_ult',        name:'Ultimate Power',    desc:'Fire your first ultimate',           icon:'🔥', cat:'collection',  type:'ultimates_fired',target:1,   reward:{ gems:3  } },
  { id:'ults_10',          name:'Unleashed',         desc:'Fire 10 ultimates',                  icon:'⚡', cat:'collection',  type:'ultimates_fired',target:10,  reward:{ gems:5  } },
  { id:'gold_10000',       name:'Wealthy',           desc:'Earn 10,000 total gold',             icon:'💰', cat:'collection',  type:'total_gold',    target:10000,reward:{ gems:4  } },
  { id:'gold_100000',      name:'Tycoon',            desc:'Earn 100,000 total gold',            icon:'🏦', cat:'collection',  type:'total_gold',    target:100000,reward:{ gems:10 } },
  { id:'daily_7',          name:'Dedicated',         desc:'Log in 7 days in a row',             icon:'📅', cat:'collection',  type:'daily_streak',  target:7,    reward:{ gems:5  } },
  { id:'daily_30',         name:'Obsessed',          desc:'Log in 30 days in a row',            icon:'🗓️',cat:'collection',  type:'daily_streak',  target:30,   reward:{ gems:15 } },
];

export class AchievementSystem {
  constructor(game) {
    this.game         = game;
    this._critStreak  = 0;
    this._noDmgWave   = true;
    this._uniqueTowers= new Set();
    this._ultsThisSession = 0;
  }

  reset() {
    this._noDmgWave = true;
  }

  // Called throughout the game to check condition milestones
  check(type, value) {
    const player = this.game.player;

    // Track running counters
    switch (type) {
      case 'kills':          player.totalKills         = (player.totalKills         || 0) + value; break;
      case 'towers_placed':  player.towersPlaced        = (player.towersPlaced        || 0) + value; break;
      case 'total_gold':     player.totalGoldEarned     = (player.totalGoldEarned     || 0) + value; break;
      case 'ultimates_fired':player.ultimatesFired      = (player.ultimatesFired      || 0) + value; break;
      case 'boss_killed':    player.bossKills           = (player.bossKills           || 0) + value; break;
      case 'life_lost':      this._noDmgWave = false; break;
      case 'wave_start':     this._noDmgWave = true;  break;
      case 'crit':           this._critStreak++;       break;
      case 'no_crit':        this._critStreak = 0;     break;
      case 'tower_type':     this._uniqueTowers.add(value); break;
      case 'upgrade_bought': break; // value is the upgrade level
    }

    // Check all achievements
    for (const ach of ACHIEVEMENTS) {
      if (player.achievements[ach.id]) continue; // already unlocked

      let met = false;
      switch (ach.type) {
        case 'kills':         met = (player.totalKills        || 0) >= ach.target; break;
        case 'boss_killed':   met = (player.bossKills         || 0) >= ach.target; break;
        case 'wave':          met = this.game.currentWave >= ach.target;           break;
        case 'level':         met = player.level >= ach.target;                    break;
        case 'prestige':      met = player.prestige >= ach.target;                 break;
        case 'towers_placed': met = (player.towersPlaced      || 0) >= ach.target; break;
        case 'unique_towers': met = this._uniqueTowers.size    >= ach.target;       break;
        case 'upgrade_bought':met = type === 'upgrade_bought' && value >= ach.target; break;
        case 'ultimates_fired':met = (player.ultimatesFired   || 0) >= ach.target; break;
        case 'total_gold':    met = (player.totalGoldEarned   || 0) >= ach.target; break;
        case 'overkill':      met = type === 'overkill' && value >= ach.target;    break;
        case 'crit_streak':   met = this._critStreak >= ach.target;                break;
        case 'no_damage_wave':met = type === 'wave_complete' && this._noDmgWave;   break;
        case 'daily_streak':  met = (player.dailyStreak       || 0) >= ach.target; break;
        case 'maps_unlocked': met = (player.unlockedMaps      || []).length >= ach.target; break;
      }

      if (met) this._unlock(ach);
    }
  }

  _unlock(ach) {
    const player = this.game.player;
    if (player.achievements[ach.id]) return;
    player.achievements[ach.id] = true;

    // Reward
    if (ach.reward.gems) this.game.addGems(ach.reward.gems);

    // Popup + sound
    this.game.audio.playSound('achievement');
    this.game.ui.showAchievementPopup(ach);

    // Toast
    this.game.ui.showToast(`🏆 Achievement: ${ach.name}`, 'achievement');

    this.game.save.markDirty();
  }

  // ── Build achievement list in DOM ─────────────────────────────────────────────
  buildAchievementList(tab = 'combat') {
    const container = document.getElementById('achievement-list');
    if (!container) return;
    container.innerHTML = '';

    const player = this.game.player;
    const filtered = ACHIEVEMENTS.filter(a => a.cat === tab);

    for (const ach of filtered) {
      const done = !!player.achievements[ach.id];
      const row  = document.createElement('div');
      row.className = `ach-row${done ? ' unlocked' : ' locked'}`;

      row.innerHTML = `
        <div class="ach-icon">${ach.icon}</div>
        <div class="ach-text">
          <div class="ach-name">${ach.name}</div>
          <div class="ach-desc">${ach.desc}</div>
          <div class="ach-reward">💎 +${ach.reward.gems}</div>
        </div>
        <div class="ach-status">${done ? '✅' : '🔒'}</div>
      `;

      container.appendChild(row);
    }

    if (filtered.length === 0) {
      container.innerHTML = '<p class="dim-text">No achievements in this category.</p>';
    }
  }
}
