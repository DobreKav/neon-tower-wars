// === FILE: src/waveManager.js ===
// Wave definitions (40+ waves), spawning scheduler, endless mode scaling

// Enemy type IDs
const E = {
  SCOUT:   'scout',
  RUNNER:  'runner',
  TANK:    'tank',
  FLYER:   'flyer',
  GHOST:   'ghost',
  SHIELD:  'shield',
  REGEN:   'regen',
  SWARM:   'swarm',
  MINIBOSS:'miniboss',
  BOSS:    'boss',
};

// Wave definition: array of spawn groups { enemy, count, interval(s), delay(s) }
const WAVE_DEFS = [
  /* 01 */ [{ enemy:E.SCOUT, count:8,  interval:1.0, delay:0 }],
  /* 02 */ [{ enemy:E.SCOUT, count:10, interval:0.9, delay:0 }, { enemy:E.RUNNER, count:2, interval:1.5, delay:4 }],
  /* 03 */ [{ enemy:E.SCOUT, count:8,  interval:0.8, delay:0 }, { enemy:E.TANK,   count:2, interval:3.0, delay:2 }],
  /* 04 */ [{ enemy:E.RUNNER,count:6,  interval:0.8, delay:0 }, { enemy:E.SCOUT,  count:8, interval:0.6, delay:3 }],
  /* 05 */ [{ enemy:E.TANK,  count:4,  interval:2.5, delay:0 }, { enemy:E.RUNNER, count:8, interval:0.7, delay:2 }],
  /* 06 */ [{ enemy:E.FLYER, count:6,  interval:1.0, delay:0 }, { enemy:E.SCOUT,  count:8, interval:0.7, delay:1 }],
  /* 07 */ [{ enemy:E.GHOST, count:5,  interval:1.2, delay:0 }, { enemy:E.TANK,   count:3, interval:2.5, delay:3 }],
  /* 08 */ [{ enemy:E.SCOUT, count:15, interval:0.5, delay:0 }, { enemy:E.FLYER,  count:4, interval:1.1, delay:4 }],
  /* 09 */ [{ enemy:E.SHIELD,count:4,  interval:2.0, delay:0 }, { enemy:E.RUNNER, count:8, interval:0.8, delay:2 }],
  /* 10 */ [{ enemy:E.BOSS,  count:1,  interval:0,   delay:0 }], // BOSS WAVE

  /* 11 */ [{ enemy:E.SCOUT, count:14, interval:0.7, delay:0 }, { enemy:E.TANK,   count:4, interval:2.0, delay:3 }],
  /* 12 */ [{ enemy:E.REGEN, count:5,  interval:1.5, delay:0 }, { enemy:E.FLYER,  count:6, interval:0.9, delay:2 }],
  /* 13 */ [{ enemy:E.SWARM, count:4,  interval:2.0, delay:0 }, { enemy:E.SCOUT,  count:10,interval:0.6, delay:3 }],
  /* 14 */ [{ enemy:E.GHOST, count:8,  interval:1.0, delay:0 }, { enemy:E.SHIELD, count:4, interval:2.0, delay:4 }],
  /* 15 */ [{ enemy:E.TANK,  count:6,  interval:2.0, delay:0 }, { enemy:E.REGEN,  count:4, interval:1.5, delay:2 }],
  /* 16 */ [{ enemy:E.FLYER, count:10, interval:0.7, delay:0 }, { enemy:E.GHOST,  count:6, interval:1.0, delay:3 }],
  /* 17 */ [{ enemy:E.SWARM, count:6,  interval:1.8, delay:0 }, { enemy:E.RUNNER, count:10,interval:0.6, delay:2 }],
  /* 18 */ [{ enemy:E.SHIELD,count:6,  interval:1.5, delay:0 }, { enemy:E.TANK,   count:5, interval:2.0, delay:3 }],
  /* 19 */ [{ enemy:E.MINIBOSS,count:1,interval:0,   delay:0 }, { enemy:E.SCOUT,  count:12,interval:0.6, delay:4 }],
  /* 20 */ [{ enemy:E.BOSS,  count:1,  interval:0,   delay:0 }], // BOSS WAVE

  /* 21 */ [{ enemy:E.REGEN, count:8,  interval:1.2, delay:0 }, { enemy:E.FLYER,  count:8, interval:0.8, delay:2 }],
  /* 22 */ [{ enemy:E.GHOST, count:10, interval:0.9, delay:0 }, { enemy:E.SWARM,  count:5, interval:1.8, delay:4 }],
  /* 23 */ [{ enemy:E.TANK,  count:8,  interval:1.8, delay:0 }, { enemy:E.SHIELD, count:5, interval:1.5, delay:2 }],
  /* 24 */ [{ enemy:E.RUNNER,count:18, interval:0.4, delay:0 }, { enemy:E.REGEN,  count:5, interval:1.5, delay:5 }],
  /* 25 */ [{ enemy:E.MINIBOSS,count:2,interval:5.0, delay:0 }, { enemy:E.SCOUT,  count:15,interval:0.5, delay:3 }],
  /* 26 */ [{ enemy:E.FLYER, count:14, interval:0.6, delay:0 }, { enemy:E.GHOST,  count:8, interval:1.0, delay:3 }],
  /* 27 */ [{ enemy:E.SWARM, count:10, interval:1.5, delay:0 }, { enemy:E.TANK,   count:6, interval:1.8, delay:3 }],
  /* 28 */ [{ enemy:E.SHIELD,count:8,  interval:1.2, delay:0 }, { enemy:E.REGEN,  count:6, interval:1.3, delay:3 }],
  /* 29 */ [{ enemy:E.SCOUT, count:20, interval:0.4, delay:0 }, { enemy:E.FLYER,  count:10,interval:0.7, delay:5 }],
  /* 30 */ [{ enemy:E.BOSS,  count:1,  interval:0,   delay:0 }], // BOSS WAVE

  /* 31 */ [{ enemy:E.GHOST, count:12, interval:0.8, delay:0 }, { enemy:E.SWARM,  count:8, interval:1.5, delay:3 }],
  /* 32 */ [{ enemy:E.REGEN, count:10, interval:1.0, delay:0 }, { enemy:E.SHIELD, count:8, interval:1.2, delay:3 }],
  /* 33 */ [{ enemy:E.TANK,  count:10, interval:1.5, delay:0 }, { enemy:E.RUNNER, count:15,interval:0.4, delay:4 }],
  /* 34 */ [{ enemy:E.FLYER, count:16, interval:0.5, delay:0 }, { enemy:E.GHOST,  count:10,interval:0.8, delay:4 }],
  /* 35 */ [{ enemy:E.MINIBOSS,count:3,interval:4.0, delay:0 }, { enemy:E.SWARM,  count:8, interval:1.5, delay:5 }],
  /* 36 */ [{ enemy:E.SHIELD,count:10, interval:1.0, delay:0 }, { enemy:E.REGEN,  count:8, interval:1.1, delay:3 }],
  /* 37 */ [{ enemy:E.SCOUT, count:25, interval:0.3, delay:0 }, { enemy:E.FLYER,  count:12,interval:0.6, delay:6 }],
  /* 38 */ [{ enemy:E.TANK,  count:12, interval:1.2, delay:0 }, { enemy:E.GHOST,  count:12,interval:0.7, delay:3 }],
  /* 39 */ [{ enemy:E.MINIBOSS,count:2,interval:6.0, delay:0 }, { enemy:E.SWARM,  count:12,interval:1.2, delay:4 }],
  /* 40 */ [{ enemy:E.BOSS,  count:1,  interval:0,   delay:0 }], // FINAL BOSS
];

export class WaveManager {
  constructor(game) {
    this.game        = game;
    this._mapData    = null;
    this._groups     = [];   // active spawn groups
    this._pending    = 0;    // total enemies left to spawn this wave
    this._spawned    = 0;
    this._complete   = false;
    this._waveNum    = 0;
    this._endlessMultiplier = 1;
  }

  setup(mapData) {
    this._mapData = mapData;
    this._groups  = [];
    this._pending = 0;
    this._spawned = 0;
    this._complete= true; // ready for first wave
    this._waveNum = 0;
    this._endlessMultiplier = 1;
  }

  startWave(waveNum) {
    this._waveNum   = waveNum;
    this._complete  = false;
    this._spawned   = 0;
    this._groups    = [];

    let def;
    if (waveNum <= WAVE_DEFS.length) {
      def = WAVE_DEFS[waveNum - 1];
    } else {
      // Endless mode: generate scaled waves
      this._endlessMultiplier = 1 + (waveNum - WAVE_DEFS.length) * 0.15;
      def = this._generateEndlessWave(waveNum);
    }

    // Calculate total pending
    this._pending = def.reduce((s, g) => s + g.count, 0);

    // Schedule groups
    for (const g of def) {
      this._groups.push({
        enemy:    g.enemy,
        count:    g.count,
        interval: g.interval,
        delay:    g.delay,
        timer:    0,
        spawned:  0,
      });
    }
  }

  _generateEndlessWave(waveNum) {
    const m = this._endlessMultiplier;
    const allTypes = [E.SCOUT, E.RUNNER, E.TANK, E.FLYER, E.GHOST, E.SHIELD, E.REGEN, E.SWARM];
    // Boss every 10 waves
    if (waveNum % 10 === 0) {
      return [{ enemy: E.BOSS, count: 1, interval: 0, delay: 0 },
              { enemy: E.TANK, count: Math.floor(5 * m), interval: 1.5, delay: 5 }];
    }
    // Miniboss every 5 waves
    if (waveNum % 5 === 0) {
      return [{ enemy: E.MINIBOSS, count: Math.floor(1 + m * 0.5), interval: 4, delay: 0 },
              { enemy: allTypes[waveNum % allTypes.length], count: Math.floor(8 * m), interval: 0.5, delay: 3 }];
    }
    const type1 = allTypes[waveNum      % allTypes.length];
    const type2 = allTypes[(waveNum + 3) % allTypes.length];
    return [
      { enemy: type1, count: Math.floor(10 * m), interval: Math.max(0.2, 0.8 / m), delay: 0 },
      { enemy: type2, count: Math.floor(6  * m), interval: Math.max(0.2, 1.0 / m), delay: 3 },
    ];
  }

  update(dt) {
    if (this._complete || !this.game.waveActive) return;

    let allGroupsDone = true;
    for (const g of this._groups) {
      if (g.spawned >= g.count) continue;
      allGroupsDone = false;

      // Wait for initial delay
      g.timer += dt;
      if (g.timer < g.delay) continue;

      // Fire interval timer (after delay)
      const elapsed = g.timer - g.delay;
      const shouldSpawn = Math.floor(elapsed / g.interval);
      while (g.spawned < shouldSpawn && g.spawned < g.count) {
        this._spawnEnemy(g.enemy);
        g.spawned++;
        this._spawned++;
      }
    }

    if (allGroupsDone) this._complete = true;
  }

  _spawnEnemy(type) {
    const m = this._endlessMultiplier;
    this.game.enemies.spawn(type, this._waveNum, m);
  }

  isWaveComplete() {
    return this._complete;
  }

  getTotalThisWave() {
    return this._groups.reduce((s, g) => s + g.count, 0);
  }
}
