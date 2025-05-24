import { GameGui } from './GameGui';
import { showStartupAnimation } from './StartupAnimation';
import { showBalloonAnimation } from './BalloonAnimation';

const app = document.getElementById('app');

if (app) {
  app.innerHTML = '';
  // Render the main GUI first (so map area exists)
  const gui = new GameGui();
  gui.mount(app);
  // Wait for the map area to be in the DOM
  setTimeout(() => {
    const mapArea = app.querySelector('div[style*="flex: 3"]');
    if (mapArea) {
      showStartupAnimation(mapArea as HTMLElement, () => {
        // Play balloon animation ONCE, no loop, no stop button
        showBalloonAnimation(mapArea as HTMLElement, () => {
          // Do nothing after balloon animation ends
        });
      });
    }
  }, 0);
} else {
  throw new Error('No app element found in index.html');
}
