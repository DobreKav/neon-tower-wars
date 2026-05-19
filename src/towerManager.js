// === FILE: src/towerManager.js ===
// All 12 tower types, targeting, projectiles (object-pooled), ultimate abilities

const TARGET = { FIRST: 'first', LAST: 'last', STRONGEST: 'strongest', FASTEST: 'fastest' };

// ── Tower definitions ─────────────────────────────────────────────────────────
const TOWER_DEFS = {
  archer: {
    name:'Archer', icon:'🏹', cost:100, damage:22, range:160, fireRate:1.5,
    critChance:0.10, critMult:2.0, color:'#92400e', accent:'#fbbf24',
    projectile:'arrow', targetMode:TARGET.FIRST,
    upgrades:[
      { name:'Swift Quiver',    cost:80,  stat:'fireRate', value:2.2,   desc:'Attack speed +46%',  effect:'fireRate = 2.2' },
      { name:'Piercing Tips',   cost:80,  stat:'armorP',   value:0.3,   desc:'Pierce 30% armor',   effect:'armorPierce = 0.3' },
      { name:'Multishot',       cost:200, stat:'multi',    value:3,     desc:'Fire 3 arrows',       effect:'multishot = 3' },
      { name:'Eagle Eye',       cost:200, stat:'range',    value:230,   desc:'Range +44%',          effect:'range = 230' },
      { name:'God Archer',      cost:500, stat:'damage',   value:120,   desc:'Damage ×5',           effect:'damage = 120' },
      { name:'Gaia Storm',      cost:500, stat:'ultimate', value:true,  desc:'Ultimate unlocked',   effect:'ultReady = true' },
    ],
    ultimate:{ name:'Rain of Arrows', cooldown:30, desc:'60 arrows rain down on all enemies' },
    soundId: 'arrow_shot',
  },
  laser: {
    name:'Laser', icon:'🔴', cost:150, damage:18, range:180, fireRate:3.0,
    critChance:0.05, critMult:1.5, color:'#7f1d1d', accent:'#f87171',
    projectile:'laser', targetMode:TARGET.FIRST,
    upgrades:[
      { name:'Focused Beam',  cost:100, stat:'damage',  value:30,  desc:'Damage +67%', effect:'damage = 30' },
      { name:'Long Lens',     cost:100, stat:'range',   value:240, desc:'Range +33%',  effect:'range = 240' },
      { name:'Armor Pierce',  cost:220, stat:'armorP',  value:1.0, desc:'Ignores all armor', effect:'armorPierce = 1.0' },
      { name:'Rapid Fire',    cost:220, stat:'fireRate',value:5.0, desc:'Fire rate +67%', effect:'fireRate = 5.0' },
      { name:'Death Ray',     cost:550, stat:'damage',  value:100, desc:'Massive damage', effect:'damage = 100' },
      { name:'Supernova',     cost:550, stat:'ultimate',value:true,desc:'Ultimate unlocked', effect:'ultReady = true' },
    ],
    ultimate:{ name:'Supernova Beam', cooldown:25, desc:'Continuous piercing beam sweeps 360°' },
    soundId: 'laser_shot',
  },
  ice: {
    name:'Ice Tower', icon:'❄️', cost:130, damage:12, range:150, fireRate:1.0,
    critChance:0.05, critMult:1.5, color:'#0c4a6e', accent:'#38bdf8',
    projectile:'orb', targetMode:TARGET.FIRST,
    upgrades:[
      { name:'Deep Freeze',   cost:90,  stat:'freezeDur', value:2.5, desc:'Freeze duration ×2.5', effect:'freezeDuration = 2.5' },
      { name:'Cryo Burst',    cost:90,  stat:'aoe',       value:50,  desc:'AoE splash freeze',    effect:'aoeRange = 50' },
      { name:'Blizzard',      cost:200, stat:'damage',    value:35,  desc:'Damage +192%',         effect:'damage = 35' },
      { name:'Arctic Zone',   cost:200, stat:'range',     value:200, desc:'Range +33%',           effect:'range = 200' },
      { name:'Permafrost',    cost:500, stat:'freezeDur', value:5.0, desc:'Permafrost effect',    effect:'freezeDuration = 5.0' },
      { name:'Absolute Zero', cost:500, stat:'ultimate',  value:true,desc:'Ultimate unlocked',    effect:'ultReady = true' },
    ],
    ultimate:{ name:'Absolute Zero', cooldown:40, desc:'Freezes ALL enemies for 4 seconds' },
    soundId: 'ice_shot',
  },
  poison: {
    name:'Poison Tower', icon:'☠️', cost:120, damage:5, range:140, fireRate:0.8,
    critChance:0.08, critMult:1.8, color:'#14532d', accent:'#4ade80',
    projectile:'cloud', targetMode:TARGET.STRONGEST,
    upgrades:[
      { name:'Virulent',      cost:80,  stat:'poisonDps', value:20, desc:'Poison DPS +100%',  effect:'poisonDps = 20' },
      { name:'Lingering',     cost:80,  stat:'poisonDur', value:6,  desc:'Duration ×3',       effect:'poisonDuration = 6' },
      { name:'Plague Cloud',  cost:200, stat:'aoe',       value:60, desc:'Large AoE cloud',   effect:'aoeRange = 60' },
      { name:'Corrosion',     cost:200, stat:'armorP',    value:0.5,desc:'Reduce armor 50%',  effect:'armorPierce = 0.5' },
      { name:'Death Cloud',   cost:500, stat:'poisonDps', value:60, desc:'Massive poison DPS',effect:'poisonDps = 60' },
      { name:'Pandemic',      cost:500, stat:'ultimate',  value:true,desc:'Ultimate unlocked', effect:'ultReady = true' },
    ],
    ultimate:{ name:'Pandemic', cooldown:35, desc:'Spreads lethal poison to all enemies on map' },
    soundId: 'poison_shot',
  },
  tesla: {
    name:'Tesla Tower', icon:'⚡', cost:180, damage:35, range:170, fireRate:1.2,
    critChance:0.15, critMult:2.5, color:'#312e81', accent:'#818cf8',
    projectile:'lightning', targetMode:TARGET.FIRST,
    upgrades:[
      { name:'Chain',         cost:110, stat:'chainCount', value:4,   desc:'Chain 4 enemies',    effect:'chainCount = 4' },
      { name:'Overload',      cost:110, stat:'damage',     value:60,  desc:'Damage +71%',        effect:'damage = 60' },
      { name:'Stun',          cost:250, stat:'stunDur',    value:1.5, desc:'Stuns enemies 1.5s', effect:'stunDuration = 1.5' },
      { name:'Surge',         cost:250, stat:'range',      value:220, desc:'Range +29%',         effect:'range = 220' },
      { name:'Thunderstorm',  cost:600, stat:'damage',     value:160, desc:'Massive damage',     effect:'damage = 160' },
      { name:'Apocalypse',    cost:600, stat:'ultimate',   value:true,desc:'Ultimate unlocked',  effect:'ultReady = true' },
    ],
    ultimate:{ name:'Thunder Apocalypse', cooldown:35, desc:'Massive lightning storm hits all enemies' },
    soundId: 'tesla_shot',
  },
  rocket: {
    name:'Rocket Launcher', icon:'🚀', cost:220, damage:80, range:200, fireRate:0.5,
    critChance:0.12, critMult:2.2, color:'#7c2d12', accent:'#fb923c',
    projectile:'rocket', targetMode:TARGET.STRONGEST,
    upgrades:[
      { name:'Bigger Warhead', cost:130, stat:'aoe',    value:70,  desc:'Splash radius +40%',  effect:'aoeRange = 70' },
      { name:'Overclock',      cost:130, stat:'fireRate',value:0.8, desc:'Fire rate +60%',      effect:'fireRate = 0.8' },
      { name:'Napalm',         cost:280, stat:'burn',   value:true,desc:'Rockets leave fire',   effect:'leaveFire = true' },
      { name:'Armor Pierce',   cost:280, stat:'armorP', value:0.5, desc:'Pierce 50% armor',    effect:'armorPierce = 0.5' },
      { name:'Mega Bomb',      cost:700, stat:'damage', value:400, desc:'Devastating damage',  effect:'damage = 400' },
      { name:'Nuke',           cost:700, stat:'ultimate',value:true,desc:'Ultimate unlocked',  effect:'ultReady = true' },
    ],
    ultimate:{ name:'Nuclear Strike', cooldown:50, desc:'Massive nuke with 3-second screen-wide blast' },
    soundId: 'rocket_shot',
  },
  flamethrower: {
    name:'Flamethrower', icon:'🔥', cost:160, damage:8, range:130, fireRate:5.0,
    critChance:0.06, critMult:1.8, color:'#7c2d12', accent:'#f97316',
    projectile:'flame', targetMode:TARGET.FIRST,
    upgrades:[
      { name:'Incendiary',  cost:100, stat:'burnDps',   value:25,  desc:'Burn DPS +150%',       effect:'burnDps = 25' },
      { name:'Wide Nozzle', cost:100, stat:'coneAngle', value:60,  desc:'Cone width +50%',      effect:'coneAngle = 60' },
      { name:'Napalm Mix',  cost:230, stat:'burnDur',   value:5,   desc:'Burn duration ×2',     effect:'burnDuration = 5' },
      { name:'Hellfire',    cost:230, stat:'damage',    value:25,  desc:'Damage ×3',            effect:'damage = 25' },
      { name:'Inferno',     cost:580, stat:'damage',    value:60,  desc:'Massive damage',       effect:'damage = 60' },
      { name:'Ragnarok',    cost:580, stat:'ultimate',  value:true,desc:'Ultimate unlocked',    effect:'ultReady = true' },
    ],
    ultimate:{ name:'Ragnarok Fire', cooldown:45, desc:'Ring of fire circles the entire map' },
    soundId: 'flame_shot',
  },
  sniper: {
    name:'Sniper', icon:'🎯', cost:200, damage:150, range:320, fireRate:0.4,
    critChance:0.25, critMult:4.0, color:'#1e3a5f', accent:'#60a5fa',
    projectile:'bullet', targetMode:TARGET.STRONGEST,
    upgrades:[
      { name:'Extended Barrel',cost:120, stat:'range',  value:420,  desc:'Range +31%',          effect:'range = 420' },
      { name:'Hollow Point',   cost:120, stat:'armorP', value:0.8,  desc:'Pierce 80% armor',    effect:'armorPierce = 0.8' },
      { name:'Critical Eye',   cost:260, stat:'critC',  value:0.45, desc:'Crit chance ×1.8',    effect:'critChance = 0.45' },
      { name:'Rapid Reload',   cost:260, stat:'fireRate',value:0.7, desc:'Fire rate +75%',      effect:'fireRate = 0.7' },
      { name:'One Shot',       cost:650, stat:'damage', value:600,  desc:'Devastating damage',  effect:'damage = 600' },
      { name:'Headshot',       cost:650, stat:'ultimate',value:true,desc:'Ultimate unlocked',   effect:'ultReady = true' },
    ],
    ultimate:{ name:'Orbital Strike', cooldown:40, desc:'Snipes ALL enemies simultaneously with max damage' },
    soundId: 'sniper_shot',
  },
  minigun: {
    name:'Minigun', icon:'💥', cost:190, damage:12, range:155, fireRate:8.0,
    critChance:0.08, critMult:1.8, color:'#374151', accent:'#9ca3af',
    projectile:'bullet', targetMode:TARGET.FIRST,
    upgrades:[
      { name:'Spin Up',        cost:110, stat:'fireRate', value:12.0, desc:'Rate ×1.5',         effect:'fireRate = 12.0' },
      { name:'Tracer Rounds',  cost:110, stat:'damage',   value:20,   desc:'Damage +67%',       effect:'damage = 20' },
      { name:'Suppression',    cost:250, stat:'slowPct',  value:0.3,  desc:'30% slow on hit',   effect:'slowPercent = 0.3' },
      { name:'Incendiary',     cost:250, stat:'burnDps',  value:10,   desc:'Burn on hit',       effect:'burnOnHit = 10' },
      { name:'Minigun Pro',    cost:620, stat:'damage',   value:60,   desc:'Massive damage',    effect:'damage = 60' },
      { name:'Death Blossom',  cost:620, stat:'ultimate', value:true, desc:'Ultimate unlocked', effect:'ultReady = true' },
    ],
    ultimate:{ name:'Death Blossom', cooldown:30, desc:'360° high-speed suppressive fire for 3 seconds' },
    soundId: 'minigun_shot',
  },
  gravity: {
    name:'Gravity Well', icon:'🌀', cost:250, damage:20, range:190, fireRate:0.8,
    critChance:0.08, critMult:2.0, color:'#4c1d95', accent:'#a78bfa',
    projectile:'orb', targetMode:TARGET.FIRST,
    upgrades:[
      { name:'Stronger Pull',  cost:140, stat:'pullStr',  value:2.0, desc:'Pull force ×2',     effect:'pullStrength = 2.0' },
      { name:'Wide Field',     cost:140, stat:'range',    value:250, desc:'Range +32%',         effect:'range = 250' },
      { name:'Singularity',    cost:300, stat:'aoe',      value:80,  desc:'Large AoE pull',     effect:'aoeRange = 80' },
      { name:'Time Warp',      cost:300, stat:'slowPct',  value:0.6, desc:'60% slow in field',  effect:'slowPercent = 0.6' },
      { name:'Black Hole',     cost:750, stat:'damage',   value:120, desc:'Massive gravity dmg',effect:'damage = 120' },
      { name:'Event Horizon',  cost:750, stat:'ultimate', value:true,desc:'Ultimate unlocked',  effect:'ultReady = true' },
    ],
    ultimate:{ name:'Event Horizon', cooldown:45, desc:'Black hole draws ALL enemies to center, crushing them' },
    soundId: 'gravity_shot',
  },
  plasma: {
    name:'Plasma Cannon', icon:'🔮', cost:280, damage:90, range:200, fireRate:0.7,
    critChance:0.18, critMult:3.0, color:'#5b21b6', accent:'#c084fc',
    projectile:'plasma', targetMode:TARGET.STRONGEST,
    upgrades:[
      { name:'Overcharge',    cost:160, stat:'damage',  value:150, desc:'Damage +67%',         effect:'damage = 150' },
      { name:'Penetrator',    cost:160, stat:'pierce',  value:5,   desc:'Pierces 5 enemies',   effect:'pierceCount = 5' },
      { name:'Plasma Storm',  cost:340, stat:'aoe',     value:60,  desc:'AoE explosion',       effect:'aoeRange = 60' },
      { name:'Melt Armor',    cost:340, stat:'armorP',  value:1.0, desc:'Full armor pierce',   effect:'armorPierce = 1.0' },
      { name:'Antimatter',    cost:850, stat:'damage',  value:500, desc:'Devastating damage',  effect:'damage = 500' },
      { name:'Annihilation',  cost:850, stat:'ultimate',value:true,desc:'Ultimate unlocked',   effect:'ultReady = true' },
    ],
    ultimate:{ name:'Annihilation', cooldown:50, desc:'Plasma wave sweeps full map, annihilating all' },
    soundId: 'plasma_shot',
  },
  dragon: {
    name:'Mythic Dragon', icon:'🐉', cost:500, damage:120, range:220, fireRate:0.6,
    critChance:0.20, critMult:3.5, color:'#7f1d1d', accent:'#fca5a5',
    projectile:'fire', targetMode:TARGET.STRONGEST,
    upgrades:[
      { name:'Dragon Fury',     cost:250, stat:'damage',   value:200, desc:'Damage +67%',        effect:'damage = 200' },
      { name:'Infernal Breath', cost:250, stat:'burnDps',  value:50,  desc:'Burn DPS × massive', effect:'burnDps = 50' },
      { name:'Ancient Power',   cost:550, stat:'aoe',      value:100, desc:'Huge AoE',            effect:'aoeRange = 100' },
      { name:'Dragon Scales',   cost:550, stat:'range',    value:300, desc:'Range +36%',          effect:'range = 300' },
      { name:'Mythic Form',     cost:1200,stat:'damage',   value:600, desc:'Mythic damage',       effect:'damage = 600' },
      { name:'Dragon God',      cost:1200,stat:'ultimate', value:true,desc:'Ultimate unlocked',   effect:'ultReady = true' },
    ],
    ultimate:{ name:'Dragon God Mode', cooldown:60, desc:'Dragon dives across the full map dealing 2000 damage to all' },
    soundId: 'dragon_shot',
    lockedUntil: 20, // unlock at wave 20
  },
};

// Tower order for selector
export const TOWER_ORDER = [
  'archer','laser','ice','poison','tesla','rocket',
  'flamethrower','sniper','minigun','gravity','plasma','dragon'
];

// Projectile pool
const PROJ_POOL_SIZE = 300;
let _projId = 0;

export class TowerManager {
  constructor(game) {
    this.game         = game;
    this.towers       = [];      // placed tower instances
    this.selectedType = null;    // type string selected in tower bar
    this._projPool    = [];
    this._activeProj  = [];
    this._timers      = [];

    for (let i = 0; i < PROJ_POOL_SIZE; i++) this._projPool.push(this._newProj());
  }

  reset() {
    for (const id of this._timers) { clearTimeout(id); clearInterval(id); }
    this._timers     = [];
    this.towers      = [];
    this.selectedType= null;
    this._activeProj = [];
  }

  count() { return this.towers.length; }

  getDef(type) { return TOWER_DEFS[type]; }

  // ── Placement ─────────────────────────────────────────────────────────────────
  placeTower(type, col, row) {
    const def  = TOWER_DEFS[type];
    const px   = this.game.cellToPixel(col, row);
    const skin = this.game.skins.getActiveSkin('tower_' + type);

    const tower = {
      id:         _projId++,
      type,
      col, row,
      x: px.x, y: px.y,
      // Stats (live, modified by upgrades)
      name:       def.name,
      icon:       def.icon,
      color:      (skin && skin.color) || def.color,
      accent:     (skin && skin.accent)|| def.accent,
      damage:     def.damage,
      range:      def.range,
      fireRate:   def.fireRate,
      critChance: def.critChance,
      critMult:   def.critMult,
      armorPierce:0,
      aoeRange:   0,
      pierceCount:0,
      multishot:  1,
      chainCount: 1,
      slowPercent:0,
      burnOnHit:  0,
      burnDps:    0,
      burnDuration:2,
      freezeDuration:1.5,
      poisonDps:  10,
      poisonDuration:3,
      stunDuration:0,
      pullStrength:1,
      coneAngle:  40,
      leaveFire:  false,
      targetMode: def.targetMode,
      projectile: def.projectile,
      soundId:    def.soundId,
      // Timing
      _fireTimer: 0,
      // Upgrades
      upgradesBought: [],
      upgradeLevel:   0,
      // Ultimate
      ultReady:   false,
      ultCooldown:def.ultimate.cooldown,
      ultTimer:   0,
      // Stats tracking
      totalDamageDealt: 0,
      totalKills: 0,
    };

    this.towers.push(tower);
    this.game.particles.hitSpark(px.x, px.y, '#00f5ff', 10);
    return tower;
  }

  sellTower(tower) {
    const idx = this.towers.indexOf(tower);
    if (idx === -1) return;
    // Sell for 75% of total spent
    const def      = TOWER_DEFS[tower.type];
    const baseCost  = def.cost;
    const upgCost   = tower.upgradesBought.reduce((s, u) => s + def.upgrades[u].cost, 0);
    const sellPrice = Math.floor((baseCost + upgCost) * 0.75);
    this.game.addGold(sellPrice);
    this.game.particles.lootBurst(tower.x, tower.y, 'gold');
    this.game.audio.playSound('sell_tower');
    this.towers.splice(idx, 1);
  }

  getTowerAt(col, row) {
    return this.towers.find(t => t.col === col && t.row === row) || null;
  }

  // ── Update ────────────────────────────────────────────────────────────────────
  update(dt) {
    for (const t of this.towers) {
      // Ultimate cooldown
      if (t.ultTimer > 0) t.ultTimer -= dt;
      if (!t.ultReady && t.ultTimer <= 0 && t.upgradeLevel >= 5) {
        t.ultReady = true;
        t.ultTimer = 0;
        // Update panel if this tower is selected
        if (this.game.ui.selectedTowerInst === t) {
          this.game.ui.setUltimateReady(true);
        }
      }

      // Fire timer
      t._fireTimer -= dt;
      if (t._fireTimer > 0) continue;

      // Get target
      const em     = this.game.enemies;
      const canSeeInvis = true; // All towers can target invisible enemies
      let target = null;
      switch (t.targetMode) {
        case TARGET.FIRST:    target = em.getFirst(t.x, t.y, t.range, canSeeInvis); break;
        case TARGET.LAST:     target = em.getLast(t.x, t.y, t.range, canSeeInvis); break;
        case TARGET.STRONGEST:target = em.getStrongest(t.x, t.y, t.range, canSeeInvis); break;
        case TARGET.FASTEST:  target = em.getFastest(t.x, t.y, t.range, canSeeInvis); break;
      }
      if (!target) continue;

      t._fireTimer = 1 / t.fireRate;
      this._fire(t, target);
    }

    // Update projectiles
    this._updateProjectiles(dt);
  }

  _fire(tower, target) {
    this.game.audio.playSound(tower.soundId);

    const shots = tower.multishot || 1;
    for (let s = 0; s < shots; s++) {
      const spread = (s - (shots - 1) / 2) * 12;
      const p      = this._getProj();

      p.alive       = true;
      p.id          = _projId++;
      p.type        = tower.projectile;
      p.x           = tower.x + (Math.random() - 0.5) * 6;
      p.y           = tower.y + (Math.random() - 0.5) * 6;
      p.target      = target;
      p.tower       = tower;
      p.damage      = tower.damage;
      p.aoeRange    = tower.aoeRange;
      p.pierceLeft  = tower.pierceCount;
      p.chainLeft   = (tower.chainCount || 1) - 1;
      p.armorPierce = tower.armorPierce;
      p.slowPercent = tower.slowPercent;
      p.burnDps     = tower.burnDps;
      p.burnDuration= tower.burnDuration;
      p.poisonDps   = tower.poisonDps;
      p.poisonDuration = tower.poisonDuration;
      p.freezeDuration = tower.freezeDuration;
      p.stunDuration = tower.stunDuration;
      p.speed       = tower.projectile === 'bullet' ? 700 : tower.projectile === 'rocket' ? 220 : 400;
      p.spread      = spread;

      // Crit roll
      const roll = Math.random() + (this.game.player.skills.global_crit || 0) * 0.03;
      p.isCrit   = roll < tower.critChance;
      p.damage   = p.isCrit ? Math.round(p.damage * tower.critMult) : p.damage;
      if (p.isCrit) this.game.audio.playSound('crit_hit');

      this._activeProj.push(p);
    }

    // Particle muzzle flash
    this.game.particles.hitSpark(tower.x, tower.y, tower.accent, 3);
  }

  _updateProjectiles(dt) {
    for (let i = this._activeProj.length - 1; i >= 0; i--) {
      const p = this._activeProj[i];
      if (!p.alive) { this._activeProj.splice(i, 1); continue; }

      const target = p.target;

      // Check if target still exists
      if (!target || target.deathAnim || !target.alive) {
        // Find new target if piercing
        if (p.pierceLeft > 0 || p.chainLeft > 0) {
          const newT = this.game.enemies.getFirst(p.x, p.y, 300);
          if (newT && !p.hitTargets.has(newT.id)) {
            p.target = newT;
            continue;
          }
        }
        p.alive = false;
        this._activeProj.splice(i, 1);
        continue;
      }

      // Move toward target
      const dx   = target.x + p.spread - p.x;
      const dy   = target.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < p.speed * dt + 8) {
        // Hit!
        this._onHit(p, target);
        if (!p.alive) this._activeProj.splice(i, 1);
        continue;
      }

      p.x += (dx / dist) * p.speed * dt;
      p.y += (dy / dist) * p.speed * dt;
    }
  }

  _onHit(p, enemy) {
    if (p.hitTargets.has(enemy.id)) return;
    p.hitTargets.add(enemy.id);

    // Apply damage
    this.game.enemies.applyDamage(enemy, p.damage, p.isCrit ? 'crit' : 'normal');
    p.tower.totalDamageDealt += p.damage;

    // Spark
    this.game.particles.hitSpark(enemy.x, enemy.y, p.tower.accent, 4);

    // Status effects
    if (p.slowPercent  > 0) this.game.enemies.applyStatus(enemy, 'slow',   1.5, p.slowPercent);
    if (p.burnDps      > 0) this.game.enemies.applyStatus(enemy, 'burn',   p.burnDuration, 0, p.burnDps);
    if (p.poisonDps    > 0) this.game.enemies.applyStatus(enemy, 'poison', p.poisonDuration, 0, p.poisonDps);
    if (p.freezeDuration>0 && p.type === 'orb') this.game.enemies.applyStatus(enemy, 'freeze', p.freezeDuration, 1);
    if (p.stunDuration > 0) this.game.enemies.applyStatus(enemy, 'stun',   p.stunDuration, 1);

    // AoE splash
    if (p.aoeRange > 0) {
      this.game.effects.shockwave(enemy.x, enemy.y, p.aoeRange * 0.5);
      this.game.audio.playSound('explosion');
      const nearby = this.game.enemies.getEnemiesInRange(enemy.x, enemy.y, p.aoeRange, true, true);
      for (const e of nearby) {
        if (e === enemy) continue;
        const falloff = 1 - Math.hypot(e.x - enemy.x, e.y - enemy.y) / p.aoeRange;
        this.game.enemies.applyDamage(e, Math.round(p.damage * 0.6 * falloff), 'splash');
        this.game.particles.hitSpark(e.x, e.y, p.tower.accent, 3);
        if (p.burnDps > 0) this.game.enemies.applyStatus(e, 'burn', p.burnDuration, 0, p.burnDps * 0.5);
      }
    }

    // Chain lightning
    if (p.chainLeft > 0) {
      const others = this.game.enemies.getEnemiesInRange(enemy.x, enemy.y, 120)
        .filter(e => !p.hitTargets.has(e.id) && e !== enemy);
      if (others.length > 0) {
        p.chainLeft--;
        p.target = others[0];
        p.damage  = Math.round(p.damage * 0.7); // chain falloff
        this.game.particles.hitSpark(enemy.x, enemy.y, '#818cf8', 6);
        return; // Don't mark dead yet, chain continues
      }
    }

    // Pierce
    if (p.pierceLeft > 0) {
      p.pierceLeft--;
      const newT = this.game.enemies.getFirst(p.x, p.y, 300);
      if (newT && !p.hitTargets.has(newT.id)) {
        p.target = newT;
        return;
      }
    }

    p.alive = false;
  }

  // ── Ultimate Abilities ────────────────────────────────────────────────────────
  fireUltimate(tower) {
    if (!tower.ultReady) return;
    tower.ultReady = false;
    tower.ultTimer = tower.ultCooldown;
    this.game.audio.playSound('ultimate');
    this.game.audio.vibrate([80, 40, 80]);

    const enemies = this.game.enemies.enemies;

    switch (tower.type) {
      case 'archer': {
        // Rain of 60 arrows hitting all enemies
        for (const e of enemies) {
          if (e.deathAnim) continue;
          const dmg = Math.round(tower.damage * 3);
          this._timers.push(setTimeout(() => this.game.enemies.applyDamage(e, dmg, 'crit'), Math.random() * 1000));
        }
        this.game.effects.screenFlash('#fbbf24', 0.3);
        break;
      }
      case 'laser': {
        // Sweeping beam – deal damage over time
        let t = 0;
        const interval = setInterval(() => {
          t += 0.1;
          for (const e of this.game.enemies.enemies) {
            this.game.enemies.applyDamage(e, tower.damage * 2, 'true', true);
          }
          this.game.effects.screenFlash('#f87171', 0.1);
          if (t >= 2) { clearInterval(interval); const idx = this._timers.indexOf(interval); if (idx !== -1) this._timers.splice(idx, 1); }
        }, 100);
        this._timers.push(interval);
        break;
      }
      case 'ice': {
        // Freeze all
        for (const e of enemies) {
          this.game.enemies.applyStatus(e, 'freeze', 4, 1);
          this.game.particles.freezeParticles(e.x, e.y);
        }
        this.game.effects.screenFlash('#38bdf8', 0.3);
        break;
      }
      case 'poison': {
        // Pandemic
        for (const e of enemies) {
          this.game.enemies.applyStatus(e, 'poison', 8, 0, tower.poisonDps * 2);
          this.game.particles.poisonCloud(e.x, e.y);
        }
        break;
      }
      case 'tesla': {
        // Thunderstorm – chain to everything
        for (const e of enemies) {
          this.game.enemies.applyDamage(e, tower.damage * 4, 'crit');
          this.game.enemies.applyStatus(e, 'stun', 2, 1);
          this.game.particles.hitSpark(e.x, e.y, '#818cf8', 8);
        }
        this.game.effects.screenShake(5, 0.5);
        break;
      }
      case 'rocket': {
        // Nuke – 3 massive blasts
        const W = window.innerWidth, H = window.innerHeight;
        for (let blast = 0; blast < 3; blast++) {
          this._timers.push(setTimeout(() => {
            const cx = W / 2 + (Math.random() - 0.5) * W * 0.4;
            const cy = H / 2 + (Math.random() - 0.5) * H * 0.4;
            for (const e of this.game.enemies.enemies) {
              this.game.enemies.applyDamage(e, tower.damage * 5, 'splash');
            }
            this.game.particles.bossExplosion(cx, cy);
            this.game.effects.screenShake(8, 0.4);
            this.game.effects.shockwave(cx, cy, 150);
          }, blast * 600));
        }
        break;
      }
      case 'flamethrower': {
        // Ring of fire
        for (const e of enemies) {
          this.game.enemies.applyStatus(e, 'burn', 6, 0, tower.burnDps * 2);
          this.game.enemies.applyDamage(e, tower.damage * 3, 'fire');
          this.game.particles.hitSpark(e.x, e.y, '#f97316', 8);
        }
        this.game.effects.screenFlash('#f97316', 0.4);
        break;
      }
      case 'sniper': {
        // Orbital strike – one-shot all
        for (const e of enemies) {
          this.game.enemies.applyDamage(e, tower.damage * 8, 'true');
        }
        this.game.effects.screenFlash('#ffffff', 0.5);
        break;
      }
      case 'minigun': {
        // Death blossom – 3s all-direction suppression
        let t = 0;
        const iv = setInterval(() => {
          t += 0.1;
          for (const e of this.game.enemies.enemies) {
            this.game.enemies.applyDamage(e, tower.damage, 'normal', true);
            this.game.enemies.applyStatus(e, 'slow', 0.3, 0.5);
          }
          if (t >= 3) { clearInterval(iv); const idx = this._timers.indexOf(iv); if (idx !== -1) this._timers.splice(idx, 1); }
        }, 100);
        this._timers.push(iv);
        break;
      }
      case 'gravity': {
        // Black hole – crush all to center
        const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
        for (const e of enemies) {
          e.x = cx + (Math.random() - 0.5) * 40;
          e.y = cy + (Math.random() - 0.5) * 40;
          this.game.enemies.applyDamage(e, tower.damage * 5, 'true');
          this.game.particles.hitSpark(e.x, e.y, '#a78bfa', 10);
        }
        this.game.effects.screenShake(6, 0.4);
        this.game.effects.shockwave(cx, cy, 200);
        break;
      }
      case 'plasma': {
        // Annihilation wave
        let step = 0;
        const iv2 = setInterval(() => {
          step++;
          for (const e of this.game.enemies.enemies) {
            this.game.enemies.applyDamage(e, tower.damage * 3, 'true', step > 1);
            this.game.particles.hitSpark(e.x, e.y, '#c084fc', 6);
          }
          if (step >= 3) { clearInterval(iv2); const idx = this._timers.indexOf(iv2); if (idx !== -1) this._timers.splice(idx, 1); }
        }, 200);
        this._timers.push(iv2);
        this.game.effects.screenFlash('#a855f7', 0.4);
        break;
      }
      case 'dragon': {
        // Dragon God – screen-wide devastating sweep
        for (const e of enemies) {
          this.game.enemies.applyDamage(e, 2000, 'true');
          this.game.enemies.applyStatus(e, 'burn', 8, 0, 100);
          this.game.particles.explosion(e.x, e.y, 2, '#fca5a5');
        }
        this.game.effects.screenShake(12, 1.0);
        this.game.effects.screenFlash('#ff4444', 0.5);
        break;
      }
    }

    if (this.game.ui.selectedTowerInst === tower) {
      this.game.ui.setUltimateReady(false);
    }
  }

  // ── Render towers ─────────────────────────────────────────────────────────────
  render(ctx) {
    for (const t of this.towers) this._renderTower(ctx, t);
  }

  _renderTower(ctx, t) {
    const ts    = this.game.tileSize;
    const half  = ts / 2;
    const { x, y } = t;

    ctx.save();
    ctx.translate(x, y);

    // Base platform
    ctx.fillStyle = t.color;
    ctx.shadowBlur  = 8;
    ctx.shadowColor = t.accent;
    const base = half * 0.85;
    ctx.beginPath();
    ctx.roundRect(-base, -base, base * 2, base * 2, 4);
    ctx.fill();

    // Accent border
    ctx.strokeStyle = t.accent;
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // Icon
    ctx.shadowBlur  = 0;
    ctx.font        = `${Math.max(10, ts * 0.45)}px sans-serif`;
    ctx.textAlign   = 'center';
    ctx.textBaseline= 'middle';
    ctx.fillStyle   = '#fff';
    ctx.fillText(t.icon, 0, 0);

    // Ultimate ready indicator
    if (t.ultReady) {
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth   = 2;
      ctx.shadowBlur  = 8;
      ctx.shadowColor = '#a855f7';
      ctx.strokeRect(-base - 2, -base - 2, base * 2 + 4, base * 2 + 4);
    }

    // Upgrade level dots
    const lvl = t.upgradeLevel || 0;
    if (lvl > 0) {
      const dotR = Math.max(2, ts * 0.06);
      const dotSpacing = dotR * 2 + 2;
      const totalW = lvl * dotSpacing - 2;
      const dotY = base + dotR + 3;
      ctx.shadowBlur = 4;
      ctx.shadowColor = lvl >= 5 ? '#a855f7' : '#fbbf24';
      ctx.fillStyle   = lvl >= 5 ? '#a855f7' : '#fbbf24';
      for (let i = 0; i < lvl; i++) {
        const dotX = -totalW / 2 + i * dotSpacing + dotR;
        ctx.beginPath();
        ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  renderProjectiles(ctx) {
    ctx.save();
    for (const p of this._activeProj) {
      if (!p.alive || !p.target) continue;
      const dx = p.target.x - p.x, dy = p.target.y - p.y;
      const ang = Math.atan2(dy, dx);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);

      ctx.shadowBlur  = 8;
      ctx.shadowColor = p.tower ? p.tower.accent : '#fff';

      switch (p.type) {
        case 'arrow':
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(-6, -1.5, 12, 3);
          break;
        case 'bullet':
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'laser':
          ctx.fillStyle = '#f87171';
          ctx.fillRect(-4, -1, 8, 2);
          break;
        case 'orb':
          ctx.fillStyle = p.tower ? p.tower.accent : '#88eeff';
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'rocket':
          ctx.fillStyle = '#fb923c';
          ctx.fillRect(-8, -3, 16, 6);
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(-8, -3);
          ctx.lineTo(-14, 0);
          ctx.lineTo(-8, 3);
          ctx.fill();
          break;
        case 'flame':
          ctx.fillStyle = '#f97316';
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'lightning':
          ctx.strokeStyle = '#818cf8';
          ctx.lineWidth   = 2;
          ctx.beginPath();
          ctx.moveTo(-8, 0);
          for (let lx = -6; lx < 8; lx += 3) {
            ctx.lineTo(lx, (Math.random() - 0.5) * 6);
          }
          ctx.lineTo(8, 0);
          ctx.stroke();
          break;
        case 'plasma':
          ctx.fillStyle = '#c084fc';
          ctx.beginPath();
          ctx.arc(0, 0, 7, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'cloud':
          ctx.fillStyle = '#4ade80';
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'fire':
          ctx.fillStyle = '#fca5a5';
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();
          break;
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // ── Pool helpers ──────────────────────────────────────────────────────────────
  _newProj() {
    return {
      alive: false, id: 0, type: 'bullet',
      x: 0, y: 0, target: null, tower: null,
      damage: 10, speed: 400, aoeRange: 0,
      pierceLeft: 0, chainLeft: 0, armorPierce: 0,
      slowPercent: 0, burnDps: 0, burnDuration: 2,
      poisonDps: 0, poisonDuration: 3,
      freezeDuration: 0, stunDuration: 0,
      isCrit: false, spread: 0,
      hitTargets: new Set(),
    };
  }

  _getProj() {
    for (const p of this._projPool) {
      if (!p.alive) { p.hitTargets.clear(); return p; }
    }
    const p = this._newProj();
    this._projPool.push(p);
    return p;
  }
}
