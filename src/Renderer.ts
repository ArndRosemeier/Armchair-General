import { WorldMap, OCEAN, LAND } from './WorldMap';
import { Country } from './Country';

export class Renderer {
  // Generate a visually distinct color for each country using HSL
  // Robust HSL-to-RGB conversion; never produces black for valid indices



  static drawBorders: boolean = true;

  /**
   * Renders the world map. Optionally highlights given countries with a yellow overlay.
   * @param worldMap The WorldMap to render
   * @param highlightedCountries Optional array of countries to highlight
   * @param highlightCountries Optional array of countries whose names should be rendered in light green
   * @param showArmies If true, display army count under each country name
   * @param currentPlayer The player whose knowledge is used for conditional army display
   */
  static render(worldMap: WorldMap, highlightedCountries: any[] = [], highlightCountries: Country[] = [], showArmies: boolean = false, currentPlayer: any = null): HTMLCanvasElement {
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
    // Highlight countries with a yellow overlay
    if (highlightedCountries && highlightedCountries.length > 0) {
      for (const country of highlightedCountries) {
        if (!country || !country.coordinates) continue;
        for (const [x, y] of country.coordinates) {
          if (x >= 0 && x < width && y >= 0 && y < height) {
            const idx = (y * width + x) * 4;
            // Overlay semi-transparent yellow (blend with base color)
            data[idx] = Math.min(255, Math.round(0.6 * 255 + 0.4 * data[idx]));     // R
            data[idx + 1] = Math.min(255, Math.round(0.6 * 255 + 0.4 * data[idx + 1])); // G
            data[idx + 2] = Math.round(0.4 * data[idx + 2]); // B
            data[idx + 3] = 255; // keep fully opaque
          }
        }
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
      
      // Check if this country should have its name highlighted
      const shouldHighlight = highlightCountries.some(c => c === country);
      
      // Draw text with appropriate color - light green for highlighted countries, white for others
      ctx.fillStyle = shouldHighlight ? '#90EE90' : 'white';  // Light green for highlighted countries
      ctx.fillText(displayName, cx, cy);
      // --- Army display logic ---
      let showArmy = false;
      if (showArmies) {
        showArmy = true;
      } else if (currentPlayer && country.owner === currentPlayer && !currentPlayer.isAI) {
        showArmy = true;
      } else if (currentPlayer && typeof currentPlayer.armyKnown === 'function' && currentPlayer.armyKnown(country) && !currentPlayer.isAI) {
        showArmy = true;
      }
      if (showArmy) {
        const armies = country.armies || 0;
        const armiesText = `${Math.round(armies / 1000)}k`;
        ctx.font = 'bold 9px Verdana, Geneva, sans-serif';
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'black';
        ctx.strokeText(armiesText, cx, cy + 13);
        ctx.fillStyle = '#FFD700'; // gold/yellow for armies
        ctx.fillText(armiesText, cx, cy + 13);
        ctx.font = 'bold 10px Verdana, Geneva, sans-serif'; // restore font
      }
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
   * @param highlightCountries Optional array of countries whose names should be rendered in light green
   * @returns The interactive canvas element
   */
  static displayWithPanZoom(
    worldMap: WorldMap,
    container: HTMLElement,
    initialWidth: number = 512,
    initialHeight: number = 512,
    highlightCountries: Country[] = []
  ): HTMLCanvasElement {
    // Render to offscreen canvas (1 pixel per cell)
    let highlightedCountry: any = null;
    let offscreen = Renderer.render(worldMap, [], highlightCountries);
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
      // Re-render offscreen with highlight if needed
      offscreen = Renderer.render(worldMap, highlightedCountry ? [highlightedCountry] : [], highlightCountries);
      ctx!.setTransform(1, 0, 0, 1, 0, 0); // reset
      ctx!.clearRect(0, 0, canvas.width, canvas.height);
      ctx!.setTransform(scale, 0, 0, scale, offsetX, offsetY);
      ctx!.drawImage(offscreen, 0, 0);
    }

    // Mouse events for panning and highlighting
    canvas.addEventListener('mousedown', (e) => {
      // Convert mouse position to map coordinates
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - offsetX) / scale;
      const mouseY = (e.clientY - rect.top - offsetY) / scale;
      // Find the country at this position
      const map = worldMap.getMap();
      const countries = worldMap.getCountries();
      const x = Math.floor(mouseX);
      const y = Math.floor(mouseY);
      let clickedCountry = null;
      if (x >= 0 && y >= 0 && y < map.length && x < map[0].length) {
        const value = map[y][x];
        if (value >= 0 && countries[value]) {
          clickedCountry = countries[value];
        }
      }
      if (clickedCountry) {
        highlightedCountry = clickedCountry;
        draw();
        // Do not start panning if a country was clicked
        return;
      } 
      // Otherwise, start panning
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
          if (rgb.length === 3 && rgb.every((v: number) => !isNaN(v))) {
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

  /**
   * Draws a multi-layered glow/contour effect for a country using its border and coordinates.
   * @param ctx CanvasRenderingContext2D
   * @param country Country object (must have .border and .coordinates)
   * @param colorStart [r,g,b] array for the outermost border
   * @param colorEnd [r,g,b] array for the innermost border and fill
   */
  static drawCountryGlow(ctx: CanvasRenderingContext2D, country: Country, colorStart: [number, number, number], colorEnd: [number, number, number]) {
    // Helper to interpolate between two colors
    function lerpColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
      return [
        Math.round(a[0] + (b[0] - a[0]) * t),
        Math.round(a[1] + (b[1] - a[1]) * t),
        Math.round(a[2] + (b[2] - a[2]) * t),
      ];
    }
    // Use a Set for fast lookup and eroding
    let pixels = new Set(country.coordinates.map(([x, y]) => `${x},${y}`));
    for (let layer = 0; layer < 10; ++layer) {
      // Find border pixels in current shape
      const border: [number, number][] = [];
      for (const key of pixels) {
        const [x, y] = key.split(',').map(Number);
        // 4-connected neighbors
        const neighbors = [
          [x-1, y], [x+1, y], [x, y-1], [x, y+1]
        ];
        for (const [nx, ny] of neighbors) {
          if (!pixels.has(`${nx},${ny}`)) {
            border.push([x, y]);
            break;
          }
        }
      }
      // Interpolate color for this layer
      const t = layer / 9;
      const color = lerpColor(colorStart, colorEnd, t);
      ctx.save();
      ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
      for (const [x, y] of border) {
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.restore();
      // Erode: remove border pixels
      for (const [x, y] of border) {
        pixels.delete(`${x},${y}`);
      }
      if (pixels.size === 0) break;
    }
    // Fill the remaining interior with colorEnd
    ctx.save();
    ctx.fillStyle = `rgb(${colorEnd[0]},${colorEnd[1]},${colorEnd[2]})`;
    for (const key of pixels) {
      const [x, y] = key.split(',').map(Number);
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.restore();
  }
}
