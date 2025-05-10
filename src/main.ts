import { Game } from './Game';

const app = document.getElementById('app');

if (app) {
  const game = new Game();
  app.innerHTML = '';
  game.mount(app);
} else {
  throw new Error('No app element found in index.html');
}
