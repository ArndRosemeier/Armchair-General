import { GameGui } from './GameGui';
import { showStartupAnimation } from './StartupAnimation';

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
        // Optionally, could trigger a re-render or focus here
      });
    }
  }, 0);
} else {
  throw new Error('No app element found in index.html');
}
