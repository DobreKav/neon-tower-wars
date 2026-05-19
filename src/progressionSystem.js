// === FILE: src/progressionSystem.js ===
// Retention-focused progression systems built on established psychology principles:
//
//  1. LOOT CHESTS  — Variable-ratio reinforcement (unpredictable rewards keep engagement high)
//                    Pity counter guarantees legendary every 40 chests (prevents frustration)
//  2. DAILY CHALLENGES — 3 rotating micro-goals with a 24-hour urgency timer (FOMO + completion loop)
//                        Triple-complete bonus: finishing all 3 awards an extra chest
//  3. BATTLE PASS  — 20-tier seasonal track. Visible "just 1 tier away!" near-progress exploits
//                    sunk-cost effect. Season countdown adds urgency.
//  4. STREAK SHIELD — Loss-aversion protection. Players earn a shield for 5-day streaks.
//                     Missing a day while shielded preserves streak — then the shield is consumed.
//  5. NEAR-MISS FEEDBACK — On defeat show "So close — you hit 92%!" to trigger one more attempt.
//  6. WIN-STREAK BONUS — Consecutive victories multiply gold earned (variable reward, escalating)
//  7. FIRST-RUN WELCOME — Double rewards for the first 5 waves (new player hook)

// ── Chest Definitions ─────────────────────────────────────────────────────────
const CHEST_TIERS = [
  { id:'common',    label:'Common Chest',    color:'#9ca3af', weight:60,
    gold:[100,300],  gems:[0,1],   shardChance:0   },
  { id:'rare',      label:'Rare Chest',      color:'#60a5fa', weight:25,
    gold:[300,700],  gems:[2,5],   shardChance:0   },
  { id:'epic',      label:'Epic Chest',      color:'#c084fc', weight:12,
    gold:[500,1500], gems:[5,15],  shardChance:0.3 },
  { id:'legendary', label:'Legendary Chest!',color:'#f59e0b', weight:3,
    gold:[1000,3000],gems:[15,30], shardChance:1.0 },
];
const PITY_THRESHOLD = 40; // forced legendary every N chests

// ── Daily Challenge Pool ──────────────────────────────────────────────────────
const CHALLENGE_POOL = [
  { id:'dc_kills50',   name:'Wipe out 50 enemies',          icon:'⚔️',  type:'kill',           target:50,   reward:{ gold:400 } },
  { id:'dc_kills100',  name:'Kill 100 enemies',             icon:'🗡️', type:'kill',           target:100,  reward:{ gold:750 } },
  { id:'dc_wave5',     name:'Survive to Wave 5',            icon:'🌊',  type:'wave_reached',   target:5,    reward:{ gold:350 } },
  { id:'dc_wave10',    name:'Reach Wave 10',                icon:'🌊',  type:'wave_reached',   target:10,   reward:{ gold:650 } },
  { id:'dc_wave15',    name:'Reach Wave 15',                icon:'🌊',  type:'wave_reached',   target:15,   reward:{ gold:1000 } },
  { id:'dc_gold1k',    name:'Earn 1,000 gold in one run',   icon:'💰',  type:'session_gold',   target:1000, reward:{ gold:500 } },
  { id:'dc_gold3k',    name:'Earn 3,000 gold in one run',   icon:'💰',  type:'session_gold',   target:3000, reward:{ gold:900 } },
  { id:'dc_towers10',  name:'Place 10 towers',              icon:'🏗️', type:'towers_placed',  target:10,   reward:{ gold:400 } },
  { id:'dc_nolife',    name:'Complete a wave with no lives lost', icon:'🛡️', type:'no_damage_wave', target:1, reward:{ gold:500, gems:1 } },
  { id:'dc_boss',      name:'Defeat a boss',                icon:'💀',  type:'boss_killed',    target:1,    reward:{ gold:800, gems:2 } },
  { id:'dc_upgrade5',  name:'Buy 5 upgrades',               icon:'⬆️', type:'upgrade_bought', target:5,    reward:{ gold:450 } },
  { id:'dc_ult',       name:'Fire your ultimate ability',   icon:'🔥',  type:'ultimates_fired',target:1,    reward:{ gold:300, gems:1 } },
  { id:'dc_crits20',   name:'Land 20 critical hits',        icon:'🎯',  type:'crit',           target:20,   reward:{ gold:450 } },
  { id:'dc_winstrike', name:'Win 2 games in a row',         icon:'🏆',  type:'win_streak',     target:2,    reward:{ gems:3 } },
  { id:'dc_economy',   name:"Don't spend gold for 3 waves", icon:'🏦',  type:'frugal_waves',   target:3,    reward:{ gold:600 } },
];

// ── Battle Pass Tiers (free track, 30-day season) ─────────────────────────────
const PASS_TIERS = [
  { tier:1,  sxpReq:100,   reward:{ gold:200 },            label:'200 Gold'               },
  { tier:2,  sxpReq:250,   reward:{ gold:300 },            label:'300 Gold'               },
  { tier:3,  sxpReq:450,   reward:{ gems:2 },              label:'2 Gems'                 },
  { tier:4,  sxpReq:700,   reward:{ gold:500 },            label:'500 Gold'               },
  { tier:5,  sxpReq:1000,  reward:{ gold:600, gems:2 },    label:'600 Gold + 2 Gems'      },
  { tier:6,  sxpReq:1400,  reward:{ gold:700 },            label:'700 Gold'               },
  { tier:7,  sxpReq:1900,  reward:{ gems:3 },              label:'3 Gems'                 },
  { tier:8,  sxpReq:2500,  reward:{ gold:800 },            label:'800 Gold'               },
  { tier:9,  sxpReq:3200,  reward:{ gold:1000, gems:2 },   label:'1,000 Gold + 2 Gems'    },
  { tier:10, sxpReq:4000,  reward:{ gold:500, gems:5, chest:1 }, label:'500G + 5💎 + 1 Chest ✨' },
  { tier:11, sxpReq:5000,  reward:{ gold:900 },            label:'900 Gold'               },
  { tier:12, sxpReq:6100,  reward:{ gems:4 },              label:'4 Gems'                 },
  { tier:13, sxpReq:7400,  reward:{ gold:1000 },           label:'1,000 Gold'             },
  { tier:14, sxpReq:8800,  reward:{ gold:1200, gems:3 },   label:'1,200 Gold + 3 Gems'    },
  { tier:15, sxpReq:10400, reward:{ gems:6, chest:1 },     label:'6 Gems + 1 Chest ✨'    },
  { tier:16, sxpReq:12200, reward:{ gold:1500 },           label:'1,500 Gold'             },
  { tier:17, sxpReq:14200, reward:{ gems:5 },              label:'5 Gems'                 },
  { tier:18, sxpReq:16400, reward:{ gold:2000 },           label:'2,000 Gold'             },
  { tier:19, sxpReq:18800, reward:{ gold:1000, gems:8 },   label:'1,000 Gold + 8 Gems'    },
  { tier:20, sxpReq:21500, reward:{ gold:3000, gems:15, chest:2 }, label:'⚡ 3,000G + 15💎 + 2 Chests ⚡' },
];

const SEASON_DURATION_MS = 30 * 86400000; // 30 days

// ── Win-streak multipliers ─────────────────────────────────────────────────────
const WIN_STREAK_BONUS = [0, 0, 0.1, 0.2, 0.3, 0.5, 0.5]; // index = streak count (capped at 6)

export class ProgressionSystem {
  constructor(game) {
    this.game = game;

    // Chest state
    this._pending            = 0;   // chests queued to open
    this._sinceLastLegendary = 0;   // pity counter

    // Daily challenge state
    this._challengeDay     = 0;     // floor(Date.now()/dayMs) when challenges were last set
    this._progress         = {};    // challengeId → count
    this._claimed          = {};    // challengeId → true
    this._toasted          = {};    // challengeId → true (toast shown guard)
    this._bonusClaimed     = false; // triple-complete bonus chest
    this._sessionGold      = 0;     // gold earned this run (session_gold challenge)
    this._frugalWaves      = 0;     // consecutive waves without spending (frugal_waves challenge)
    this._frugalSpent      = false; // spent gold this wave?

    // Battle pass state
    this._seasonStart      = 0;     // timestamp of season start
    this._sxp              = 0;     // accumulated season XP
    this._passClaimedTiers = {};    // tier → true

    // Win-streak bonus (persisted across sessions so defeat resets it)
    this._winStreak        = 0;

    // First-run welcome bonus (double rewards for first 5 waves)
    this._welcomeWaves     = 0;     // waves remaining in welcome bonus

    // Near-miss: best fraction reached this session per map
    this._bestFraction     = {};    // mapId → 0-1 fraction
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  init(saved = {}) {
    this._pending            = saved.pending            ?? 0;
    this._sinceLastLegendary = saved.sinceLastLegendary ?? 0;
    this._seasonStart        = saved.seasonStart        ?? Date.now();
    this._sxp                = saved.sxp                ?? 0;
    this._passClaimedTiers   = saved.passClaimedTiers   ?? {};
    this._winStreak          = saved.winStreak          ?? 0;
    this._welcomeWaves       = saved.welcomeWaves       ?? 5; // new players get 5 welcome waves

    // Refresh challenges if day changed
    this._refreshChallenges(saved);

    // Award a chest if brand-new player (hook + feel)
    if (!saved.seasonStart) {
      this._pending = 2;
      this.game.ui?.showToast('🎁 Welcome! 2 starter chests await you.', 'reward');
    }

    // Rotate season if expired
    if (Date.now() - this._seasonStart > SEASON_DURATION_MS) {
      this._startNewSeason();
    }
  }

  serialize() {
    return {
      pending:            this._pending,
      sinceLastLegendary: this._sinceLastLegendary,
      seasonStart:        this._seasonStart,
      sxp:                this._sxp,
      passClaimedTiers:   this._passClaimedTiers,
      winStreak:          this._winStreak,
      welcomeWaves:       this._welcomeWaves,
      challengeDay:       this._challengeDay,
      challengeProgress:  this._progress,
      challengeClaimed:   this._claimed,
      bonusClaimed:       this._bonusClaimed,
    };
  }

  // ── Track event (called from game.js at the same sites as achievements.check) ──
  track(type, value = 1) {
    // Session gold tracking
    if (type === 'session_gold') {
      this._sessionGold += value;
    }

    // Frugal-waves tracking (spending resets the counter)
    if (type === 'gold_spent') {
      this._frugalSpent = true;
    }

    // Win streak tracking
    if (type === 'win_streak_increment') {
      this._winStreak = value;
      this._updateChallengeProgress('win_streak', this._winStreak);
      return;
    }
    if (type === 'win_streak_reset') {
      this._winStreak = 0;
      return;
    }

    // Forward to challenge progress
    this._updateChallengeProgress(type, value);

    // Battle pass season XP per kill (small per-kill amount)
    if (type === 'kill') {
      this.addSeasonXP(1);
    }
  }

  // ── Run lifecycle hooks ───────────────────────────────────────────────────────
  onRunStart() {
    this._sessionGold  = 0;
    this._frugalWaves  = 0;
    this._frugalSpent  = false;
  }

  onWaveComplete(waveNumber) {
    // Frugal wave counter
    if (!this._frugalSpent) {
      this._frugalWaves++;
      this._updateChallengeProgress('frugal_waves', this._frugalWaves);
    }
    this._frugalSpent = false;

    // Wave-reached challenge (challenge tracks the high-water mark, so pass current wave)
    this._updateChallengeProgress('wave_reached', waveNumber);

    // Session gold challenge: sync current value
    this._updateChallengeProgress('session_gold', this._sessionGold);

    // Chest: earn 1 chest every 5 waves
    if (waveNumber % 5 === 0) {
      this._earnChest(`Wave ${waveNumber} milestone`);
    }

    // Battle pass XP
    this.addSeasonXP(80);

    // Welcome bonus: first 5 waves give double gold (applied by callers via welcomeMultiplier)
    if (this._welcomeWaves > 0) {
      this._welcomeWaves--;
      this.game.save.markDirty();
    }
  }

  onVictory() {
    this._winStreak++;
    this.track('win_streak_increment', this._winStreak);

    // Win-streak gold bonus
    const bonusFraction = WIN_STREAK_BONUS[Math.min(this._winStreak, WIN_STREAK_BONUS.length - 1)];
    if (bonusFraction > 0) {
      const bonusGold = Math.round(500 * bonusFraction);
      this.game.addGold(bonusGold);
      this.game.ui?.showToast(
        `🔥 Win Streak x${this._winStreak}! +${bonusGold} bonus gold!`, 'reward'
      );
    }

    // Victory chests
    this._earnChest('Victory!');
    this._earnChest('Victory bonus');

    // Battle pass XP
    this.addSeasonXP(400);

    this.game.save.markDirty();
  }

  onDefeat(waveReached, totalWaves) {
    this._winStreak = 0;

    // Near-miss feedback — pull the player back for one more attempt
    const fraction = totalWaves > 0 ? waveReached / totalWaves : 0;
    const mapId    = this.game.currentMapId;
    const prev     = this._bestFraction[mapId] || 0;

    const isPersonalBest = fraction > prev;
    if (isPersonalBest) {
      this._bestFraction[mapId] = fraction;
      this.game.save.markDirty();
    }

    if (fraction >= 0.75) {
      const pct     = Math.round(fraction * 100);
      const wavesLeft = totalWaves - waveReached;
      const extra   = isPersonalBest ? ' 🌟 New personal best!' : '';
      this.game.ui?.showToast(
        `😤 So close! ${pct}% done — only ${wavesLeft} waves left!${extra}`, 'info'
      );
    }

    this.game.save.markDirty();
  }

  // ── Welcome bonus multiplier ──────────────────────────────────────────────────
  // Returns 1 normally, 2 during the new-player welcome window.
  get welcomeMultiplier() {
    return this._welcomeWaves > 0 ? 2 : 1;
  }

  // ── Chest system ─────────────────────────────────────────────────────────────
  _earnChest(reason) {
    this._pending++;
    this.game.save.markDirty();
    this.updateChestBadge();
    this.game.ui?.showToast(`🎁 Chest earned! (${reason}) — Tap to open`, 'reward');
  }

  // Call this when the player taps "Open Chest"
  openNextChest() {
    if (this._pending <= 0) return null;

    this._pending--;
    this._sinceLastLegendary++;

    // Pity: if we've gone PITY_THRESHOLD chests without a legendary, force one
    const forceLegendary = this._sinceLastLegendary >= PITY_THRESHOLD;

    const tier = forceLegendary
      ? CHEST_TIERS.find(t => t.id === 'legendary')
      : this._rollChestTier();

    if (tier.id === 'legendary') this._sinceLastLegendary = 0;

    // Roll rewards within the tier's range
    const gold  = this._randInt(tier.gold[0], tier.gold[1]);
    const gems  = this._randInt(tier.gems[0], tier.gems[1]);
    const shard = Math.random() < tier.shardChance;

    this.game.addGold(gold);
    if (gems)  this.game.addGems(gems);

    // Season XP for opening a chest
    this.addSeasonXP(50);

    const result = { tier, gold, gems, shard };

    this.updateChestBadge();
    this.game.save.markDirty();

    // Show popup via UI
    this._showChestResultToast(result);

    return result;
  }

  _rollChestTier() {
    const roll   = Math.random() * 100;
    let   cumSum = 0;
    for (const tier of CHEST_TIERS) {
      cumSum += tier.weight;
      if (roll < cumSum) return tier;
    }
    return CHEST_TIERS[0]; // fallback
  }

  _showChestResultToast(result) {
    const { tier, gold, gems, shard } = result;
    let msg = `${tier.id === 'legendary' ? '🌟' : tier.id === 'epic' ? '💜' : tier.id === 'rare' ? '💙' : '📦'} `;
    msg += `${tier.label}: +${gold} Gold`;
    if (gems)  msg += `, +${gems} Gems`;
    if (shard) msg += ' + Skin Shard!';
    this.game.ui?.showToast(msg, 'reward');
  }

  updateChestBadge() {
    const badge = document.getElementById('chest-badge');
    if (badge) {
      badge.textContent = this._pending > 0 ? `${this._pending}` : '';
      badge.style.display = this._pending > 0 ? 'flex' : 'none';
    }
  }

  get pendingChests() { return this._pending; }

  // ── Battle Pass ───────────────────────────────────────────────────────────────
  addSeasonXP(amount) {
    this._sxp += amount;

    // Unlock newly reached tiers
    for (const tier of PASS_TIERS) {
      if (!this._passClaimedTiers[tier.tier] && this._sxp >= tier.sxpReq) {
        this._claimPassTier(tier);
      }
    }
  }

  _claimPassTier(tier) {
    if (this._passClaimedTiers[tier.tier]) return;
    this._passClaimedTiers[tier.tier] = true;

    const r = tier.reward;
    if (r.gold)  this.game.addGold(r.gold);
    if (r.gems)  this.game.addGems(r.gems);
    if (r.chest) {
      for (let i = 0; i < r.chest; i++) this._earnChest(`Pass Tier ${tier.tier}`);
    }

    this.game.ui?.showToast(`✨ Battle Pass Tier ${tier.tier}: ${tier.label}`, 'reward');
    this.game.audio?.playSound('level_up');
    this.game.save.markDirty();
  }

  getCurrentPassTier() {
    let highest = 0;
    for (const tier of PASS_TIERS) {
      if (this._sxp >= tier.sxpReq) highest = tier.tier;
      else break;
    }
    return highest;
  }

  getSeasonDaysLeft() {
    const elapsed = Date.now() - this._seasonStart;
    return Math.max(0, Math.ceil((SEASON_DURATION_MS - elapsed) / 86400000));
  }

  _startNewSeason() {
    this._seasonStart      = Date.now();
    this._sxp              = 0;
    this._passClaimedTiers = {};
    this.game.ui?.showToast('🎉 New season started! Battle pass reset.', 'info');
    this.game.save.markDirty();
  }

  // ── Daily Challenges ──────────────────────────────────────────────────────────
  _todayKey() {
    return Math.floor(Date.now() / 86400000);
  }

  _refreshChallenges(saved = {}) {
    const today = this._todayKey();

    if (saved.challengeDay === today) {
      // Same day — restore progress
      this._challengeDay  = today;
      this._progress      = saved.challengeProgress || {};
      this._claimed       = saved.challengeClaimed  || {};
      this._bonusClaimed  = saved.bonusClaimed      || false;
      this._toasted       = {};
    } else {
      // New day — pick fresh challenges (deterministic per date, same for all players)
      this._challengeDay  = today;
      this._progress      = {};
      this._claimed       = {};
      this._bonusClaimed  = false;
      this._toasted       = {};
    }
  }

  // Deterministically select 3 challenges for today based on date seed
  getTodayChallenges() {
    const seed = this._challengeDay;
    const pool = CHALLENGE_POOL;
    const picks = [];
    const used  = new Set();

    // Simple seeded selection: pick 3 unique indices
    let i = 0;
    while (picks.length < 3 && i < pool.length * 3) {
      const idx = (seed * 31 + i * 17) % pool.length;
      if (!used.has(idx)) {
        used.add(idx);
        picks.push(pool[idx]);
      }
      i++;
    }
    return picks;
  }

  _updateChallengeProgress(type, value) {
    const challenges = this.getTodayChallenges();

    for (const ch of challenges) {
      if (this._claimed[ch.id]) continue;
      if (ch.type !== type) continue;

      // For high-water-mark types (wave_reached, win_streak, session_gold, frugal_waves)
      // value IS the current total; for incremental types (kill, crit, etc.) it's delta
      const isHighWaterMark = ['wave_reached','win_streak','session_gold','frugal_waves'].includes(type);

      if (isHighWaterMark) {
        this._progress[ch.id] = Math.max(this._progress[ch.id] || 0, value);
      } else {
        this._progress[ch.id] = (this._progress[ch.id] || 0) + value;
      }

      // Auto-notify on completion (don't auto-claim — let player tap for reward feel)
      if (!this._claimed[ch.id] && this._progress[ch.id] >= ch.target && !this._toasted[ch.id]) {
        this._toasted[ch.id] = true;
        this.game.ui?.showToast(`✅ Challenge done: "${ch.name}" — Claim your reward!`, 'achievement');
        this.game.audio?.playSound('achievement');
      }
    }
  }

  claimChallenge(challengeId) {
    const ch = CHALLENGE_POOL.find(c => c.id === challengeId);
    if (!ch) return;
    if (this._claimed[challengeId]) {
      this.game.ui?.showToast('Already claimed!', 'info');
      return;
    }
    if ((this._progress[challengeId] || 0) < ch.target) {
      this.game.ui?.showToast('Challenge not completed yet.', 'info');
      return;
    }

    this._claimed[challengeId] = true;

    if (ch.reward.gold) this.game.addGold(ch.reward.gold);
    if (ch.reward.gems) this.game.addGems(ch.reward.gems);

    this.game.audio?.playSound('reward');
    this.game.save.markDirty();

    // Check triple-complete bonus
    this._checkTripleBonus();
    this.buildChallengeBoard();
  }

  _checkTripleBonus() {
    if (this._bonusClaimed) return;
    const challenges = this.getTodayChallenges();
    const allDone    = challenges.every(ch => this._claimed[ch.id]);
    if (!allDone) return;

    this._bonusClaimed = true;
    this._earnChest('Daily triple-complete bonus');
    this.addSeasonXP(200);
    this.game.ui?.showToast('🎊 All 3 challenges complete! Bonus chest + season XP!', 'reward');
  }

  challengeTimeUntilReset() {
    const nextDay = (this._todayKey() + 1) * 86400000;
    const ms      = nextDay - Date.now();
    const h       = Math.floor(ms / 3600000);
    const m       = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  }

  // ── Streak Shield ─────────────────────────────────────────────────────────────
  // Award a shield when the player hits a 5-day streak
  checkAwardShield(streak) {
    if (streak > 0 && streak % 5 === 0 && !this.game.player.streakShield) {
      this.game.player.streakShield = true;
      this.game.ui?.showToast('🛡️ Streak Shield earned! Your next missed day is protected.', 'reward');
      this.game.save.markDirty();
    }
  }

  // Returns true if the shield absorbed a broken streak (call from dailyRewards)
  tryUseStreakShield() {
    if (!this.game.player.streakShield) return false;
    this.game.player.streakShield = false;
    this.game.ui?.showToast('🛡️ Streak Shield activated — your streak is safe!', 'reward');
    this.game.save.markDirty();
    return true;
  }

  // ── DOM Builders ──────────────────────────────────────────────────────────────
  buildChallengeBoard() {
    const container = document.getElementById('challenge-board');
    if (!container) return;

    const challenges = this.getTodayChallenges();
    container.innerHTML = '';

    // Header with countdown timer
    const header = document.createElement('div');
    header.className = 'challenge-header';
    header.innerHTML = `
      <span class="challenge-title">⚡ Daily Challenges</span>
      <span class="challenge-timer">Resets in ${this.challengeTimeUntilReset()}</span>
    `;
    container.appendChild(header);

    for (const ch of challenges) {
      const progress  = Math.min(this._progress[ch.id] || 0, ch.target);
      const done      = progress >= ch.target;
      const claimed   = !!this._claimed[ch.id];
      const pct       = Math.round((progress / ch.target) * 100);

      const row = document.createElement('div');
      row.className = `challenge-row${claimed ? ' done' : done ? ' claimable' : ''}`;

      const rewardText = [
        ch.reward.gold ? `+${ch.reward.gold}💰` : '',
        ch.reward.gems ? `+${ch.reward.gems}💎` : '',
      ].filter(Boolean).join(' ');

      row.innerHTML = `
        <div class="ch-icon">${ch.icon}</div>
        <div class="ch-body">
          <div class="ch-name">${ch.name}</div>
          <div class="ch-bar-wrap">
            <div class="ch-bar-fill" style="width:${pct}%"></div>
          </div>
          <div class="ch-prog">${progress} / ${ch.target}</div>
        </div>
        <div class="ch-right">
          <div class="ch-reward">${rewardText}</div>
          <button class="ch-btn${done && !claimed ? ' pulse' : ''}" ${claimed || !done ? 'disabled' : ''}>
            ${claimed ? '✅' : done ? 'Claim!' : `${pct}%`}
          </button>
        </div>
      `;

      if (done && !claimed) {
        row.querySelector('.ch-btn').addEventListener('click', () => this.claimChallenge(ch.id));
      }

      container.appendChild(row);
    }

    // Triple-complete bonus row
    const allDone     = challenges.every(ch => (this._progress[ch.id] || 0) >= ch.target);
    const bonusRow    = document.createElement('div');
    bonusRow.className = `challenge-bonus-row${this._bonusClaimed ? ' done' : allDone ? ' claimable' : ''}`;
    bonusRow.innerHTML = `
      <span class="ch-icon">🎊</span>
      <span class="ch-bonus-label">Complete all 3 → Bonus Chest + 200 Season XP</span>
      <span class="ch-bonus-status">${this._bonusClaimed ? '✅ Claimed' : allDone ? '✨ Auto-awarded!' : '🔒'}</span>
    `;
    container.appendChild(bonusRow);
  }

  buildBattlePassTrack() {
    const container = document.getElementById('pass-track');
    if (!container) return;

    const daysLeft   = this.getSeasonDaysLeft();
    const tierNow    = this.getCurrentPassTier();
    const nextTier   = PASS_TIERS.find(t => !this._passClaimedTiers[t.tier]);
    const sxpToNext  = nextTier ? nextTier.sxpReq - this._sxp : 0;

    container.innerHTML = `
      <div class="pass-header">
        <span class="pass-title">🎖️ Battle Pass</span>
        <span class="pass-season">${daysLeft}d left in season</span>
      </div>
      <div class="pass-sxp">Season XP: ${this._sxp.toLocaleString()}${nextTier ? ` (${sxpToNext} to Tier ${nextTier.tier})` : ' — MAX TIER!'}</div>
    `;

    const track = document.createElement('div');
    track.className = 'pass-tiers';

    for (const tier of PASS_TIERS) {
      const claimed = !!this._passClaimedTiers[tier.tier];
      const reached = this._sxp >= tier.sxpReq;
      const isCur   = tier.tier === tierNow + 1;

      const cell = document.createElement('div');
      cell.className = `pass-tier${claimed ? ' claimed' : reached ? ' reached' : ''}${isCur ? ' current' : ''}`;

      cell.innerHTML = `
        <div class="pt-num">T${tier.tier}</div>
        <div class="pt-label">${tier.label}</div>
        <div class="pt-status">${claimed ? '✅' : reached ? '✨' : '🔒'}</div>
      `;

      track.appendChild(cell);
    }

    container.appendChild(track);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  _randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
