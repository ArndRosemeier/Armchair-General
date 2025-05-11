import { GameGui } from './GameGui';

const app = document.getElementById('app');

if (app) {
  app.innerHTML = '';
  const gui = new GameGui();
  gui.mount(app);
} else {
  throw new Error('No app element found in index.html');
}
