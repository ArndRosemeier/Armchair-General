import { WorldMap, OCEAN, LAND } from './WorldMap';
import { Renderer } from './Renderer';
import { removeInlandLakes, removeSmallIslands } from './generateContinents';

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

  // --- Continent generation controls ---
  const controlsDiv = document.createElement('div');
  controlsDiv.style.margin = '8px';
  controlsDiv.style.display = 'inline-block';

  // Scale slider
  const scaleLabel = document.createElement('label');
  scaleLabel.textContent = 'Scale:';
  const scaleInput = document.createElement('input');
  scaleInput.type = 'range';
  scaleInput.min = '0.0001';
  scaleInput.max = '0.01';
  scaleInput.step = '0.0001';
  scaleInput.value = '0.0018';
  scaleInput.style.margin = '0 8px';
  scaleLabel.appendChild(scaleInput);
  const scaleValue = document.createElement('span');
  scaleValue.textContent = scaleInput.value;
  scaleLabel.appendChild(scaleValue);
  controlsDiv.appendChild(scaleLabel);

  // Threshold slider
  const thresholdLabel = document.createElement('label');
  thresholdLabel.textContent = ' Threshold:';
  const thresholdInput = document.createElement('input');
  thresholdInput.type = 'range';
  thresholdInput.min = '-1';
  thresholdInput.max = '1';
  thresholdInput.step = '0.01';
  thresholdInput.value = '-0.05';
  thresholdInput.style.margin = '0 8px';
  thresholdLabel.appendChild(thresholdInput);
  const thresholdValue = document.createElement('span');
  thresholdValue.textContent = thresholdInput.value;
  thresholdLabel.appendChild(thresholdValue);
  controlsDiv.appendChild(thresholdLabel);

  // Border strength slider
  const borderLabel = document.createElement('label');
  borderLabel.textContent = ' Border Strength:';
  const borderInput = document.createElement('input');
  borderInput.type = 'range';
  borderInput.min = '0';
  borderInput.max = '1';
  borderInput.step = '0.01';
  borderInput.value = '0.8';
  borderInput.style.margin = '0 8px';
  borderLabel.appendChild(borderInput);
  const borderValue = document.createElement('span');
  borderValue.textContent = borderInput.value;
  borderLabel.appendChild(borderValue);
  controlsDiv.appendChild(borderLabel);

  // Border width slider
  const widthLabel = document.createElement('label');
  widthLabel.textContent = ' Border Width:';
  const widthInput = document.createElement('input');
  widthInput.type = 'range';
  widthInput.min = '0';
  widthInput.max = '0.5';
  widthInput.step = '0.01';
  widthInput.value = '0.15';
  widthInput.style.margin = '0 8px';
  widthLabel.appendChild(widthInput);
  const widthValue = document.createElement('span');
  widthValue.textContent = widthInput.value;
  widthLabel.appendChild(widthValue);
  controlsDiv.appendChild(widthLabel);

  // Octaves slider
  const octavesLabel = document.createElement('label');
  octavesLabel.textContent = ' Octaves:';
  const octavesInput = document.createElement('input');
  octavesInput.type = 'range';
  octavesInput.min = '1';
  octavesInput.max = '8';
  octavesInput.step = '1';
  octavesInput.value = '6';
  octavesInput.style.margin = '0 8px';
  octavesLabel.appendChild(octavesInput);
  const octavesValue = document.createElement('span');
  octavesValue.textContent = octavesInput.value;
  octavesLabel.appendChild(octavesValue);
  controlsDiv.appendChild(octavesLabel);

  // Persistence slider
  const persistenceLabel = document.createElement('label');
  persistenceLabel.textContent = ' Persistence:';
  const persistenceInput = document.createElement('input');
  persistenceInput.type = 'range';
  persistenceInput.min = '0.3';
  persistenceInput.max = '0.8';
  persistenceInput.step = '0.01';
  persistenceInput.value = '0.5';
  persistenceInput.style.margin = '0 8px';
  persistenceLabel.appendChild(persistenceInput);
  const persistenceValue = document.createElement('span');
  persistenceValue.textContent = persistenceInput.value;
  persistenceLabel.appendChild(persistenceValue);
  controlsDiv.appendChild(persistenceLabel);

  // Seed input
  const seedLabel = document.createElement('label');
  seedLabel.textContent = ' Seed:';
  const seedInput = document.createElement('input');
  seedInput.type = 'number';
  seedInput.value = Math.floor(Math.random() * 100000).toString();
  seedInput.style.margin = '0 8px';
  seedLabel.appendChild(seedInput);
  controlsDiv.appendChild(seedLabel);

  container.appendChild(controlsDiv);

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
    let mapArray: number[][];
    if (toggle.checked) {
      mapArray = WorldMap.generateContinentsMap(mapWidth, mapHeight, {
        scale: parseFloat(scaleInput.value),
        threshold: parseFloat(thresholdInput.value),
        seed: parseInt(seedInput.value, 10),
        borderStrength: parseFloat(borderInput.value),
        borderWidth: parseFloat(widthInput.value),
        octaves: parseInt(octavesInput.value, 10),
        persistence: parseFloat(persistenceInput.value)
      });
    } else {
      mapArray = WorldMap.createMap(mapWidth, mapHeight);
    }
    currentMapArray = mapArray;
    const worldMap = new WorldMap(mapWidth, mapHeight);
    // Replace map with our generated one
    (worldMap as any).map = mapArray;
    // Remove old canvas
    canvasContainer.innerHTML = '';
    // Display with pan/zoom
    Renderer.displayWithPanZoom(worldMap, canvasContainer, width, height);
  }

  // Button to remove inland lakes
  const lakesButton = document.createElement('button');
  lakesButton.textContent = 'Remove Inland Lakes';
  lakesButton.style.margin = '8px';
  lakesButton.onclick = function() {
    if (!currentMapArray) return;
    const newMap = removeInlandLakes(currentMapArray, OCEAN, LAND);
    currentMapArray = newMap;
    const width = currentMapArray[0].length;
    const height = currentMapArray.length;
    const worldMap = new WorldMap(width, height);
    (worldMap as any).map = currentMapArray;
    canvasContainer.innerHTML = '';
    Renderer.displayWithPanZoom(worldMap, canvasContainer, width, height);
  };


  button.onclick = createAndShowMap;
  toggle.onchange = createAndShowMap;
  scaleInput.oninput = () => { scaleValue.textContent = scaleInput.value; createAndShowMap(); };
  thresholdInput.oninput = () => { thresholdValue.textContent = thresholdInput.value; createAndShowMap(); };
  borderInput.oninput = () => { borderValue.textContent = borderInput.value; createAndShowMap(); };
  widthInput.oninput = () => { widthValue.textContent = widthInput.value; createAndShowMap(); };
  octavesInput.oninput = () => { octavesValue.textContent = octavesInput.value; createAndShowMap(); };
  persistenceInput.oninput = () => { persistenceValue.textContent = persistenceInput.value; createAndShowMap(); };
  seedInput.onchange = createAndShowMap;
  createAndShowMap();
}

// Run the GUI setup on load
document.addEventListener('DOMContentLoaded', createTestGUI);
