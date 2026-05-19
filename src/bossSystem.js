// === FILE: src/bossSystem.js ===
// Boss phase transitions, DOM boss-bar management, cinematic sequences

export class BossSystem {
  constructor(game) {
    this.game        = game;
    this.activeBoss  = null;
    this._phaseTimer = 0;
    this._announced  = false;
  }

  reset() {
    this.activeBoss  = null;
    this._announced  = false;
    this.game.ui.hideBossBar();
  }

  // Called by enemyManager when a boss spawns
  onBossSpawn(boss) {
    this.activeBoss = boss;
    this._announced = false;

    // Boss roar + screen flash
    this.game.audio.playSound('boss_roar');
    this.game.effects.screenShake(8, 0.8);
    this.game.effects.screenFlash('#ff0000', 0.4);
    this.game.audio.vibrate([200, 100, 200]);

    // Show boss bar
    this.game.ui.showBossBar(boss);

    // Announce
    this.game.ui.showToast(`⚠️ BOSS: ${boss.name || 'Unknown Entity'}`, 'boss');
    setTimeout(() => this.game.audio.playSound('boss_hit'), 500);
  }

  // Called every frame while boss is alive
  update(dt) {
    if (!this.activeBoss || this.activeBoss.deathAnim) {
      if (this.activeBoss) {
        this.game.ui.hideBossBar();
        this.activeBoss = null;
      }
      return;
    }

    const boss = this.activeBoss;

    // Update boss HP bar
    this.game.ui.updateBossBar(boss.hp, boss.maxHp);

    // Phase check
    const hpPct = boss.hp / boss.maxHp;
    if (boss.phases && boss.phases.length > 0) {
      for (const phase of boss.phases) {
        if (!phase._triggered && hpPct <= phase.threshold) {
          phase._triggered = true;
          this._triggerPhase(boss, phase);
        }
      }
    }
  }

  // Called by enemyManager when boss crosses a phase HP threshold (numeric phases)
  onPhaseChange(boss, phaseNum) {
    this.game.audio.playSound('boss_roar');
    this.game.effects.screenShake(6, 0.6);
    this.game.effects.screenFlash('#ff6600', 0.35);
    this.game.ui.showToast(`⚡ BOSS PHASE ${phaseNum + 1}!`, 'boss');
    boss.speed = (boss.speed || 1) * 1.2;
    boss.color = phaseNum === 1 ? '#ff4444' : '#ff0000';
    this.game.ui.showBossPhase?.(`Phase ${phaseNum + 1}`);
  }

  _triggerPhase(boss, phase) {
    this.game.audio.playSound('boss_roar');
    this.game.effects.screenShake(6, 0.6);
    this.game.effects.screenFlash(phase.flashColor || '#ff6600', 0.35);
    this.game.ui.showToast(`⚡ Phase ${phase.id}: ${phase.label}`, 'boss');

    switch (phase.type) {
      case 'speed_boost':
        boss.speed *= 1.5;
        boss.color  = phase.color || '#ff4444';
        break;

      case 'spawn_minions':
        this._spawnMinions(boss, phase.count || 4);
        break;

      case 'shield':
        boss.shield    = Math.round(boss.maxHp * 0.15);
        boss.maxShield = boss.shield;
        break;

      case 'regen':
        boss.regenRate = phase.regenRate || 50;
        boss.color     = phase.color || '#44ff88';
        break;

      case 'berserk':
        boss.speed  *= 1.8;
        boss.color   = '#ff0000';
        this.game.effects.screenFlash('#ff0000', 0.5);
        this.game.effects.screenShake(10, 1.0);
        break;
    }

    // Update boss-bar phase label
    this.game.ui.showBossPhase(phase.label || `Phase ${phase.id}`);
  }

  _spawnMinions(boss, count) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        // Spawn scout minions near boss position
        this.game.waves._spawnEnemy('scout', this.game.currentWave);
      }, i * 300);
    }
    this.game.ui.showToast(`Boss spawned ${count} minions!`, 'warn');
  }

  // Called by enemyManager._killEnemy when boss dies
  onBossDeath(boss) {
    this.game.audio.playSound('boss_death');
    this.game.effects.screenShake(12, 1.2);
    this.game.effects.screenFlash('#ffffff', 0.6);
    this.game.audio.vibrate([300, 100, 300, 100, 500]);

    // Big explosion particles
    this.game.particles.bossExplosion(boss.x, boss.y);

    // Gem reward
    const gemBonus = 1 + (this.game.player.skills.gem_bonus || 0);
    const gems     = Math.round(3 * gemBonus);
    this.game.addGems(gems);
    this.game.particles.rewardNumber(boss.x, boss.y - 30, `+${gems}💎`, '#a855f7');
    this.game.ui.showToast(`Boss defeated! +${gems} Gems!`, 'reward');

    // Update boss-bar
    this.game.ui.hideBossBar();
    this.activeBoss = null;

    // Achievement
    this.game.achievements.check('boss_killed', 1);
  }
}
