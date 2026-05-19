// === FILE: src/audio.js ===
// Web Audio API – procedural sound synthesis, music system, haptics

export class AudioManager {
  constructor(game) {
    this.game    = game;
    this.ctx     = null;
    this.master  = null;
    this.musicGain = null;
    this.sfxGain   = null;
    this._musicSource = null;
    this._musicTrack  = null;
    this._musicNodes  = {};
    this.initialized  = false;
  }

  async init() {
    try {
      this.ctx        = new (window.AudioContext || window.webkitAudioContext)();
      this.master     = this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.master.connect(this.ctx.destination);

      this.musicGain  = this.ctx.createGain();
      this.musicGain.gain.value = 0.4;
      this.musicGain.connect(this.master);

      this.sfxGain    = this.ctx.createGain();
      this.sfxGain.gain.value = 0.7;
      this.sfxGain.connect(this.master);

      this.initialized = true;
    } catch (e) {
      console.warn('AudioContext not available:', e);
    }
  }

  _resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  // ── Settings ─────────────────────────────────────────────────────────────────
  setMusic(enabled) {
    if (!this.initialized) return;
    this.musicGain.gain.value = enabled ? 0.4 : 0;
  }

  setSFX(enabled) {
    if (!this.initialized) return;
    this.sfxGain.gain.value = enabled ? 0.7 : 0;
  }

  // ── Sound FX playback ────────────────────────────────────────────────────────
  playSound(id) {
    if (!this.initialized || !this.game.player.settings.sfx) return;
    this._resume();
    const fn = this._sounds[id];
    if (fn) fn.call(this);
  }

  _sounds = {
    // Tower shots
    arrow_shot:     () => this._tone(880, 0.06, 'triangle', 0.08, 0.05),
    laser_shot:     () => this._noise(0.05, 0.12, 4000),
    ice_shot:       () => this._tone(660, 0.08, 'sine', 0.04, 0.15),
    poison_shot:    () => this._tone(200, 0.1, 'sawtooth', 0.06, 0.2),
    tesla_shot:     () => this._noise(0.12, 0.08, 8000),
    rocket_shot:    () => this._tone(120, 0.15, 'sawtooth', 0.08, 0.25),
    flame_shot:     () => this._noise(0.08, 0.3, 500),
    sniper_shot:    () => this._tone(440, 0.2, 'sawtooth', 0.02, 0.05),
    minigun_shot:   () => this._tone(300, 0.04, 'square', 0.03, 0.05),
    gravity_shot:   () => this._tone(100, 0.1, 'sine', 0.1, 0.3),
    plasma_shot:    () => this._noise(0.15, 0.15, 6000),
    dragon_shot:    () => this._tone(150, 0.2, 'sawtooth', 0.08, 0.4),

    // Impacts
    enemy_hit:      () => this._tone(200, 0.05, 'square', 0.02, 0.05),
    enemy_death:    () => this._tone(150, 0.15, 'sawtooth', 0.04, 0.2),
    crit_hit:       () => this._tone(1200, 0.1, 'sine', 0.02, 0.08),
    explosion:      () => this._noiseBurst(0.25, 0.3),
    boss_hit:       () => this._tone(80, 0.3, 'sawtooth', 0.05, 0.3),
    boss_death:     () => this._noiseBurst(0.5, 0.8),
    boss_roar:      () => this._tone(60, 0.4, 'sawtooth', 0.2, 0.6),

    // UI
    place_tower:    () => this._tone(880, 0.12, 'sine', 0.03, 0.1),
    sell_tower:     () => this._tone(440, 0.1, 'sine', 0.03, 0.1),
    upgrade:        () => this._arpeggio([440, 554, 659, 880], 0.08),
    level_up:       () => this._arpeggio([523, 659, 784, 1047], 0.15),
    wave_start:     () => this._tone(220, 0.3, 'sawtooth', 0.05, 0.3),
    wave_complete:  () => this._arpeggio([523, 659, 784, 1047, 1319], 0.2),
    life_lost:      () => this._tone(110, 0.3, 'sawtooth', 0.1, 0.4),
    error:          () => this._tone(200, 0.08, 'square', 0.03, 0.08),
    ultimate:       () => this._noiseBurst(0.35, 0.5),
    click:          () => this._tone(1000, 0.04, 'sine', 0.01, 0.03),
    reward:         () => this._arpeggio([659, 784, 988, 1319], 0.12),
    achievement:    () => this._arpeggio([523, 659, 784, 1047, 1319, 1568], 0.18),
    daily_claim:    () => this._arpeggio([440, 659, 880], 0.15),
  };

  _tone(freq, vol, type, attack, decay) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.connect(env);
    env.connect(this.sfxGain);
    osc.type      = type;
    osc.frequency.value = freq;
    const now     = ctx.currentTime;
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(vol, now + attack);
    env.gain.exponentialRampToValueAtTime(0.001, now + attack + decay);
    osc.start(now);
    osc.stop(now + attack + decay + 0.05);
  }

  _noise(vol, duration, cutoff) {
    const ctx    = this.ctx;
    const len    = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data   = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    const src    = ctx.createBufferSource();
    src.buffer   = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type  = 'lowpass';
    filter.frequency.value = cutoff;
    const env    = ctx.createGain();
    src.connect(filter);
    filter.connect(env);
    env.connect(this.sfxGain);
    const now    = ctx.currentTime;
    env.gain.setValueAtTime(vol, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + duration);
    src.start(now);
    src.stop(now + duration);
  }

  _noiseBurst(vol, duration) {
    this._noise(vol * 0.6, duration, 200);
    this._noise(vol * 0.4, duration * 0.5, 800);
    this._tone(80, vol * 0.3, 'sine', 0.02, duration * 0.4);
  }

  _arpeggio(freqs, vol) {
    const step = 0.08;
    freqs.forEach((f, i) => {
      setTimeout(() => this._tone(f, vol, 'sine', 0.01, 0.1), i * step * 1000);
    });
  }

  // ── Music system ─────────────────────────────────────────────────────────────
  playMusic(track) {
    if (!this.initialized || !this.game.player.settings.music) return;
    if (this._musicTrack === track) return;
    this._stopMusic();
    this._musicTrack = track;
    this._startMusicLoop(track);
  }

  pauseMusic() {
    if (this._musicSource) {
      try { this._musicSource.stop(); } catch (_) {}
      this._musicSource = null;
    }
  }

  resumeMusic() {
    if (this._musicTrack) this._startMusicLoop(this._musicTrack);
  }

  _stopMusic() {
    this.pauseMusic();
    this._musicTrack = null;
  }

  _startMusicLoop(track) {
    if (!this.initialized || !this.game.player.settings.music) return;
    this._resume();
    // Procedural ambient music using oscillator layers
    const ctx   = this.ctx;
    const gain  = this.musicGain;
    const dest  = this.ctx.createGain();
    dest.connect(gain);

    const configs = {
      menu: [
        { freq: 55,  type: 'sine',     gain: 0.15 },
        { freq: 110, type: 'sine',     gain: 0.08 },
        { freq: 220, type: 'triangle', gain: 0.06 },
      ],
      gameplay: [
        { freq: 65,  type: 'sawtooth', gain: 0.05 },
        { freq: 130, type: 'square',   gain: 0.04 },
        { freq: 195, type: 'triangle', gain: 0.06 },
        { freq: 260, type: 'sine',     gain: 0.04 },
      ],
      boss: [
        { freq: 40,  type: 'sawtooth', gain: 0.12 },
        { freq: 80,  type: 'sawtooth', gain: 0.08 },
        { freq: 120, type: 'square',   gain: 0.06 },
      ],
      victory: [
        { freq: 260, type: 'sine', gain: 0.1 },
        { freq: 330, type: 'sine', gain: 0.1 },
        { freq: 392, type: 'sine', gain: 0.1 },
        { freq: 520, type: 'sine', gain: 0.08 },
      ],
      defeat: [
        { freq: 80,  type: 'sine', gain: 0.1 },
        { freq: 100, type: 'sine', gain: 0.08 },
      ],
    };

    const layers = configs[track] || configs.menu;
    const nodes  = [];
    for (const cfg of layers) {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type  = cfg.type;
      osc.frequency.value = cfg.freq;
      // Add slight detuning for richness
      osc.detune.value = (Math.random() - 0.5) * 5;
      g.gain.value = cfg.gain;
      // Slow LFO for tremolo
      const lfo  = ctx.createOscillator();
      const lfoG = ctx.createGain();
      lfo.frequency.value = 0.2 + Math.random() * 0.3;
      lfoG.gain.value = 0.01;
      lfo.connect(lfoG);
      lfoG.connect(g.gain);
      osc.connect(g);
      g.connect(dest);
      osc.start();
      lfo.start();
      nodes.push({ osc, g, lfo, lfoG });
    }

    this._musicSource = {
      stop: () => {
        for (const n of nodes) {
          try { n.osc.stop(); n.lfo.stop(); } catch (_) {}
        }
      },
    };
    this._musicNodes = nodes;
  }

  // ── Haptics ───────────────────────────────────────────────────────────────────
  vibrate(pattern) {
    if (!this.game.player.settings.haptic) return;
    if (navigator.vibrate) navigator.vibrate(pattern);
  }
}
