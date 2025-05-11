import { WorldMap, OCEAN, LAND } from './WorldMap';

export class Renderer {
  // Generate a visually distinct color for each country using HSL
  // Robust HSL-to-RGB conversion; never produces black for valid indices



  static drawBorders: boolean = true;

  static render(worldMap: WorldMap): HTMLCanvasElement {
    const map = worldMap.getMap();
    const countries = worldMap.getCountries?.() || [];
    // Log all home country names
    const height = map.length;
    const width = map[0].length;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const value = map[y][x];
        const [r, g, b] = Renderer.getRGBForValue(value, countries);
        const idx = (y * width + x) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255; // alpha
      }
    }
    // Draw black border for all land/country cells bordering ocean or out-of-bounds

    // Draw country borders using the border property
    if (Renderer.drawBorders) {
      for (const country of countries) {
        // Determine border color: bright orange for home country, black otherwise
        const isHome = country.owner && country.owner.homeCountry === country;
        const borderColor = isHome ? [255, 140, 0] : [0, 0, 0];
        for (const [x, y] of country.border || []) {
          if (isHome) {
            // For home countries, draw a 3x3 square centered at (x, y)
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  const nidx = (ny * width + nx) * 4;
                  data[nidx] = borderColor[0];
                  data[nidx + 1] = borderColor[1];
                  data[nidx + 2] = borderColor[2];
                  data[nidx + 3] = 255;
                }
              }
            }
          } else {
            // For non-home countries, draw a single pixel
            if (x >= 0 && x < width && y >= 0 && y < height) {
              const idx = (y * width + x) * 4;
              data[idx] = borderColor[0];
              data[idx + 1] = borderColor[1];
              data[idx + 2] = borderColor[2];
              data[idx + 3] = 255;
            }
          }
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Draw country names at their centers
    ctx.save();
    ctx.font = 'bold 10px Verdana, Geneva, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const country of countries) {
      if (!country.name) continue;
      const [cx, cy] = country.center ? country.center() : [0, 0];
      // Prefix with tower icon if fortified
      const displayName = country.fortified ? '🛡️ ' + country.name : country.name;
      // Draw black outline for contrast
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'black';
      ctx.strokeText(displayName, cx, cy);
      // Draw white text
      ctx.fillStyle = 'white';
      ctx.fillText(displayName, cx, cy);
    }
    ctx.restore();
    return canvas;
  }

  /**
   * Displays the rendered map in a canvas with pan and zoom controls.
   * @param worldMap The WorldMap to render
   * @param container The HTML element to append the interactive canvas to
   * @param initialWidth Optional: display canvas width (default: 512)
   * @param initialHeight Optional: display canvas height (default: 512)
   * @returns The interactive canvas element
   */
  static displayWithPanZoom(
    worldMap: WorldMap,
    container: HTMLElement,
    initialWidth: number = 512,
    initialHeight: number = 512
  ): HTMLCanvasElement {
    // Render to offscreen canvas (1 pixel per cell)
    const offscreen = Renderer.render(worldMap);
    const mapWidth = offscreen.width;
    const mapHeight = offscreen.height;

    // Create visible canvas
    const canvas = document.createElement('canvas');
    canvas.width = initialWidth;
    canvas.height = initialHeight;
    canvas.style.border = '1px solid #888';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Pan/zoom state
    let scale = Math.min(canvas.width / mapWidth, canvas.height / mapHeight);
    let offsetX = (canvas.width - mapWidth * scale) / 2;
    let offsetY = (canvas.height - mapHeight * scale) / 2;
    let isPanning = false;
    let lastX = 0;
    let lastY = 0;

    function draw() {
      ctx!.setTransform(1, 0, 0, 1, 0, 0); // reset
      ctx!.clearRect(0, 0, canvas.width, canvas.height);
      ctx!.setTransform(scale, 0, 0, scale, offsetX, offsetY);
      ctx!.drawImage(offscreen, 0, 0);
    }

    // Mouse events for panning
    canvas.addEventListener('mousedown', (e) => {
      isPanning = true;
      lastX = e.clientX;
      lastY = e.clientY;
    });
    window.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      offsetX += dx;
      offsetY += dy;
      lastX = e.clientX;
      lastY = e.clientY;
      draw();
    });
    window.addEventListener('mouseup', () => {
      isPanning = false;
    });

    // Wheel for zooming
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const mouseX = e.offsetX;
      const mouseY = e.offsetY;
      const zoom = Math.exp(-e.deltaY * 0.001);
      // Zoom around mouse position
      offsetX = mouseX - (mouseX - offsetX) * zoom;
      offsetY = mouseY - (mouseY - offsetY) * zoom;
      scale *= zoom;
      draw();
    });

    draw();
    return canvas;
  }

  private static getRGBForValue(value: number, countries: any[]): [number, number, number] {
    if (value === OCEAN) return [30, 144, 255]; // blue
    if (value === LAND) return [34, 139, 34];   // green
    if (value >= 0) {
      const country = countries[value];
      if (country) {
        // If the country has an owner with RGBColor, use that
        if (country.owner && typeof country.owner.RGBColor === 'string') {
          const rgb = country.owner.RGBColor.split(',').map(Number);
          if (rgb.length === 3 && rgb.every(v => !isNaN(v))) {
            return [rgb[0], rgb[1], rgb[2]];
          }
        }
        // Otherwise use the country's own color property
        if (country.color) {
          return country.color;
        }
      }
      // fallback if not available
      return [200, 200, 200];
    }
    return [255, 255, 255]; // fallback (should not happen, now white)
  }
}
