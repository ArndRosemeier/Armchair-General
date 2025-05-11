import { WorldMap, OCEAN, LAND } from './WorldMap';
import { Renderer } from './Renderer';
import { removeInlandLakes, removeSmallIslands, generateDefaultContinentsMap } from './generateContinents';
import { CountryGenerator, generateDefaultCountries } from './generateCountries';

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

  // Resistance and country controls
  const resistanceDiv = document.createElement('div');
  resistanceDiv.style.margin = '8px';
  resistanceDiv.style.display = 'inline-block';

  // Country count
  const countryCountLabel = document.createElement('label');
  countryCountLabel.textContent = 'Countries:';
  const countryCountInput = document.createElement('input');
  countryCountInput.type = 'number';
  countryCountInput.value = '40';
  countryCountInput.step = '1';
  countryCountInput.min = '1';
  countryCountInput.style.margin = '0 8px';
  countryCountLabel.appendChild(countryCountInput);
  resistanceDiv.appendChild(countryCountLabel);

  const minResLabel = document.createElement('label');
  minResLabel.textContent = ' Min Resistance:';
  const minResInput = document.createElement('input');
  minResInput.type = 'number';
  minResInput.value = '10';
  minResInput.step = '1';
  minResInput.style.margin = '0 8px';
  minResLabel.appendChild(minResInput);
  resistanceDiv.appendChild(minResLabel);

  const maxResLabel = document.createElement('label');
  maxResLabel.textContent = ' Max Resistance:';
  const maxResInput = document.createElement('input');
  maxResInput.type = 'number';
  maxResInput.value = '50';
  maxResInput.step = '1';
  maxResInput.style.margin = '0 8px';
  maxResLabel.appendChild(maxResInput);
  resistanceDiv.appendChild(maxResLabel);

  const skipProbLabel = document.createElement('label');
  skipProbLabel.textContent = ' Skip Probability:';
  const skipProbInput = document.createElement('input');
  skipProbInput.type = 'number';
  skipProbInput.value = '0.9';
  skipProbInput.step = '0.01';
  skipProbInput.min = '0';
  skipProbInput.max = '1';
  skipProbInput.style.margin = '0 8px';
  skipProbLabel.appendChild(skipProbInput);
  resistanceDiv.appendChild(skipProbLabel);

  container.appendChild(resistanceDiv);

  // Button to generate countries
  const countryButton = document.createElement('button');
  countryButton.textContent = 'Generate Countries';
  countryButton.style.margin = '8px';
  countryButton.disabled = true;
  container.appendChild(countryButton);

  let currentMapArray: number[][] | null = null;

  function createAndShowMap() {
    // Get screen width and set map size
    const width = 1280;
    const height = 800;
    const mapWidth = width; // 1 pixel per cell
    const mapHeight = height;
    // Always use the default continent generator
    const mapArray = generateDefaultContinentsMap(mapWidth, mapHeight);
    currentMapArray = mapArray;
    const worldMap = new WorldMap(mapWidth, mapHeight);
    (worldMap as any).map = mapArray;
    canvasContainer.innerHTML = '';
    Renderer.displayWithPanZoom(worldMap, canvasContainer, width, height);
    countryButton.disabled = false;
  }

  button.onclick = createAndShowMap;
  createAndShowMap();

  countryButton.onclick = function() {
    if (!currentMapArray) return;
    // Always use 40 as the country count and default values for all other parameters
    const countryMap = generateDefaultCountries(currentMapArray, 40);
    // Do not overwrite currentMapArray, so repeated clicks use the original land/sea map
    const width = countryMap[0].length;
    const height = countryMap.length;
    const worldMap = new WorldMap(width, height);
    (worldMap as any).map = countryMap;
    canvasContainer.innerHTML = '';
    Renderer.displayWithPanZoom(worldMap, canvasContainer, width, height);
  };
}

// Run the GUI setup on load
document.addEventListener('DOMContentLoaded', createTestGUI);
