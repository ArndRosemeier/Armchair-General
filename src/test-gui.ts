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


  // Width and height controls
  const sizeDiv = document.createElement('div');
  sizeDiv.style.margin = '8px';
  sizeDiv.style.display = 'inline-block';

  const widthLabel = document.createElement('label');
  widthLabel.textContent = 'Width:';
  const widthInput = document.createElement('input');
  widthInput.type = 'number';
  widthInput.value = '1280';
  widthInput.step = '1';
  widthInput.min = '1';
  widthInput.style.margin = '0 8px';
  widthLabel.appendChild(widthInput);
  sizeDiv.appendChild(widthLabel);

  const heightLabel = document.createElement('label');
  heightLabel.textContent = ' Height:';
  const heightInput = document.createElement('input');
  heightInput.type = 'number';
  heightInput.value = '800';
  heightInput.step = '1';
  heightInput.min = '1';
  heightInput.style.margin = '0 8px';
  heightLabel.appendChild(heightInput);
  sizeDiv.appendChild(heightLabel);

  // Country count control
  const countryDiv = document.createElement('div');
  countryDiv.style.margin = '8px';
  countryDiv.style.display = 'inline-block';

  const countryCountLabel = document.createElement('label');
  countryCountLabel.textContent = 'Countries:';
  const countryCountInput = document.createElement('input');
  countryCountInput.type = 'number';
  countryCountInput.value = '40';
  countryCountInput.step = '1';
  countryCountInput.min = '1';
  countryCountInput.style.margin = '0 8px';
  countryCountLabel.appendChild(countryCountInput);
  countryDiv.appendChild(countryCountLabel);
  container.appendChild(countryDiv);

  container.appendChild(sizeDiv);

  // Create button
  const button = document.createElement('button');
  button.textContent = 'Create WorldMap';
  button.style.margin = '8px';
  container.appendChild(button);

  // Canvas container
  const canvasContainer = document.createElement('div');
  container.appendChild(canvasContainer);

  function createAndShowMap() {
    // Read width, height, and country count from input fields
    const width = parseInt(widthInput.value, 10) || 1280;
    const height = parseInt(heightInput.value, 10) || 800;
    const countryCount = parseInt(countryCountInput.value, 10) || 40;
    // Use WorldMap.createMap to generate a full world map
    const worldMap = WorldMap.createMap(width, height, countryCount);
    canvasContainer.innerHTML = '';
    Renderer.displayWithPanZoom(worldMap, canvasContainer, width, height);
  }

  button.onclick = createAndShowMap;
  createAndShowMap();

}

// Run the GUI setup on load
document.addEventListener('DOMContentLoaded', createTestGUI);
