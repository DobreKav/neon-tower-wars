// === FILE: src/uiSystem.js ===
// All button wiring, HUD updates, screen transitions, tower panel, upgrade cards

import { TOWER_ORDER } from './towerManager.js';
import { SKILL_TREE }  from './upgradeSystem.js';
import { MAPS }        from './maps.js';

export class UISystem {
  constructor(game) {
    this.game               = game;
    this.selectedTowerInst  = null;  // tower instance currently open in panel
    this._toastTimers       = [];
  }

  // ── Init: wire all DOM buttons ────────────────────────────────────────────────
  init() {
    const g = this.game;

    // ── Main menu ──────────────────────────────────────────────────────────────
    this._btn('btn-play',         () => g.startMapSelect());
    this._btn('btn-daily',        () => this._showScreen('daily-screen'));
    this._btn('btn-achievements', () => this._showScreen('achievements-screen'));
    this._btn('btn-skins',        () => this._showScreen('skins-screen'));
    this._btn('btn-settings',     () => this._showScreen('settings-screen'));
    this._btn('btn-prestige',     () => this._showScreen('prestige-screen'));

    // ── Back buttons ──────────────────────────────────────────────────────────
    this._btn('btn-close-achievements', () => this._showScreen('main-menu'));
    this._btn('btn-close-daily',        () => this._showScreen('main-menu'));
    this._btn('btn-close-skins',        () => this._showScreen('main-menu'));
    this._btn('btn-close-settings',     () => this._showScreen('main-menu'));
    this._btn('btn-close-prestige',     () => this._showScreen('main-menu'));

    // ── Map select ────────────────────────────────────────────────────────────
    this._btn('btn-back-map', () => g.returnToMenu());
    this.buildMapSelect();

    // ── HUD in-game ───────────────────────────────────────────────────────────
    this._btn('btn-start-wave', () => g.startWave());
    this._btn('btn-pause',      () => g.pauseGame());
    this._btn('btn-speed',      () => { g.toggleSpeed(); this._refreshSpeedBtn(); });

    // ── Pause menu ────────────────────────────────────────────────────────────
    this._btn('btn-resume',     () => g.resumeGame());
    this._btn('btn-restart',    () => { g.resumeGame(); g.startGame(g.currentMapId); });
    this._btn('btn-menu',       () => g.returnToMenu());

    // ── Wave complete ─────────────────────────────────────────────────────────
    this._btn('btn-next-wave',       () => { this.showHUD(); g.resumeGame(); });
    this._btn('btn-double-reward',   () => g.ads.showDoubleWaveReward());

    // ── Defeat screen ─────────────────────────────────────────────────────────
    this._btn('btn-continue-ad',       () => g.ads.showContinueAfterDefeat());
    this._btn('btn-defeat-menu',       () => g.returnToMenu());
    this._btn('btn-main-from-defeat',  () => g.returnToMenu());
    this._btn('btn-retry',             () => { g.startGame(g.currentMapId); });

    // ── Victory screen ────────────────────────────────────────────────────────
    this._btn('btn-double-victory',    () => g.ads.showDailyBonus());
    this._btn('btn-victory-menu',      () => g.returnToMenu());
    this._btn('btn-main-from-victory', () => g.returnToMenu());
    this._btn('btn-endless',           () => g.startEndlessMode ? g.startEndlessMode() : g.returnToMenu());

    // ── Tower panel ───────────────────────────────────────────────────────────
    this._btn('btn-close-panel',     () => this.closeTowerPanel());
    this._btn('btn-sell',            () => {
      if (this.selectedTowerInst) {
        g.towers.sellTower(this.selectedTowerInst);
        this.closeTowerPanel();
      }
    });
    this._btn('btn-ultimate',        () => {
      if (this.selectedTowerInst) g.towers.fireUltimate(this.selectedTowerInst);
    });

    // ── Prestige ──────────────────────────────────────────────────────────────
    this._btn('btn-do-prestige', () => {
      if (g.upgrades.canPrestige()) {
        g.upgrades.prestige();
        this.buildPrestigeScreen();
      } else {
        this.showToast('Reach level 20 to prestige!', 'error');
      }
    });

    // ── Settings toggles ──────────────────────────────────────────────────────
    this._toggle('toggle-sfx',       v => { g.player.settings.sfx      = v; g.audio.setSFX(v); g.save.save(); });
    this._toggle('toggle-music',     v => { g.player.settings.music    = v; g.audio.setMusic(v); g.save.save(); });
    this._toggle('toggle-particles', v => { g.player.settings.particles= v; g.save.save(); });
    this._toggle('toggle-fps',       v => { g.player.settings.fps      = v; document.getElementById('fps-display').style.display = v ? 'block' : 'none'; g.save.save(); });
    this._toggle('toggle-haptic',    v => { g.player.settings.haptic   = v; g.save.save(); });

    // ── Achievement tabs ──────────────────────────────────────────────────────
    this._tabs('achievements-screen', '.tab-btn', (tab) => {
      g.achievements.buildAchievementList(tab);
    });

    // ── Skins tabs ────────────────────────────────────────────────────────────
    this._tabs('skins-screen', '.tab-btn', (tab) => {
      g.skins.buildSkinsGrid(tab);
    });

    // ── Daily claim ───────────────────────────────────────────────────────────
    this._btn('btn-claim-daily', () => g.daily.claimDaily());

    // ── Skill tree ────────────────────────────────────────────────────────────
    this.buildSkillTree();

    // ── Tower selector ────────────────────────────────────────────────────────
    this.buildTowerSelector();

    // ── Ads overlay dismiss ───────────────────────────────────────────────────
    this._btn('btn-skip-ad', () => g.ads._onAdClosed());
  }

  // ── Tower selector bar ────────────────────────────────────────────────────────
  buildTowerSelector() {
    const container = document.getElementById('tower-selector');
    if (!container) return;
    container.innerHTML = '';

    for (const type of TOWER_ORDER) {
      const def = this.game.towers.getDef(type);
      const btn = document.createElement('button');
      btn.className      = 'tower-btn';
      btn.dataset.type   = type;
      btn.title          = `${def.name} — ${def.cost}💰`;

      btn.innerHTML = `
        <span class="tb-icon">${def.icon}</span>
        <span class="tb-cost">${def.cost}</span>
      `;

      if (def.lockedUntil) {
        btn.classList.add('locked');
        btn.title = `Unlocks at wave ${def.lockedUntil}`;
      }

      btn.addEventListener('click', () => {
        if (btn.classList.contains('locked')) {
          this.showToast(`${def.name} unlocks at wave ${def.lockedUntil}`, 'info');
          return;
        }
        if (this.game.towers.selectedType === type) {
          this.game.towers.selectedType = null;
          btn.classList.remove('selected');
        } else {
          document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
          this.game.towers.selectedType = type;
          btn.classList.add('selected');
        }
      });

      container.appendChild(btn);
    }
  }

  refreshTowerSelector() {
    const waveNum = this.game.currentWave;
    document.querySelectorAll('.tower-btn').forEach(btn => {
      const type = btn.dataset.type;
      const def  = this.game.towers.getDef(type);
      const locked = !!def.lockedUntil && waveNum < def.lockedUntil;
      btn.classList.toggle('locked',    locked);
      btn.classList.toggle('cant-afford', !locked && this.game.gold < def.cost);
    });
  }

  // ── Map select screen ─────────────────────────────────────────────────────────
  buildMapSelect() {
    const grid = document.getElementById('map-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const maps   = MAPS;
    const player = this.game.player;

    maps.forEach((map, idx) => {
      const unlocked = player.unlockedMaps.includes(map.id);
      const card     = document.createElement('div');
      card.className = `map-card${unlocked ? '' : ' locked'}`;

      card.innerHTML = `
        <div class="map-preview" style="background: linear-gradient(135deg, ${map.bgColor} 0%, ${map.pathColor} 100%);">
          <span class="map-icon">${map.icon || '🗺️'}</span>
        </div>
        <div class="map-info">
          <h3>${map.name}</h3>
          <p>${map.waves} waves · ${map.lives} lives</p>
          ${unlocked ? `<p class="map-best">Best: Wave ${player.bestWave?.[map.id] || '—'}</p>` : '<p class="map-locked-label">🔒 Locked</p>'}
        </div>
      `;

      if (unlocked) {
        card.addEventListener('click', () => {
          this.game.audio.playSound('click');
          this.game.startGame(map.id);
        });
      }

      grid.appendChild(card);
    });
  }

  // ── Tower panel ───────────────────────────────────────────────────────────────
  openTowerPanel(tower) {
    this.selectedTowerInst = tower;
    const panel = document.getElementById('tower-panel');
    if (!panel) return;

    const def = this.game.towers.getDef(tower.type);

    // Header
    const titleEl = panel.querySelector('#panel-tower-name');
    if (titleEl) titleEl.textContent = `${tower.icon} ${tower.name}`;

    // Stats
    const statsEl = panel.querySelector('#panel-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="stat-row"><span>⚔️ Damage</span><span>${tower.damage}</span></div>
        <div class="stat-row"><span>🎯 Range</span><span>${tower.range}px</span></div>
        <div class="stat-row"><span>⚡ Rate</span><span>${tower.fireRate.toFixed(1)}/s</span></div>
        <div class="stat-row"><span>💥 Crit</span><span>${Math.round(tower.critChance * 100)}%</span></div>
        <div class="stat-row"><span>🔱 Kills</span><span>${tower.totalKills}</span></div>
        <div class="stat-row"><span>💰 DPS est.</span><span>${Math.round(tower.damage * tower.fireRate)}</span></div>
      `;
    }

    // Sell value
    const sellBtn = document.getElementById('btn-sell');
    if (sellBtn) {
      const baseCost = def.cost;
      const upgCost  = tower.upgradesBought.reduce((s, i) => s + def.upgrades[i].cost, 0);
      const sellVal  = Math.floor((baseCost + upgCost) * 0.75);
      sellBtn.textContent = `💰 Sell (${sellVal}g)`;
    }

    // Ultimate button
    const ultBtn = document.getElementById('btn-ultimate');
    if (ultBtn) {
      ultBtn.textContent = `⚡ ${def.ultimate.name}`;
      ultBtn.disabled    = !tower.ultReady;
      ultBtn.style.display = tower.upgradeLevel >= 5 ? 'block' : 'none';
    }

    // Targeting mode
    const targetEl = panel.querySelector('#panel-targeting');
    if (targetEl) {
      const modes = [
        { id: 'first',     label: '1st'      },
        { id: 'last',      label: 'Last'     },
        { id: 'strongest', label: 'Strong'   },
        { id: 'fastest',   label: 'Fast'     },
      ];
      targetEl.innerHTML = `<div class="targeting-label">Target:</div><div class="targeting-btns">${
        modes.map(m => `<button class="target-btn${tower.targetMode === m.id ? ' active' : ''}" data-mode="${m.id}">${m.label}</button>`).join('')
      }</div>`;
      targetEl.querySelectorAll('.target-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          tower.targetMode = btn.dataset.mode;
          targetEl.querySelectorAll('.target-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === tower.targetMode));
        });
      });
    }

    // Upgrade cards
    this._buildUpgradeCards(tower, def);

    panel.classList.remove('hidden');
    panel.classList.add('visible');
  }

  _buildUpgradeCards(tower, def) {
    const container = document.getElementById('panel-upgrades');
    if (!container) return;
    container.innerHTML = '';

    def.upgrades.forEach((upg, idx) => {
      const bought = tower.upgradesBought.includes(idx);
      const canAfford = this.game.gold >= upg.cost;

      const card = document.createElement('div');
      card.className = `upgrade-card${bought ? ' bought' : ''}${(!bought && !canAfford) ? ' cant-afford' : ''}`;

      card.innerHTML = `
        <div class="upg-name">${upg.name}</div>
        <div class="upg-desc">${upg.desc}</div>
        <div class="upg-cost">${bought ? '✅ Owned' : `💰 ${upg.cost}`}</div>
      `;

      if (!bought) {
        card.addEventListener('click', () => {
          this.game.audio.playSound('click');
          if (this.game.upgrades.buyUpgrade(tower, idx)) {
            this.openTowerPanel(tower); // refresh
            this.updateHUD();
          } else {
            this.showToast('Not enough gold!', 'error');
          }
        });
      }

      container.appendChild(card);
    });
  }

  closeTowerPanel() {
    this.selectedTowerInst = null;
    const panel = document.getElementById('tower-panel');
    if (panel) {
      panel.classList.remove('visible');
      panel.classList.add('hidden');
    }
    // Deselect tower type
    this.game.towers.selectedType = null;
    document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
  }

  // ── Wave complete ─────────────────────────────────────────────────────────────
  showWaveComplete(gold, gems, xp) {
    const el = document.getElementById('wc-rewards');
    if (el) {
      el.innerHTML = `
        <div class="reward-row">� <strong>${this.game.waveKills || 0}</strong> Kills</div>
        <div class="reward-row">�💰 <strong>+${gold}</strong> Gold</div>
        <div class="reward-row">💎 <strong>+${gems}</strong> Gems</div>
        <div class="reward-row">⭐ <strong>+${xp}</strong> XP</div>
      `;
    }

    // XP bar animation
    const player   = this.game.player;
    const fillEl   = document.getElementById('xp-fill');
    if (fillEl) {
      const pct = Math.min(100, Math.round((player.xp / player.xpToNext) * 100));
      fillEl.style.width = pct + '%';
    }
    const xpTextEl = document.getElementById('xp-bar-text');
    if (xpTextEl) xpTextEl.textContent = `${player.xp} / ${player.xpToNext}`;

    const waveLabel = document.getElementById('wc-wave-num');
    if (waveLabel) waveLabel.textContent = this.game.currentWave;

    this._showScreen('wave-complete');
  }

  // ── Defeat screen ─────────────────────────────────────────────────────────────
  showDefeat() {
    const el = document.getElementById('defeat-stats');
    if (el) {
      el.innerHTML = `
        <div class="stat-row">📍 Reached Wave <strong>${this.game.currentWave}</strong></div>
        <div class="stat-row">💀 Enemies Killed <strong>${this.game.player.totalKills || 0}</strong></div>
        <div class="stat-row">💰 Gold Earned <strong>${this.game.player.totalGoldEarned || 0}</strong></div>
        <div class="stat-row">⭐ Score <strong>${this.game.score || 0}</strong></div>
      `;
    }

    // Continue ad: only show if not too far past wave 1
    const continueAdBtn = document.getElementById('btn-continue-ad');
    if (continueAdBtn) {
      continueAdBtn.style.display = this.game.currentWave > 1 ? 'block' : 'none';
    }

    this._showScreen('defeat-screen');
  }

  // ── Victory screen ────────────────────────────────────────────────────────────
  showVictory(gold, gems) {
    const el = document.getElementById('victory-rewards');
    if (el) {
      el.innerHTML = `
        <div class="reward-row">🏆 Map Completed!</div>
        <div class="reward-row">💰 <strong>+${gold}</strong> Gold</div>
        <div class="reward-row">💎 <strong>+${gems}</strong> Gems</div>
      `;
    }
    this._showScreen('victory-screen');
  }

  // ── HUD updates ───────────────────────────────────────────────────────────────
  updateHUD() {
    const g = this.game;
    this._setText('hud-lives',    `❤️ ${g.lives}`);
    this._setText('hud-wave',     `Wave ${g.currentWave}/${g.totalWaves || 0}`);
    this._setText('hud-gold',     `💰 ${g.gold}`);
    this._setText('hud-gems-hud', `💎 ${g.player.gems}`);
    this._setText('hud-score',    `⭐ ${g.score || 0}`);

    // Start-wave button
    const startBtn = document.getElementById('btn-start-wave');
    if (startBtn) {
      startBtn.disabled     = g.waveActive;
      startBtn.textContent  = g.waveActive ? '⚔️ In Progress…' : `▶ Start Wave ${g.currentWave + 1}`;
    }

    // Refresh tower selector (afford highlights)
    this.refreshTowerSelector();

    // XP bar
    this.updateXPBar();
  }

  updateXPBar() {
    const player = this.game.player;
    const el     = document.getElementById('hud-xp-fill');
    if (el) {
      const pct = Math.min(100, Math.round((player.xp / player.xpToNext) * 100));
      el.style.width = pct + '%';
    }
    this._setText('hud-level', `Lv.${player.level}`);
  }

  updateMenuStats() {
    const p = this.game.player;
    this._setText('menu-level',  `${p.level}`);
    this._setText('menu-gems',   `${p.gems}`);
    const bestEntry = (p.bestWave && typeof p.bestWave === 'object' && Object.keys(p.bestWave).length > 0)
      ? Object.entries(p.bestWave).map(([k, v]) => `${k}: ${v}`).join('  ')
      : '—';
    this._setText('menu-best',   bestEntry);
    this._setText('menu-prestige', p.prestige > 0 ? `⚡ Prestige ${p.prestige}` : '');
  }

  updateFPS() {
    if (!this.game.player.settings.fps) return;
    const el = document.getElementById('fps-display');
    if (el) el.textContent = `${Math.round(this.game.engine?.fps ?? 0)} FPS`;
  }

  // ── Toast notifications ───────────────────────────────────────────────────────
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast       = document.createElement('div');
    toast.className   = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    // Slide in
    requestAnimationFrame(() => toast.classList.add('visible'));

    const timer = setTimeout(() => {
      toast.classList.remove('visible');
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 400);
    }, 2800);

    this._toastTimers.push(timer);
  }

  // ── Achievement popup ─────────────────────────────────────────────────────────
  showAchievementPopup(ach) {
    const el = document.getElementById('achievement-popup');
    if (!el) return;

    const nameEl = el.querySelector('.ach-popup-name');
    const descEl = el.querySelector('.ach-popup-desc');
    const iconEl = el.querySelector('.ach-popup-icon');
    if (nameEl) nameEl.textContent = ach.name;
    if (descEl) descEl.textContent = ach.desc;
    if (iconEl) iconEl.textContent = ach.icon;

    el.classList.remove('hidden');
    el.classList.add('visible');

    clearTimeout(this._achPopupTimer);
    this._achPopupTimer = setTimeout(() => {
      el.classList.remove('visible');
      el.classList.add('hidden');
    }, 3500);
  }

  // ── Combo display ─────────────────────────────────────────────────────────────
  showCombo(combo) {
    const el = document.getElementById('combo-display');
    if (!el) return;
    el.textContent = `${combo}x COMBO!`;
    el.classList.remove('hidden', 'pop');
    void el.offsetWidth; // reflow
    el.classList.add('visible', 'pop');
    clearTimeout(this._comboTimer);
    this._comboTimer = setTimeout(() => {
      el.classList.remove('visible', 'pop');
      el.classList.add('hidden');
    }, 1500);
  }

  // ── Boss bar ──────────────────────────────────────────────────────────────────
  showBossBar(boss) {
    const bar   = document.getElementById('boss-bar');
    const label = document.getElementById('boss-name');
    const fill  = document.getElementById('boss-hp-fill');
    if (!bar) return;
    if (label) label.textContent = boss.name || '⚠️ BOSS';
    if (fill)  fill.style.width  = '100%';
    bar.classList.remove('hidden');
  }

  updateBossBar(hp, maxHp) {
    const fill = document.getElementById('boss-hp-fill');
    if (fill) fill.style.width = Math.max(0, Math.round((hp / maxHp) * 100)) + '%';
  }

  hideBossBar() {
    const bar = document.getElementById('boss-bar');
    if (bar) bar.classList.add('hidden');
  }

  showBossPhase(label) {
    const el = document.getElementById('boss-phase');
    if (el) el.textContent = label;
  }

  hideDefeatScreen() {
    const el = document.getElementById('defeat-screen');
    if (el) el.classList.add('hidden');
  }

  setUltimateReady(ready) {
    const btn = document.getElementById('btn-ultimate');
    if (btn) btn.disabled = !ready;
  }

  // ── Prestige screen ───────────────────────────────────────────────────────────
  buildPrestigeScreen() {
    const el  = document.getElementById('prestige-info');
    if (!el) return;
    const g   = this.game;
    const can = g.upgrades.canPrestige();
    el.innerHTML = `
      <p>Current Prestige: <strong>${g.player.prestige}</strong></p>
      <p>Current Level: <strong>${g.player.level}</strong></p>
      <p class="${can ? 'text-green' : 'text-dim'}">
        ${can ? '✅ Ready to Prestige!' : `Reach Level 20 to Prestige (${g.player.level}/20)`}
      </p>
      <p>Each prestige grants <strong>+2% permanent damage</strong> to all towers.</p>
      <p>Current bonus: <strong>+${g.player.prestige * 2}%</strong></p>
    `;
    const btn = document.getElementById('btn-do-prestige');
    if (btn) btn.disabled = !can;
  }

  // ── Skill tree ────────────────────────────────────────────────────────────────
  buildSkillTree() {
    const container = document.getElementById('skill-tree');
    if (!container) return;
    container.innerHTML = '';

    for (const skill of SKILL_TREE) {
      const card    = document.createElement('div');
      card.className= 'skill-card';
      card.dataset.id = skill.id;

      card.innerHTML = `
        <div class="skill-icon">${skill.icon}</div>
        <div class="skill-name">${skill.name}</div>
        <div class="skill-desc">${skill.desc}</div>
        <div class="skill-level"><span class="skill-lv-cur">0</span>/${skill.maxLevel}</div>
        <button class="btn-skill-buy btn-secondary">Buy (${skill.costPerLevel} SP)</button>
      `;

      const buyBtn = card.querySelector('.btn-skill-buy');
      buyBtn.addEventListener('click', () => {
        this.game.audio.playSound('click');
        if (this.game.upgrades.buySkill(skill.id)) {
          this.refreshSkillTree();
          this.updateMenuStats();
        } else {
          this.showToast('Not enough skill points!', 'error');
        }
      });

      container.appendChild(card);
    }

    this.refreshSkillTree();
  }

  refreshSkillTree() {
    const player = this.game.player;
    document.querySelectorAll('.skill-card').forEach(card => {
      const id    = card.dataset.id;
      const skill = SKILL_TREE.find(s => s.id === id);
      if (!skill) return;
      const cur   = player.skills[id] || 0;
      const lvEl  = card.querySelector('.skill-lv-cur');
      if (lvEl) lvEl.textContent = cur;
      const btn   = card.querySelector('.btn-skill-buy');
      if (btn) {
        btn.disabled = cur >= skill.maxLevel || player.skillPoints < skill.costPerLevel;
        btn.textContent = cur >= skill.maxLevel ? '✅ Max' : `Buy (${skill.costPerLevel} SP)`;
      }
    });

    const spEl = document.getElementById('skill-points-available');
    if (spEl) spEl.textContent = `Skill Points: ${player.skillPoints}`;
  }

  // ── Screen management ─────────────────────────────────────────────────────────
  _showScreen(screenId) {
    this.game.audio.playSound('click');
    // Hide all top-level screens
    const screens = [
      'loading-screen','main-menu','map-select','hud',
      'pause-menu','wave-complete','defeat-screen','victory-screen',
      'achievements-screen','daily-screen','skins-screen',
      'settings-screen','prestige-screen',
    ];
    screens.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
    const target = document.getElementById(screenId);
    if (target) target.classList.remove('hidden');

    // Side-effects
    if (screenId === 'main-menu')      this.updateMenuStats();
    if (screenId === 'achievements-screen') this.game.achievements.buildAchievementList('combat');
    if (screenId === 'skins-screen') {
      this.game.skins.buildSkinsGrid('towers');
      const gemsEl = document.getElementById('skins-gems');
      if (gemsEl) gemsEl.textContent = this.game.player.gems;
    }
    if (screenId === 'daily-screen') { this.game.daily.buildCalendar(); this._buildChallengesUI(); }
    if (screenId === 'prestige-screen')this.buildPrestigeScreen();
    if (screenId === 'settings-screen')this._syncSettings();
  }

  showHUD() {
    const screens = [
      'loading-screen','main-menu','map-select',
      'pause-menu','wave-complete','defeat-screen','victory-screen',
      'achievements-screen','daily-screen','skins-screen',
      'settings-screen','prestige-screen',
    ];
    screens.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
    const hud = document.getElementById('hud');
    if (hud) hud.classList.remove('hidden');
    this.closeTowerPanel();
    this.updateHUD();
  }

  _hideScreen(screenId) {
    const el = document.getElementById(screenId);
    if (el) el.classList.add('hidden');
  }

  _showMapSelect() {
    this.buildMapSelect();
    this._showScreen('map-select');
  }

  // ── Settings sync ─────────────────────────────────────────────────────────────
  _syncSettings() {
    const s = this.game.player.settings;
    this._setToggle('toggle-sfx',       s.sfx);
    this._setToggle('toggle-music',     s.music);
    this._setToggle('toggle-particles', s.particles);
    this._setToggle('toggle-fps',       s.fps);
    this._setToggle('toggle-haptic',    s.haptic);
  }

  _setToggle(id, val) {
    const el = document.getElementById(id);
    if (el) el.checked = !!val;
  }

  // ── Speed button ─────────────────────────────────────────────────────────────
  _refreshSpeedBtn() {
    const btn = document.getElementById('btn-speed');
    if (!btn) return;
    if (this.game.speed >= 3) btn.textContent = '⏩ 3×';
    else if (this.game.speed >= 2) btn.textContent = '⏩ 2×';
    else btn.textContent = '▶ 1×';
  }

  // ── Wave announcement ─────────────────────────────────────────────────────────
  showWaveAnnouncement(waveNum) {
    const el = document.getElementById('wave-announce');
    if (!el) return;
    el.textContent = `WAVE ${waveNum}`;
    el.classList.remove('hidden', 'wave-announce-hide');
    el.classList.add('wave-announce-show');
    setTimeout(() => {
      el.classList.remove('wave-announce-show');
      el.classList.add('wave-announce-hide');
      setTimeout(() => {
        el.classList.add('hidden');
        el.classList.remove('wave-announce-hide');
      }, 500);
    }, 1400);
  }

  // ── DOM helpers ───────────────────────────────────────────────────────────────
  _btn(id, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', handler);
  }

  _toggle(id, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', e => handler(e.target.checked));
  }

  _tabs(screenId, selector, handler) {
    const screen = document.getElementById(screenId);
    if (!screen) return;
    screen.querySelectorAll(selector).forEach(btn => {
      btn.addEventListener('click', () => {
        screen.querySelectorAll(selector).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        handler(btn.dataset.tab);
      });
    });
  }

  _setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // ── Screen transitions (called by Game state machine) ────────────────────────────
  showMenu() {
    const loadEl = document.getElementById('loading-screen');
    if (loadEl) { loadEl.classList.remove('active'); loadEl.classList.add('hidden'); }
    const menu = document.getElementById('main-menu');
    if (menu) { menu.classList.remove('hidden'); menu.classList.add('active'); }
    this.updateMenuStats();
  }

  showMapSelect() {
    const menu = document.getElementById('main-menu');
    if (menu) { menu.classList.remove('active'); menu.classList.add('hidden'); }
    const ms = document.getElementById('map-select');
    if (ms) { ms.classList.remove('hidden'); ms.classList.add('active'); }
    this.buildMapSelect();
  }

  showGame() {
    ['map-select','main-menu','defeat-screen','victory-screen','wave-complete','pause-menu'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.classList.add('hidden'); el.classList.remove('active'); }
    });
    const hud = document.getElementById('hud');
    if (hud) hud.classList.remove('hidden');
    this.buildTowerSelector();
    this.updateHUD();
  }

  returnToMenu() {
    ['hud', 'wave-complete', 'defeat-screen', 'victory-screen', 'pause-menu', 'boss-bar'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
    this.closeTowerPanel();
    const menu = document.getElementById('main-menu');
    if (menu) { menu.classList.remove('hidden'); menu.classList.add('active'); }
    this.updateMenuStats();
  }

  pause() {
    const el = document.getElementById('pause-menu');
    if (el) el.classList.remove('hidden');
  }

  resume() {
    const el = document.getElementById('pause-menu');
    if (el) el.classList.add('hidden');
  }

  setWaveButton(active, wave) {
    const btn = document.getElementById('btn-start-wave');
    if (!btn) return;
    if (active) {
      btn.textContent = 'WAVE ' + wave;
      btn.classList.add('wave-active');
    } else {
      btn.textContent = 'START WAVE';
      btn.classList.remove('wave-active');
    }
  }

  hideCombo() {
    const el = document.getElementById('combo-display');
    if (el) { el.classList.remove('visible', 'pop'); el.classList.add('hidden'); }
  }

  // ── Daily challenges UI ───────────────────────────────────────────────────────
  _buildChallengesUI() {
    const container = document.getElementById('daily-challenges');
    if (!container || !this.game.progression) return;
    const challenges = this.game.progression.getTodayChallenges();
    if (!challenges || !challenges.length) return;
    const player = this.game.progression;
    container.innerHTML = `<h3 class="challenges-title">🎯 Daily Challenges</h3>`;
    challenges.forEach(ch => {
      const progress = player.getChallengeProgress(ch) || 0;
      const pct = Math.min(100, Math.round((progress / ch.target) * 100));
      const done = progress >= ch.target;
      container.innerHTML += `
        <div class="challenge-row${done ? ' done' : ''}">
          <div class="ch-info">
            <span class="ch-name">${ch.name}</span>
            <span class="ch-reward">+${ch.reward.gems || 0}💎 +${ch.reward.gold || 0}💰</span>
          </div>
          <div class="ch-bar-bg"><div class="ch-bar-fill" style="width:${pct}%"></div></div>
          <div class="ch-progress">${done ? '✅ Done' : `${progress}/${ch.target}`}</div>
        </div>
      `;
    });
  }
}
