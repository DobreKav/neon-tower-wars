// === FILE: src/enemyManager.js ===
// All enemy types, pathfinding along waypoints, status effects, HP bars

const STATUS = { FREEZE: 'freeze', BURN: 'burn', POISON: 'poison', STUN: 'stun', SLOW: 'slow' };

// Base enemy definitions (scaled by wave number at spawn)
const ENEMY_DEFS = {
  scout:    { name:'Scout',      hp:80,    speed:90,  armor:0,    reward:{gold:5,  xp:5,  score:10}, size:10, color:'#22c55e', shape:'circle',  flying:false, invisible:false },
  runner:   { name:'Runner',     hp:60,    speed:140, armor:0,    reward:{gold:6,  xp:6,  score:12}, size:9,  color:'#86efac', shape:'triangle',flying:false, invisible:false },
  tank:     { name:'Iron Tank',  hp:500,   speed:40,  armor:0.3,  reward:{gold:20, xp:20, score:40}, size:16, color:'#94a3b8', shape:'rect',    flying:false, invisible:false },
  flyer:    { name:'Drone',      hp:120,   speed:100, armor:0,    reward:{gold:12, xp:10, score:20}, size:11, color:'#38bdf8', shape:'diamond', flying:true,  invisible:false },
  ghost:    { name:'Phantom',    hp:100,   speed:70,  armor:0.2,  reward:{gold:15, xp:15, score:30}, size:12, color:'#c4b5fd', shape:'circle',  flying:false, invisible:true  },
  shield:   { name:'Shieldbot',  hp:200,   speed:50,  armor:0,    reward:{gold:18, xp:18, score:35}, size:14, color:'#64748b', shape:'rect',    flying:false, invisible:false, shield:200 },
  regen:    { name:'Regenerator',hp:300,   speed:55,  armor:0.1,  reward:{gold:22, xp:20, score:45}, size:14, color:'#4ade80', shape:'circle',  flying:false, invisible:false, regen:8 },
  swarm:    { name:'Swarm Core', hp:150,   speed:75,  armor:0,    reward:{gold:10, xp:10, score:20}, size:13, color:'#fb923c', shape:'circle',  flying:false, invisible:false, splitOn:'death' },
  miniboss: { name:'Mini-Boss',  hp:1800,  speed:35,  armor:0.4,  reward:{gold:80, xp:80, score:200},size:22, color:'#f97316', shape:'rect',    flying:false, invisible:false, isBoss:true },
  boss:     { name:'BOSS',       hp:8000,  speed:28,  armor:0.5,  reward:{gold:300,xp:300,score:1000},size:30,color:'#ef4444', shape:'rect',    flying:false, invisible:false, isBoss:true, phases:3 },
};

let _idCounter = 0;

export class EnemyManager {
  constructor(game) {
    this.game    = game;
    this.enemies = [];
    this._toAdd  = []; // buffer to avoid mid-loop mutations
    this._timers = [];
  }

  reset() {
    for (const id of this._timers) clearTimeout(id);
    this._timers = [];
    this.enemies = [];
    this._toAdd  = [];
  }

  isEmpty() {
    return this.enemies.length === 0 && this._toAdd.length === 0;
  }

  // ── Spawn ─────────────────────────────────────────────────────────────────────
  spawn(type, waveNum, multiplier = 1) {
    const def   = ENEMY_DEFS[type];
    if (!def) return;

    const scaleFn = (base, wave) => Math.round(base * Math.pow(1.12, wave - 1) * multiplier);
    const wps     = this.game.mapData.waypoints;
    const start   = wps[0]; // off-screen entry

    const enemy = {
      id:           _idCounter++,
      type,
      name:         def.name,
      // Stats (scaled)
      hp:           scaleFn(def.hp, waveNum),
      maxHp:        scaleFn(def.hp, waveNum),
      speed:        def.speed * (0.9 + Math.random() * 0.2), // slight variance
      baseSpeed:    def.speed,
      armor:        def.armor,
      reward:       { ...def.reward, gold: Math.round(def.reward.gold * multiplier) },
      size:         def.size,
      color:        def.color,
      shape:        def.shape,
      flying:       def.flying,
      invisible:    def.invisible,
      isBoss:       def.isBoss || false,
      phases:       def.phases || 0,
      currentPhase: 0,
      // Position
      x: this.game.gridOffX + start.col * this.game.tileSize,
      y: this.game.gridOffY + start.row * this.game.tileSize + this.game.tileSize / 2,
      // Path tracking
      waypointIndex: 0,
      distAlongPath: 0,
      // Combat
      shield:        def.shield ? scaleFn(def.shield, waveNum) : 0,
      maxShield:     def.shield ? scaleFn(def.shield, waveNum) : 0,
      regenRate:     def.regen || 0,
      splitOn:       def.splitOn || null,
      // Status effects
      effects:       {},  // status_id → { duration, strength }
      // Visual
      flashTimer:    0,
      deathAnim:     false,
      deathTimer:    0,
      alive:         true,
      // Targeting helper
      targetable:    true,
    };

    // Adjust speed per skill
    enemy.speed *= (1 + (this.game.player.skills?.enemy_slow || 0) * -0.05);

    this._toAdd.push(enemy);
  }

  // ── Update ────────────────────────────────────────────────────────────────────
  update(dt) {
    // Flush spawn buffer
    for (const e of this._toAdd) this.enemies.push(e);
    this._toAdd = [];

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      // Death animation
      if (e.deathAnim) {
        e.deathTimer += dt;
        if (e.deathTimer > 0.25) {
          this.enemies[i] = this.enemies[this.enemies.length - 1];
          this.enemies.pop();
        }
        continue;
      }

      // Flash timer
      if (e.flashTimer > 0) e.flashTimer -= dt;

      // Status effects
      this._updateEffects(e, dt);

      // Regen
      if (e.regenRate > 0) {
        e.hp = Math.min(e.maxHp, e.hp + e.regenRate * dt);
      }

      // Boss phase check
      if (e.isBoss && e.phases > 0) {
        const phaseThresh = e.maxHp / e.phases;
        const newPhase    = e.phases - Math.ceil(e.hp / phaseThresh);
        if (newPhase > e.currentPhase) {
          e.currentPhase = newPhase;
          this.game.bosses.onPhaseChange(e, newPhase);
        }
      }

      // Movement
      this._moveAlongPath(e, dt, i);
    }
  }

  _updateEffects(e, dt) {
    // for..in avoids the array allocation that Object.entries() causes every frame
    for (const key in e.effects) {
      const eff = e.effects[key];
      eff.duration -= dt;
      if (eff.duration <= 0) { delete e.effects[key]; continue; }

      if (key === STATUS.BURN) {
        this.applyDamage(e, eff.dps * dt, 'fire', true);
      } else if (key === STATUS.POISON) {
        this.applyDamage(e, eff.dps * dt, 'poison', true);
      }
    }
  }

  _moveAlongPath(e, dt, i) {
    const wps     = this.game.mapData.waypoints;
    const ts      = this.game.tileSize;
    const offX    = this.game.gridOffX;
    const offY    = this.game.gridOffY;

    // Speed modifiers from effects
    let speedMult = 1;
    if (e.effects[STATUS.FREEZE]) speedMult = 0;
    else if (e.effects[STATUS.STUN]) speedMult = 0;
    else if (e.effects[STATUS.SLOW])  speedMult = 1 - e.effects[STATUS.SLOW].strength;

    const actualSpeed = e.speed * speedMult;
    let remaining     = actualSpeed * dt;

    while (remaining > 0 && e.waypointIndex < wps.length - 1) {
      const target = wps[e.waypointIndex + 1];
      const tx     = offX + target.col * ts + ts / 2;
      const ty     = offY + target.row * ts + ts / 2;
      const dx     = tx - e.x;
      const dy     = ty - e.y;
      const dist   = Math.sqrt(dx * dx + dy * dy);

      if (dist <= remaining) {
        e.x = tx; e.y = ty;
        e.waypointIndex++;
        remaining -= dist;
        e.distAlongPath += dist;
      } else {
        const ratio = remaining / dist;
        e.x += dx * ratio;
        e.y += dy * ratio;
        e.distAlongPath += remaining;
        remaining = 0;
      }
    }

    // Reached exit
    if (e.waypointIndex >= wps.length - 1) {
      this.enemies[i] = this.enemies[this.enemies.length - 1];
      this.enemies.pop();
      this.game.loseLife(e.isBoss ? 5 : 1);
    }
  }

  // ── Damage ────────────────────────────────────────────────────────────────────
  applyDamage(enemy, amount, type = 'normal', silent = false) {
    if (!enemy.alive || enemy.deathAnim) return 0;

    // Armor reduction
    let dmg = amount;
    if (type !== 'true') {
      const armorPierce = 0; // towers can override
      dmg = dmg * (1 - Math.max(0, enemy.armor - armorPierce));
    }
    dmg = Math.max(1, Math.round(dmg));

    // Shield absorbs first
    if (enemy.shield > 0) {
      const absorbed = Math.min(enemy.shield, dmg);
      enemy.shield  -= absorbed;
      dmg           -= absorbed;
      if (dmg <= 0) return 0;
    }

    enemy.hp       -= dmg;
    enemy.flashTimer = 0.1;

    if (!silent) {
      const isCrit   = type === 'crit';
      const isOverkill = enemy.hp < -enemy.maxHp * 0.5;
      this.game.particles.damageNumber(enemy.x, enemy.y - enemy.size - 5, dmg, isCrit, isOverkill);
    }

    if (enemy.hp <= 0) {
      this._killEnemy(enemy);
    }

    return dmg;
  }

  applyStatus(enemy, status, duration, strength = 0.5, dps = 0) {
    if (!enemy.alive) return;
    // Invisible enemies become visible when hit
    if (enemy.invisible && status !== STATUS.FREEZE) enemy.invisible = false;

    const existing = enemy.effects[status];
    if (existing) {
      // Refresh duration
      existing.duration = Math.max(existing.duration, duration);
      existing.strength = Math.max(existing.strength, strength);
    } else {
      enemy.effects[status] = { duration, strength, dps };
    }

    if (status === STATUS.FREEZE || status === STATUS.STUN) {
      this.game.particles.freezeParticles(enemy.x, enemy.y);
    }
    if (status === STATUS.POISON) {
      this.game.particles.poisonCloud(enemy.x, enemy.y);
    }
  }

  _killEnemy(enemy) {
    enemy.alive     = false;
    enemy.deathAnim = true;
    enemy.deathTimer= 0;

    // Reward
    this.game.addGold(enemy.reward.gold);
    this.game.addXP(enemy.reward.xp);
    this.game.addKill(enemy);

    // Particles
    const deathColor = enemy.isBoss ? '#ff4444' : enemy.color;
    if (enemy.isBoss) {
      this.game.particles.bossExplosion(enemy.x, enemy.y);
      this.game.effects.screenShake(8, 0.5);
      this.game.effects.shockwave(enemy.x, enemy.y, 80);
      this.game.audio.playSound('boss_death');
      this.game.audio.vibrate([100, 50, 100, 50, 200]);
      this.game.ui.hideBossBar();
      this.game.ui.showToast(`Boss defeated! +${enemy.reward.gold} gold`, 'reward');
    } else {
      this.game.particles.explosion(enemy.x, enemy.y, enemy.size / 12, deathColor);
      this.game.audio.playSound('enemy_death');
    }

    // Loot drop chance
    if (Math.random() < 0.05 + (enemy.isBoss ? 0.5 : 0)) {
      this.game.particles.lootBurst(enemy.x, enemy.y, 'gold');
    }

    // Swarm splits
    if (enemy.splitOn === 'death') {
      for (let i = 0; i < 3; i++) {
        this._timers.push(setTimeout(() => {
          if (!this.game.waveActive) return;
          const child = { ...enemy };
          child.type  = 'scout';
          child.hp    = Math.round(enemy.maxHp * 0.2);
          child.maxHp = child.hp;
          child.size  = enemy.size * 0.5;
          child.reward= { gold: 2, xp: 2, score: 5 };
          child.splitOn = null;
          child.deathAnim = false;
          child.alive = true;
          child.id    = _idCounter++;
          child.x    += (Math.random() - 0.5) * 20;
          child.y    += (Math.random() - 0.5) * 20;
          this.enemies.push(child);
        }, i * 100));
      }
    }

    this.game.achievements.check('kill', this.game.player.totalKills);
  }

  // ── Targeting helpers for towers ──────────────────────────────────────────────
  getEnemiesInRange(x, y, range, includeFlying = true, includeInvisible = false) {
    return this.enemies.filter(e => {
      if (e.deathAnim || !e.alive) return false;
      if (e.flying && !includeFlying) return false;
      if (e.invisible && !includeInvisible) return false;
      const dx = e.x - x, dy = e.y - y;
      return dx * dx + dy * dy <= range * range;
    });
  }

  getFirst(x, y, range, includeInvisible = false) {
    const candidates = this.getEnemiesInRange(x, y, range, true, includeInvisible);
    if (!candidates.length) return null;
    // "First" = furthest along path
    return candidates.reduce((best, e) => e.distAlongPath > best.distAlongPath ? e : best);
  }

  getLast(x, y, range, includeInvisible = false) {
    const candidates = this.getEnemiesInRange(x, y, range, true, includeInvisible);
    if (!candidates.length) return null;
    return candidates.reduce((best, e) => e.distAlongPath < best.distAlongPath ? e : best);
  }

  getStrongest(x, y, range, includeInvisible = false) {
    const candidates = this.getEnemiesInRange(x, y, range, true, includeInvisible);
    if (!candidates.length) return null;
    return candidates.reduce((best, e) => e.hp > best.hp ? e : best);
  }

  getFastest(x, y, range, includeInvisible = false) {
    const candidates = this.getEnemiesInRange(x, y, range, true, includeInvisible);
    if (!candidates.length) return null;
    return candidates.reduce((best, e) => e.speed > best.speed ? e : best);
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  render(ctx) {
    for (const e of this.enemies) {
      this._renderEnemy(ctx, e);
    }
  }

  _renderEnemy(ctx, e) {
    const alpha = e.deathAnim ? Math.max(0, 1 - e.deathTimer / 0.25) : 1;
    if (e.invisible && !e.effects[STATUS.FREEZE]) {
      ctx.globalAlpha = 0.45; // ghosts slightly visible
    } else {
      ctx.globalAlpha = alpha;
    }

    const { x, y, size } = e;
    const scale = e.deathAnim ? 1 + e.deathTimer * 2 : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Flash white on hit
    const useFlash = e.flashTimer > 0;

    // Status effect tints
    let tint = e.color;
    if (e.effects[STATUS.FREEZE]) tint = '#88eeff';
    if (e.effects[STATUS.BURN])   tint = '#ff7700';
    if (e.effects[STATUS.POISON]) tint = '#7dba47';
    if (useFlash) tint = '#ffffff';

    // Glow for bosses/minibosses
    if (e.isBoss) {
      ctx.shadowBlur  = 16;
      ctx.shadowColor = tint;
    }

    ctx.fillStyle = tint;

    switch (e.shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        if (!e.isBoss) {
          ctx.strokeStyle = 'rgba(0,0,0,0.3)';
          ctx.lineWidth   = 1;
          ctx.stroke();
        }
        break;

      case 'rect':
        ctx.fillRect(-size, -size * 0.75, size * 2, size * 1.5);
        if (e.shield > 0) {
          // Shield glow
          ctx.strokeStyle = '#60a5fa';
          ctx.lineWidth   = 3;
          ctx.shadowBlur  = 10;
          ctx.shadowColor = '#60a5fa';
          ctx.strokeRect(-size - 4, -size * 0.75 - 4, size * 2 + 8, size * 1.5 + 8);
        }
        break;

      case 'triangle': {
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.87, size * 0.5);
        ctx.lineTo(-size * 0.87, size * 0.5);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'diamond': {
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size, 0);
        ctx.lineTo(0, size);
        ctx.lineTo(-size, 0);
        ctx.closePath();
        ctx.fill();
        // Flying indicator
        ctx.strokeStyle = 'rgba(56,189,248,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
      }
    }
    ctx.restore();

    // HP bar
    if (!e.deathAnim && !e.isBoss) {
      this._renderHPBar(ctx, e);
    }

    // Status icons
    this._renderStatusIcons(ctx, e);

    ctx.globalAlpha = 1;
  }

  _renderHPBar(ctx, e) {
    const barW = e.size * 2.5;
    const barH = 3;
    const bx   = e.x - barW / 2;
    const by   = e.y - e.size - 8;
    const pct  = e.hp / e.maxHp;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx, by, barW, barH);

    const color = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillStyle = color;
    ctx.fillRect(bx, by, barW * pct, barH);

    // Shield bar (blue, above HP)
    if (e.shield > 0) {
      const sp = e.shield / e.maxShield;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(bx, by - 4, barW, 3);
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(bx, by - 4, barW * sp, 3);
    }
  }

  _renderStatusIcons(ctx, e) {
    const cols = [];
    if (e.effects[STATUS.FREEZE]) cols.push('#88eeff');
    if (e.effects[STATUS.BURN])   cols.push('#f97316');
    if (e.effects[STATUS.POISON]) cols.push('#4ade80');
    if (e.effects[STATUS.STUN])   cols.push('#fbbf24');
    if (e.effects[STATUS.SLOW])   cols.push('#94a3b8');
    if (!cols.length) return;

    const cy = e.y - e.size - 14;
    cols.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(e.x + (i - cols.length / 2 + 0.5) * 8, cy, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}
