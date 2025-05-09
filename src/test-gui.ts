import { WorldMap, OCEAN, LAND } from './WorldMap';
import { Renderer } from './Renderer';
import { removeInlandLakes, removeSmallIslands, generateDefaultContinentsMap } from './generateContinents';

function createTestGUI() {
  // Set up main container
  const container = document.getElementById('app') || document.body;
  container.innerHTML = '';

  // Map type toggle
  const toggleLabel = document.createElement('label');
  toggleLabel.textContent = 'Continents';
  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.checked = true;
  toggle.style.margin = '8px';
  toggleLabel.prepend(toggle);
  container.appendChild(toggleLabel);


  // Create button
  const button = document.createElement('button');
  button.textContent = 'Create WorldMap';
  button.style.margin = '8px';
  container.appendChild(button);

  // Canvas container
  const canvasContainer = document.createElement('div');
  container.appendChild(canvasContainer);

  let currentMapArray: number[][] | null = null;

  function createAndShowMap() {
    // Get screen width and set map size
    const width = Math.floor(window.innerWidth * 0.95);
    const height = Math.floor(window.innerHeight * 0.7);
    const mapWidth = Math.floor(width); // 1 pixel per cell
    const mapHeight = Math.floor(height);
    // Always use the default continent generator
    const mapArray = generateDefaultContinentsMap(mapWidth, mapHeight);
    currentMapArray = mapArray;
    const worldMap = new WorldMap(mapWidth, mapHeight);
    (worldMap as any).map = mapArray;
    canvasContainer.innerHTML = '';
    Renderer.displayWithPanZoom(worldMap, canvasContainer, width, height);
  }

  button.onclick = createAndShowMap;
  createAndShowMap();
}

// Run the GUI setup on load
document.addEventListener('DOMContentLoaded', createTestGUI);
