// === FILE: src/dailyRewards.js ===
// Daily login streak rewards, weekly missions, offline gold display

const DAILY_REWARDS = [
  { day:1, gold:200,  gems:0, label:'200 Gold'  },
  { day:2, gold:300,  gems:1, label:'300 Gold + 1 Gem' },
  { day:3, gold:400,  gems:0, label:'400 Gold'  },
  { day:4, gold:500,  gems:2, label:'500 Gold + 2 Gems' },
  { day:5, gold:600,  gems:0, label:'600 Gold'  },
  { day:6, gold:750,  gems:3, label:'750 Gold + 3 Gems' },
  { day:7, gold:1000, gems:5, label:'1000 Gold + 5 Gems 🎁' },
];

export class DailyRewards {
  constructor(game) {
    this.game = game;
  }

  // ── Check on menu open ────────────────────────────────────────────────────────
  checkDailyLogin() {
    const player = this.game.player;
    const now    = Date.now();
    const last   = player.lastLogin || 0;
    const dayMs  = 86400000;

    const daysSince = Math.floor((now - last) / dayMs);

    if (daysSince === 0) return; // already logged in today

    if (daysSince > 1) {
      // Streak broken — try streak shield first
      const shieldSaved = this.game.progression?.tryUseStreakShield();
      if (!shieldSaved) {
        player.dailyStreak = 0;
      }
    }

    // Increment streak (cycle 1-7)
    player.dailyStreak = ((player.dailyStreak || 0) % 7) + 1;
    player.lastLogin   = now;
    player.dailyClaimable = true;

    // Award streak shield at every 5-day milestone
    this.game.progression?.checkAwardShield(player.dailyStreak);

    // Show offline reward if any
    const offlineReward = this.game.save.getOfflineReward();
    if (offlineReward > 0) {
      this.game.addGold(offlineReward);
      this.game.ui.showToast(`🌙 Offline reward: +${offlineReward} Gold`, 'reward');
    }

    this.game.save.markDirty();
    this.game.achievements.check('daily_streak', player.dailyStreak);
  }

  claimDaily() {
    const player = this.game.player;
    if (!player.dailyClaimable) {
      this.game.ui.showToast('Already claimed today!', 'info');
      return;
    }

    const dayIdx = ((player.dailyStreak || 1) - 1) % 7;
    const reward = DAILY_REWARDS[dayIdx];

    if (reward.gold) this.game.addGold(reward.gold);
    if (reward.gems) this.game.addGems(reward.gems);

    player.dailyClaimable = false;

    this.game.audio.playSound('daily_claim');
    this.game.audio.playSound('reward');
    this.game.ui.showToast(`✅ Day ${player.dailyStreak} reward: ${reward.label}`, 'reward');
    this.game.save.save();
    this.buildCalendar();
  }

  // ── Build calendar DOM ────────────────────────────────────────────────────────
  buildCalendar() {
    const container = document.getElementById('daily-calendar');
    if (!container) return;
    container.innerHTML = '';

    const player  = this.game.player;
    const streak  = player.dailyStreak || 0;
    const canClaim = !!player.dailyClaimable;

    DAILY_REWARDS.forEach((r, i) => {
      const dayNum  = i + 1;
      const claimed = dayNum < streak || (dayNum === streak && !canClaim);
      const today   = dayNum === streak && canClaim;
      const future  = dayNum > streak;

      const cell = document.createElement('div');
      cell.className = `day-cell${claimed ? ' claimed' : ''}${today ? ' today' : ''}${future ? ' future' : ''}`;

      cell.innerHTML = `
        <div class="day-num">Day ${dayNum}</div>
        <div class="day-reward">${r.label}</div>
        <div class="day-status">${claimed ? '✅' : today ? '🎁' : '🔒'}</div>
      `;

      if (today) {
        cell.addEventListener('click', () => this.claimDaily());
        cell.title = 'Click to claim!';
      }

      container.appendChild(cell);
    });

    // Streak label
    const streakEl = document.getElementById('daily-streak');
    if (streakEl) streakEl.textContent = `🔥 Streak: ${streak} day${streak !== 1 ? 's' : ''}`;

    // Claim button visibility
    const claimBtn = document.getElementById('btn-claim-daily');
    if (claimBtn) {
      claimBtn.disabled    = !canClaim;
      claimBtn.textContent = canClaim ? '🎁 Claim Daily Reward' : '✅ Come Back Tomorrow';
    }

    this.buildWeeklyMissions();
  }

  // ── Weekly missions ───────────────────────────────────────────────────────────
  buildWeeklyMissions() {
    const container = document.getElementById('weekly-missions');
    if (!container) return;

    const player   = this.game.player;
    const missions = this._getWeeklyMissions();

    container.innerHTML = '';

    for (const m of missions) {
      const progress = Math.min(m.target, player[m.trackKey] || 0);
      const done     = progress >= m.target;
      const pct      = Math.round((progress / m.target) * 100);

      const row = document.createElement('div');
      row.className = `mission-row${done ? ' done' : ''}`;

      row.innerHTML = `
        <div class="mission-icon">${m.icon}</div>
        <div class="mission-text">
          <div class="mission-name">${m.name}</div>
          <div class="mission-bar-wrap">
            <div class="mission-bar-fill" style="width:${pct}%"></div>
          </div>
          <div class="mission-progress">${progress}/${m.target}</div>
        </div>
        <div class="mission-reward">${done ? '✅' : `💎 ${m.reward}`}</div>
      `;

      if (done && !player.weeklyMissionsClaimed?.[m.id]) {
        row.addEventListener('click', () => {
          if (!player.weeklyMissionsClaimed) player.weeklyMissionsClaimed = {};
          if (player.weeklyMissionsClaimed[m.id]) return;
          player.weeklyMissionsClaimed[m.id] = true;
          this.game.addGems(m.reward);
          this.game.ui.showToast(`✅ Mission complete: +${m.reward} Gems`, 'reward');
          this.game.save.markDirty();
          this.buildWeeklyMissions();
        });
        row.title = 'Click to collect!';
      }

      container.appendChild(row);
    }
  }

  _getWeeklyMissions() {
    // 3 fixed weekly missions (rotate by week number)
    const week = Math.floor(Date.now() / (7 * 86400000));
    const pool = [
      { id:'wm_kills',    name:'Kill 500 enemies',         icon:'⚔️', target:500,  trackKey:'totalKills',    reward:5 },
      { id:'wm_wave20',   name:'Reach Wave 20',            icon:'🌊', target:20,   trackKey:'bestAnyWave',   reward:4 },
      { id:'wm_towers30', name:'Place 30 towers',          icon:'🏗️',target:30,   trackKey:'towersPlaced',  reward:3 },
      { id:'wm_gold5000', name:'Earn 5,000 gold',          icon:'💰', target:5000, trackKey:'totalGoldEarned',reward:4 },
      { id:'wm_boss3',    name:'Defeat 3 bosses',          icon:'💀', target:3,    trackKey:'bossKills',     reward:6 },
      { id:'wm_upgrade10',name:'Buy 10 upgrades',          icon:'⬆️', target:10,   trackKey:'upgradesTotal', reward:4 },
    ];

    const idx = week % pool.length;
    return [
      pool[idx],
      pool[(idx + 1) % pool.length],
      pool[(idx + 2) % pool.length],
    ];
  }
}
