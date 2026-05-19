// === FILE: src/upgradeSystem.js ===
// Tower upgrades application, XP/level system, prestige, skill tree

export const SKILL_TREE = [
  { id:'global_damage',  name:'War Forged',    icon:'⚔️',  maxLevel:5, costPerLevel:1, desc:'All towers +5% damage',       effect:'global_damage' },
  { id:'gold_bonus',     name:'Treasure',      icon:'💰',  maxLevel:5, costPerLevel:1, desc:'Earn +10% gold per wave',      effect:'gold_bonus' },
  { id:'global_crit',    name:'Critical Mind', icon:'💥',  maxLevel:3, costPerLevel:1, desc:'All towers +3% crit chance',   effect:'global_crit' },
  { id:'global_range',   name:'Eagle Eye',     icon:'👁️', maxLevel:3, costPerLevel:2, desc:'All towers +8% range',         effect:'global_range' },
  { id:'xp_bonus',       name:'Scholar',       icon:'📚',  maxLevel:3, costPerLevel:1, desc:'Earn +10% XP',                 effect:'xp_bonus' },
  { id:'start_gold',     name:'Wealthy',       icon:'🏦',  maxLevel:3, costPerLevel:2, desc:'+100 starting gold',           effect:'start_gold' },
  { id:'enemy_slow',     name:'Mud Field',     icon:'🐢',  maxLevel:3, costPerLevel:2, desc:'All enemies -5% speed',        effect:'enemy_slow' },
  { id:'lives_bonus',    name:'Fortified',     icon:'🛡️', maxLevel:3, costPerLevel:2, desc:'+3 starting lives',            effect:'lives_bonus' },
  { id:'ult_cooldown',   name:'Haste',         icon:'⚡',  maxLevel:3, costPerLevel:2, desc:'Ultimates -8% cooldown',       effect:'ult_cooldown' },
  { id:'fire_rate',      name:'Overclocked',   icon:'🔧',  maxLevel:3, costPerLevel:2, desc:'All towers +5% fire rate',     effect:'fire_rate' },
  { id:'loot_chance',    name:'Lucky',         icon:'🍀',  maxLevel:3, costPerLevel:1, desc:'+5% loot drop chance',         effect:'loot_chance' },
  { id:'gem_bonus',      name:'Gemologist',    icon:'💎',  maxLevel:3, costPerLevel:2, desc:'+1 bonus gem per boss kill',   effect:'gem_bonus' },
];

export class UpgradeSystem {
  constructor(game) {
    this.game = game;
  }

  // ── Tower upgrades ────────────────────────────────────────────────────────────
  canBuyUpgrade(tower, upgradeIndex) {
    const def = this.game.towers.getDef(tower.type);
    if (!def || upgradeIndex >= def.upgrades.length) return false;
    const upg = def.upgrades[upgradeIndex];
    if (tower.upgradesBought.includes(upgradeIndex)) return false;
    return this.game.gold >= upg.cost;
  }

  buyUpgrade(tower, upgradeIndex) {
    const def = this.game.towers.getDef(tower.type);
    if (!def) return false;
    const upg = def.upgrades[upgradeIndex];
    if (!this.game.spendGold(upg.cost)) return false;

    tower.upgradesBought.push(upgradeIndex);
    tower.upgradeLevel = tower.upgradesBought.length;

    // Apply the stat change
    this._applyUpgrade(tower, upg);

    // Apply global skills
    this._applyGlobalSkills(tower);

    this.game.audio.playSound('upgrade');
    this.game.particles.hitSpark(tower.x, tower.y, '#fbbf24', 12);
    this.game.achievements.check('upgrade_bought', tower.upgradeLevel);
    this.game.player.upgradesTotal = (this.game.player.upgradesTotal || 0) + 1;
    this.game.save.markDirty();
    return true;
  }

  _applyUpgrade(tower, upg) {
    switch (upg.stat) {
      case 'damage':      tower.damage        = upg.value; break;
      case 'range':       tower.range         = upg.value; break;
      case 'fireRate':    tower.fireRate       = upg.value; break;
      case 'armorP':      tower.armorPierce   = upg.value; break;
      case 'aoe':         tower.aoeRange       = upg.value; break;
      case 'multi':       tower.multishot      = upg.value; break;
      case 'chainCount':  tower.chainCount     = upg.value; break;
      case 'critC':       tower.critChance     = upg.value; break;
      case 'pierce':      tower.pierceCount    = upg.value; break;
      case 'slowPct':     tower.slowPercent    = upg.value; break;
      case 'burnDps':     tower.burnDps        = upg.value; break;
      case 'poisonDps':   tower.poisonDps      = upg.value; break;
      case 'freezeDur':   tower.freezeDuration = upg.value; break;
      case 'stunDur':     tower.stunDuration   = upg.value; break;
      case 'pullStr':     tower.pullStrength   = upg.value; break;
      case 'coneAngle':   tower.coneAngle      = upg.value; break;
      case 'ultimate':    tower.ultReady       = false; tower.ultTimer = 0; break; // enable
    }
  }

  _applyGlobalSkills(tower) {
    const skills = this.game.player.skills;
    const def    = this.game.towers.getDef(tower.type);
    if (!def) return;

    // global damage bonus
    if (skills.global_damage) tower.damage = Math.round(tower.damage * (1 + skills.global_damage * 0.05));
    // global range bonus
    if (skills.global_range)  tower.range  = Math.round(tower.range  * (1 + skills.global_range  * 0.08));
    // global fire rate bonus
    if (skills.fire_rate)     tower.fireRate = tower.fireRate * (1 + skills.fire_rate * 0.05);
    // ult cooldown reduction
    if (skills.ult_cooldown)  tower.ultCooldown = tower.ultCooldown * (1 - skills.ult_cooldown * 0.08);
  }

  applyGlobalSkillsToAll() {
    for (const t of this.game.towers.towers) {
      this._applyGlobalSkills(t);
    }
  }

  // ── Skill Tree ────────────────────────────────────────────────────────────────
  canBuySkill(skillId) {
    const skill  = SKILL_TREE.find(s => s.id === skillId);
    if (!skill) return false;
    const current = this.game.player.skills[skillId] || 0;
    if (current >= skill.maxLevel) return false;
    return this.game.player.skillPoints >= skill.costPerLevel;
  }

  buySkill(skillId) {
    if (!this.canBuySkill(skillId)) return false;
    const skill   = SKILL_TREE.find(s => s.id === skillId);
    this.game.player.skillPoints -= skill.costPerLevel;
    this.game.player.skills[skillId] = (this.game.player.skills[skillId] || 0) + 1;
    this.game.audio.playSound('upgrade');
    this.applyGlobalSkillsToAll();
    this.game.save.save();
    return true;
  }

  // ── Prestige ─────────────────────────────────────────────────────────────────
  canPrestige() {
    return this.game.player.level >= 20;
  }

  prestige() {
    if (!this.canPrestige()) return;
    const p = this.game.player;
    p.prestige++;
    p.level       = 1;
    p.xp          = 0;
    p.xpToNext    = 500;
    p.skillPoints = 0;
    p.skills      = {};
    // Prestige bonus: permanent damage multiplier stored
    this.game.audio.playSound('achievement');
    this.game.ui.showToast(`Prestige ${p.prestige}! +${p.prestige * 2}% permanent damage`, 'reward');
    this.game.save.save();
  }

  getPrestigeBonus() {
    return 1 + (this.game.player.prestige || 0) * 0.02; // +2% per prestige
  }
}
