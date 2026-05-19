---
name: "Ultimate Tower Defense Game"
description: "Generate production-quality Tower Defense game files (HTML/CSS/JS) for Android WebView and Web, with polished UI, addictive progression, and modular architecture."
argument-hint: "Specify a module to generate: full-game | towers | enemies | waves | ui | save-system | audio | ad-manager | or leave blank for full scaffold"
agent: "agent"
tools: [editFiles, codebase]
---

# Ultimate Tower Defense Game Generator

You are an expert game developer. Generate **production-quality**, **modular**, **mobile-first** Tower Defense game code using:

- Pure JavaScript (ES6+, no frameworks)
- HTML5 Canvas for rendering
- CSS3 for UI animations
- Android WebView compatible
- PWA support (offline playable)
- 60 FPS target on mid-range Android

---

## Argument

The user may pass an argument to scope generation:

| Argument | Output |
|---|---|
| `full-game` or blank | Full scaffold: all files listed below |
| `towers` | `js/towers.js` only |
| `enemies` | `js/enemies.js` only |
| `waves` | `js/wave-manager.js` only |
| `ui` | `index.html` + `css/style.css` |
| `save-system` | `js/save-system.js` only |
| `audio` | `js/audio-manager.js` only |
| `ad-manager` | `js/ad-manager.js` only |

If no argument is given, generate the **full scaffold**.

---

## File Structure to Generate

```
Tower defence/
├── index.html
├── manifest.json
├── service-worker.js
├── css/
│   └── style.css
├── js/
│   ├── main.js              # Entry point, game loop
│   ├── canvas.js            # Canvas setup, resize, DPI scaling
│   ├── towers.js            # 12+ tower definitions, upgrade trees, abilities
│   ├── enemies.js           # All enemy types, AI, pathfinding
│   ├── wave-manager.js      # Wave scaling, spawning, boss triggers
│   ├── projectiles.js       # Bullet/beam/aoe projectile pool
│   ├── particles.js         # Explosion, critical hit, loot particle system
│   ├── ui.js                # HUD, menus, buttons, transitions
│   ├── save-system.js       # LocalStorage persistence, cloud save hooks
│   ├── audio-manager.js     # Web Audio API sounds, music, haptics
│   ├── ad-manager.js        # AdMob rewarded ads, non-intrusive hooks
│   ├── progression.js       # XP, levels, skill trees, prestige
│   └── input.js             # Touch, mouse, gesture unification
└── assets/
    ├── audio/               # Compressed OGG/MP3 tracks
    └── sprites/             # Optimized PNG spritesheets
```

---

## Core Systems — Detailed Requirements

### Towers (12 minimum)

Generate each tower with:

```js
// Required shape for every tower definition
{
  id: 'archer',
  name: 'Archer Tower',
  tier: 1,
  cost: 100,
  damage: 20,
  range: 150,
  fireRate: 1.2,       // shots per second
  critChance: 0.1,
  critMultiplier: 2.0,
  effects: ['slow'],   // status effects applied on hit
  upgradeTree: [
    { level: 1, cost: 80,  stat: 'damage',   value: 30 },
    { level: 2, cost: 150, stat: 'range',    value: 180 },
    { level: 3, cost: 300, stat: 'fireRate', value: 2.0 }
  ],
  ultimateAbility: {
    name: 'Rain of Arrows',
    cooldown: 30,       // seconds
    description: 'Fires 20 arrows in a 360° burst'
  },
  render(ctx, x, y, level) { /* canvas draw logic */ },
  onHit(enemy, projectile) { /* hit effect logic */ }
}
```

Required towers:
1. Archer Tower — multi-target, slow on hit
2. Laser Tower — continuous beam, armor pierce
3. Ice Tower — freeze AoE, chill stacking
4. Poison Tower — DoT cloud, spreading
5. Tesla Tower — chain lightning, stun
6. Rocket Launcher — splash damage, knockback
7. Flamethrower — cone AoE, burn stacks
8. Sniper Tower — extreme range, one-shot potential
9. Minigun Tower — rapid fire, suppression slow
10. Gravity Tower — pulls/slows in AoE, sucks projectiles
11. Plasma Cannon — penetrating beam, melt armor
12. Mythic Dragon Tower — legendary, fire breath + dive bomb ultimate

### Enemies

```js
{
  id: 'tank',
  name: 'Iron Golem',
  hp: 1200, maxHp: 1200,
  speed: 40,
  armor: 0.3,          // 30% damage reduction
  reward: { gold: 25, xp: 10 },
  immunities: [],
  abilities: ['regen'],
  isBoss: false,
  isFlying: false,
  render(ctx, x, y, hp) { /* canvas draw */ }
}
```

Required types:
- Fast Scout, Tank, Flying Drone, Stealth Unit, Shield Bearer
- Regenerator, Swarm Spawner (splits on death)
- Mini-Boss (appears every 5 waves)
- World Boss (wave 10, 20, 30…) — cinematic entrance, phase transitions

### Wave Manager

- Exponential HP/speed scaling per wave
- Boss every 10 waves with unique mechanics
- Adaptive difficulty: if player performs too easily, increase density
- Wave preview: show incoming enemy types before wave starts
- Endless mode after wave 40

### Particle & Visual Feedback

Every hit must produce:
- Damage number popup (color-coded: white = normal, yellow = crit, red = overkill)
- Hit spark particle burst
- Tower muzzle flash
- Death explosion scaled to enemy size

Bosses additionally get:
- Screen shake on death
- Shockwave ring effect
- Loot shower (gem/coin particles)

### Progression System

```js
// progression.js shape
{
  level: 1,
  xp: 0,
  xpToNext: 500,
  skillPoints: 0,
  skillTree: {
    global_damage: { level: 0, max: 5, effect: '+5% all tower damage' },
    gold_bonus:    { level: 0, max: 5, effect: '+10% gold per wave' },
    crit_global:   { level: 0, max: 3, effect: '+3% global crit chance' },
    // ... 12+ skills total
  },
  prestige: {
    count: 0,
    bonus: '+2% permanent damage per prestige'
  }
}
```

Daily rewards: login streak calendar (day 1–7 loop).
Weekly missions: 3 rotating objectives with gem rewards.
Achievements: 30+ unlockable.

### Save System

- Auto-save every 30 seconds to `localStorage`
- Manual save on menu open
- Offline rewards calculated on load (gold accumulation while away)
- Cloud save hook (stub ready for Firebase integration)

### Ad Manager (Non-Aggressive)

```js
// ad-manager.js — AdMob rewarded ads only
// Rules enforced in code:
// - NEVER show ads during active wave
// - NEVER show popup/interstitial ads
// - Rewarded placements only:
const AD_PLACEMENTS = {
  DOUBLE_REWARD:   'after_victory_screen',
  CONTINUE_AFTER_DEFEAT: 'defeat_screen_optional',
  DAILY_BONUS:     'main_menu_optional',
  EXTRA_GEMS:      'shop_optional'
}
// All placements are user-initiated, never forced.
```

### Audio Manager

Use Web Audio API. Required sounds:
- Tower fire (unique per tower)
- Enemy hit, enemy death
- Boss roar, boss death
- Wave start fanfare
- Level up jingle
- UI click, UI confirm
- Background music: 3 tracks (menu, gameplay, boss fight)
- Haptic feedback via `navigator.vibrate()` for Android

### PWA / Android Support

- `manifest.json` with `display: standalone`, `orientation: portrait`
- `service-worker.js` caching all assets for offline play
- `<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">`
- Touch event handling with passive listeners
- Prevent scroll/zoom on canvas
- Fullscreen API on game start
- APK wrapper hint comment in `index.html`

---

## Code Quality Standards

- ES6 classes for all game objects
- Object pooling for projectiles and particles (pre-allocate 200 projectiles, 500 particles)
- `requestAnimationFrame` game loop with fixed delta time cap (max 50ms)
- No global state leaks — all state in module-scoped objects
- JSDoc comments on all public methods
- No memory leaks: always remove event listeners on scene destroy
- Target: < 5 MB total uncompressed (excluding audio)

---

## Style Guide (CSS / Canvas)

- Dark mode neon sci-fi aesthetic: deep navy background, cyan/purple/orange accents
- Neon glow via `ctx.shadowBlur` and CSS `text-shadow`
- Smooth CSS transitions on all UI elements (`transition: 0.2s ease`)
- Mobile button minimum tap target: 48×48px
- Font: system-ui fallback, or embed a single lightweight monospace

---

## Output Format

For each file generated:

1. Start with a comment block: `// === FILE: path/to/file.js ===`
2. Full, runnable code — no placeholders, no `// TODO` stubs
3. If the file is long, generate it completely; do not truncate
4. After all files, output a **Quick Start** section:

```
## Quick Start
1. Open index.html in Chrome/Android WebView
2. For APK: wrap with Capacitor or Cordova pointing to index.html
3. AdMob: replace AD_UNIT_IDs in js/ad-manager.js
4. Firebase: add firebaseConfig in js/save-system.js
```

---

## Quality Bar

The final game must feel like:
- A polished indie mobile hit (Kingdom Rush / Bloons TD quality)
- Extremely replayable with meaningful progression
- Fair, non-predatory monetization
- Smooth 60 FPS on a $150 Android phone

Prioritize: **fun → smoothness → reward psychology → performance → polish**.
