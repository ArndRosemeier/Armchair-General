import { GameGui } from './GameGui';

const app = document.getElementById('app');

if (app) {
  const game = new GameGui();
  app.innerHTML = '';
  game.mount(app);
} else {
  throw new Error('No app element found in index.html');
}
