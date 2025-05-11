import { createTestGUI } from './test-gui';

const app = document.getElementById('app');

if (app) {
  app.innerHTML = '';
  createTestGUI();
} else {
  throw new Error('No app element found in index.html');
}
