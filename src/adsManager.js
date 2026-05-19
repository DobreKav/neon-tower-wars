// === FILE: src/adsManager.js ===
// AdMob rewarded ads integration – non-intrusive, player-initiated only
// Implements placement rules: NO ads during combat, NO forced ads, NO popups
import { STATE } from './constants.js';

export const AD_PLACEMENT = {
  DOUBLE_WAVE_REWARD:   'double_wave_reward',
  CONTINUE_AFTER_DEFEAT:'continue_after_defeat',
  DOUBLE_VICTORY:       'double_victory_reward',
  DAILY_BONUS:          'daily_bonus_gems',
};

export class AdsManager {
  constructor(game) {
    this.game         = game;
    this._adReady     = false;
    this._loading     = false;
    this._usedToday   = {};  // placement → count
    this._lastResetDay= 0;
    this._callbacks   = {};  // placement → { onRewarded, onClosed }
    this._adUnitIds   = {
      rewarded: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // Replace with real AdMob ID
    };
    this._init();
  }

  _init() {
    // Reset daily counts
    const today = new Date().toDateString();
    if (this._lastResetDay !== today) {
      this._usedToday   = {};
      this._lastResetDay = today;
    }

    // Preload if AdMob SDK is present (Capacitor/Cordova context)
    if (typeof admob !== 'undefined') {
      this._preloadAd();
    } else {
      // Browser fallback: simulate ad availability after 2s
      setTimeout(() => { this._adReady = true; }, 2000);
    }
  }

  _preloadAd() {
    if (this._loading) return;
    this._loading = true;
    if (typeof admob !== 'undefined') {
      admob.rewardVideo.config({
        id: this._adUnitIds.rewarded,
        autoShow: false,
      });
      admob.rewardVideo.prepare()
        .then(() => { this._adReady = true; this._loading = false; })
        .catch(() => { this._adReady = false; this._loading = false; });
    }
  }

  // ── Guard: never show ad during active wave ──────────────────────────────────
  canShowAd(placement) {
    if (this.game.waveActive) return false; // CRITICAL: no ads during combat
    if (this.game.state === STATE.PLAYING) return false;
    const limit = 3; // max 3 rewarded ads per day per placement
    return (this._usedToday[placement] || 0) < limit;
  }

  // ── Show rewarded ad ─────────────────────────────────────────────────────────
  showRewarded(placement, onRewarded, onClosed) {
    if (!this.canShowAd(placement)) {
      onClosed && onClosed(false);
      return;
    }

    this._usedToday[placement] = (this._usedToday[placement] || 0) + 1;
    this._callbacks[placement] = { onRewarded, onClosed };

    if (typeof admob !== 'undefined' && this._adReady) {
      admob.rewardVideo.show()
        .then(() => {
          onRewarded && onRewarded();
          this._adReady = false;
          this._preloadAd(); // Preload next ad
        })
        .catch(() => {
          onClosed && onClosed(false);
        });
    } else {
      // Development fallback: simulate rewarded ad
      this._showSimulatedAd(placement, onRewarded, onClosed);
    }
  }

  // ── Simulated ad for browser/dev testing ────────────────────────────────────
  _showSimulatedAd(placement, onRewarded, onClosed) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      color:#fff;font-family:monospace;font-size:16px;text-align:center;gap:16px;
    `;
    const msg = document.createElement('div');
    msg.textContent = '📺 Simulated Rewarded Ad';
    msg.style.fontSize = '20px';

    const bar = document.createElement('div');
    bar.style.cssText = 'width:200px;height:6px;background:#333;border-radius:3px;overflow:hidden;';
    const fill = document.createElement('div');
    fill.style.cssText = 'height:100%;width:0%;background:#00f5ff;transition:width 0.1s linear;';
    bar.appendChild(fill);

    const timer = document.createElement('div');
    timer.style.color = '#94a3b8';

    const skip = document.createElement('button');
    skip.style.cssText = `
      background:#1e2d4a;color:#94a3b8;border:1px solid #1e2d4a;padding:8px 20px;
      border-radius:8px;cursor:not-allowed;font-size:14px;margin-top:8px;
    `;
    skip.textContent = 'Skip Ad (5)';
    skip.disabled = true;

    overlay.append(msg, bar, timer, skip);
    document.body.appendChild(overlay);

    let elapsed = 0;
    const duration = 5;
    const interval = setInterval(() => {
      elapsed += 0.1;
      const pct = Math.min((elapsed / duration) * 100, 100);
      fill.style.width = pct + '%';
      const remaining = Math.max(0, Math.ceil(duration - elapsed));
      timer.textContent = `${remaining}s remaining`;

      if (elapsed >= duration) {
        clearInterval(interval);
        skip.textContent = 'Collect Reward';
        skip.style.background    = '#00f5ff';
        skip.style.color         = '#000';
        skip.style.borderColor   = '#00f5ff';
        skip.style.cursor        = 'pointer';
        skip.disabled = false;
      } else {
        const remaining2 = Math.max(0, Math.ceil(duration - elapsed));
        skip.textContent = `Skip Ad (${remaining2})`;
        if (elapsed >= 2) {
          skip.style.borderColor = '#1e2d4a';
          skip.style.cursor      = 'default';
        }
      }
    }, 100);

    skip.addEventListener('click', () => {
      if (!skip.disabled || elapsed >= duration) {
        clearInterval(interval);
        document.body.removeChild(overlay);
        onRewarded && onRewarded();
        onClosed   && onClosed(true);
      }
    });
  }

  // ── Specific placement helpers ───────────────────────────────────────────────
  showDoubleWaveReward(goldAmount, gemAmount, onComplete) {
    this.showRewarded(
      AD_PLACEMENT.DOUBLE_WAVE_REWARD,
      () => {
        this.game.addGold(goldAmount);
        if (gemAmount > 0) this.game.addGems(gemAmount);
        this.game.ui.showToast(`2× Reward! +${goldAmount * 2} gold`, 'reward');
        onComplete && onComplete();
      },
      null
    );
  }

  showContinueAfterDefeat(onComplete) {
    this.showRewarded(
      AD_PLACEMENT.CONTINUE_AFTER_DEFEAT,
      () => {
        this.game.continueAfterDefeat(5);
        this.game.ui.showToast('Continued with 5 lives!', 'success');
        onComplete && onComplete();
      },
      null
    );
  }

  showDailyBonus(onComplete) {
    this.showRewarded(
      AD_PLACEMENT.DAILY_BONUS,
      () => {
        const bonusGems = 5;
        this.game.addGems(bonusGems);
        this.game.ui.showToast(`Bonus +${bonusGems} Gems!`, 'reward');
        onComplete && onComplete();
      },
      null
    );
  }

  // Called by AdMob plugin or skip-ad button when the ad overlay closes
  _onAdClosed() {
    this._adReady = false;
    this._loading = false;
    this._preloadAd();
  }
}
