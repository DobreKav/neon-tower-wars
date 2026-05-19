// === FILE: src/skinsSystem.js ===
// Skin definitions, equip/unlock logic, skins grid builder

const SKINS = [
  // ── Tower skins ───────────────────────────────────────────────────────────────
  { id:'archer_default',     cat:'tower_archer',     name:'Default',      icon:'🏹', cost:0,   free:true,  color:'#92400e', accent:'#fbbf24' },
  { id:'archer_gold',        cat:'tower_archer',     name:'Golden',       icon:'🏹', cost:20,  free:false, color:'#78350f', accent:'#fde68a' },
  { id:'archer_shadow',      cat:'tower_archer',     name:'Shadow',       icon:'🏹', cost:30,  free:false, color:'#1c1917', accent:'#a8a29e' },

  { id:'laser_default',      cat:'tower_laser',      name:'Default',      icon:'🔴', cost:0,   free:true,  color:'#7f1d1d', accent:'#f87171' },
  { id:'laser_blue',         cat:'tower_laser',      name:'Blue Laser',   icon:'🔵', cost:20,  free:false, color:'#1e3a5f', accent:'#60a5fa' },

  { id:'ice_default',        cat:'tower_ice',        name:'Default',      icon:'❄️', cost:0,   free:true,  color:'#0c4a6e', accent:'#38bdf8' },
  { id:'ice_purple',         cat:'tower_ice',        name:'Violet Frost', icon:'💜', cost:25,  free:false, color:'#4c1d95', accent:'#c084fc' },

  { id:'poison_default',     cat:'tower_poison',     name:'Default',      icon:'☠️', cost:0,   free:true,  color:'#14532d', accent:'#4ade80' },

  { id:'tesla_default',      cat:'tower_tesla',      name:'Default',      icon:'⚡', cost:0,   free:true,  color:'#312e81', accent:'#818cf8' },
  { id:'tesla_gold',         cat:'tower_tesla',      name:'Gilded Storm', icon:'⚡', cost:35,  free:false, color:'#78350f', accent:'#fcd34d' },

  { id:'rocket_default',     cat:'tower_rocket',     name:'Default',      icon:'🚀', cost:0,   free:true,  color:'#7c2d12', accent:'#fb923c' },
  { id:'flamethrower_default',cat:'tower_flamethrower',name:'Default',    icon:'🔥', cost:0,   free:true,  color:'#7c2d12', accent:'#f97316' },
  { id:'sniper_default',     cat:'tower_sniper',     name:'Default',      icon:'🎯', cost:0,   free:true,  color:'#1e3a5f', accent:'#60a5fa' },
  { id:'minigun_default',    cat:'tower_minigun',    name:'Default',      icon:'💥', cost:0,   free:true,  color:'#374151', accent:'#9ca3af' },
  { id:'gravity_default',    cat:'tower_gravity',    name:'Default',      icon:'🌀', cost:0,   free:true,  color:'#4c1d95', accent:'#a78bfa' },
  { id:'plasma_default',     cat:'tower_plasma',     name:'Default',      icon:'🔮', cost:0,   free:true,  color:'#5b21b6', accent:'#c084fc' },
  { id:'dragon_default',     cat:'tower_dragon',     name:'Default',      icon:'🐉', cost:0,   free:true,  color:'#7f1d1d', accent:'#fca5a5' },
  { id:'dragon_royal',       cat:'tower_dragon',     name:'Royal Dragon', icon:'🐉', cost:50,  free:false, color:'#1e1b4b', accent:'#f59e0b' },

  // ── Map skins ─────────────────────────────────────────────────────────────────
  { id:'map_default',        cat:'map',              name:'Default',      icon:'🗺️',cost:0,   free:true,  bgColor:'#14532d', pathColor:'#92400e' },
  { id:'map_neon',           cat:'map',              name:'Neon Grid',    icon:'🔲', cost:40,  free:false, bgColor:'#0a0e1a', pathColor:'#00f5ff' },
  { id:'map_lava',           cat:'map',              name:'Lava World',   icon:'🌋', cost:40,  free:false, bgColor:'#1c0a00', pathColor:'#ea580c' },

  // ── Particle skins ────────────────────────────────────────────────────────────
  { id:'particle_default',   cat:'particle',         name:'Default',      icon:'✨', cost:0,   free:true  },
  { id:'particle_rainbow',   cat:'particle',         name:'Rainbow',      icon:'🌈', cost:30,  free:false },
  { id:'particle_gold',      cat:'particle',         name:'Gold Sparks',  icon:'💫', cost:25,  free:false },
];

const SKIN_TABS = ['towers', 'maps', 'particles'];

export class SkinsSystem {
  constructor(game) {
    this.game     = game;
    this.owned    = [];   // array of skin IDs
    this.equipped = {};   // category → skinId
  }

  init(savedData) {
    if (savedData) {
      this.owned    = savedData.owned    || [];
      this.equipped = savedData.equipped || {};
    }

    // Unlock all free skins by default
    for (const skin of SKINS) {
      if (skin.free && !this.owned.includes(skin.id)) {
        this.owned.push(skin.id);
      }
      // Auto-equip defaults
      if (skin.free && !this.equipped[skin.cat]) {
        this.equipped[skin.cat] = skin.id;
      }
    }
  }

  serialize() {
    return { owned: this.owned, equipped: this.equipped };
  }

  getActiveSkin(category) {
    const id   = this.equipped[category];
    if (!id) return null;
    return SKINS.find(s => s.id === id) || null;
  }

  equip(category, skinId) {
    if (!this.owned.includes(skinId)) return false;
    this.equipped[category] = skinId;
    this.game.save.markDirty();
    return true;
  }

  unlock(skinId) {
    const skin = SKINS.find(s => s.id === skinId);
    if (!skin) return false;
    if (this.owned.includes(skinId)) return false;
    if (!this.game.spendGems(skin.cost)) return false;
    this.owned.push(skinId);
    this.game.audio.playSound('reward');
    this.game.ui.showToast(`🎨 Unlocked: ${skin.name}`, 'reward');
    this.game.save.markDirty();
    return true;
  }

  // ── Build skins grid DOM ──────────────────────────────────────────────────────
  buildSkinsGrid(tab = 'towers') {
    const container = document.getElementById('skins-grid');
    if (!container) return;
    container.innerHTML = '';

    const catPrefix = tab === 'towers' ? 'tower_' : tab === 'maps' ? 'map' : 'particle';
    const filtered  = SKINS.filter(s => {
      if (tab === 'towers')    return s.cat.startsWith('tower_');
      if (tab === 'maps')      return s.cat === 'map';
      if (tab === 'particles') return s.cat === 'particle';
      return false;
    });

    for (const skin of filtered) {
      const owned    = this.owned.includes(skin.id);
      const equipped = this.equipped[skin.cat] === skin.id;

      const card = document.createElement('div');
      card.className = `skin-card${owned ? ' owned' : ''}${equipped ? ' equipped' : ''}`;

      card.innerHTML = `
        <div class="skin-icon">${skin.icon}</div>
        <div class="skin-name">${skin.name}</div>
        <div class="skin-cat dim-text">${skin.cat.replace('tower_','')}</div>
        <div class="skin-cost">${owned ? (equipped ? '✅ Equipped' : '✔ Owned') : `💎 ${skin.cost}`}</div>
      `;

      if (owned && !equipped) {
        const equipBtn = document.createElement('button');
        equipBtn.className   = 'btn-secondary btn-small';
        equipBtn.textContent = 'Equip';
        equipBtn.addEventListener('click', () => {
          this.equip(skin.cat, skin.id);
          this.buildSkinsGrid(tab);
          this.game.ui.showToast(`Equipped: ${skin.name}`, 'info');
        });
        card.appendChild(equipBtn);
      } else if (!owned) {
        const buyBtn = document.createElement('button');
        buyBtn.className   = 'btn-secondary btn-small';
        buyBtn.textContent = `Buy (${skin.cost} 💎)`;
        buyBtn.addEventListener('click', () => {
          this.game.audio.playSound('click');
          if (this.unlock(skin.id)) {
            this.buildSkinsGrid(tab);
          } else {
            this.game.ui.showToast('Not enough gems!', 'error');
          }
        });
        card.appendChild(buyBtn);
      }

      container.appendChild(card);
    }

    if (filtered.length === 0) {
      container.innerHTML = '<p class="dim-text">No skins in this category.</p>';
    }
  }
}
