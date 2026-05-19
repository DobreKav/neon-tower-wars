// === FILE: main.js ===
// Entry point – bootstraps the game after DOM and assets are ready

import { Game } from './src/game.js';

let game = null;

async function init() {
  // Request fullscreen on mobile
  const tryFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  };

  // Prevent context menu and default touch behaviors
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('touchstart', e => {
    if (e.touches.length > 1) e.preventDefault(); // prevent pinch-zoom
  }, { passive: false });

  document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

  // Android WebView: disable overscroll
  document.body.style.overscrollBehavior = 'none';

  // Create and start the game
  game = new Game();
  await game.init();

  // Register service worker for PWA/offline support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }

  // Try fullscreen on first user gesture
  document.addEventListener('click', tryFullscreen, { once: true });
  document.addEventListener('touchend', tryFullscreen, { once: true });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
