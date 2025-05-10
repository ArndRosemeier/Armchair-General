import { WorldMap, OCEAN, LAND } from './WorldMap';

export class Renderer {
  // 100 visually distinct colors (cycled if more countries)
  private static countryColors: [number, number, number][] = [
    [230, 25, 75], [60, 180, 75], [255, 225, 25], [0, 130, 200], [245, 130, 48],
    [145, 30, 180], [70, 240, 240], [240, 50, 230], [210, 245, 60], [250, 190, 190],
    [0, 128, 128], [230, 190, 255], [170, 110, 40], [255, 250, 200], [128, 0, 0],
    [170, 255, 195], [128, 128, 0], [255, 215, 180], [0, 0, 128], [128, 128, 128],
    [255, 255, 255], [0, 0, 0], [255, 99, 71], [255, 140, 0], [154, 205, 50],
    [0, 191, 255], [46, 139, 87], [255, 20, 147], [218, 112, 214], [255, 182, 193],
    [255, 160, 122], [189, 183, 107], [255, 69, 0], [124, 252, 0], [0, 255, 255],
    [255, 215, 0], [0, 206, 209], [148, 0, 211], [255, 105, 180], [255, 228, 225],
    [0, 255, 127], [255, 248, 220], [199, 21, 133], [255, 255, 0], [0, 250, 154],
    [220, 20, 60], [0, 255, 0], [0, 0, 255], [255, 0, 255], [255, 228, 181],
    [255, 222, 173], [255, 239, 213], [255, 218, 185], [255, 228, 196], [255, 240, 245],
    [255, 250, 240], [240, 255, 240], [245, 255, 250], [240, 255, 255], [240, 248, 255],
    [248, 248, 255], [245, 245, 245], [220, 220, 220], [211, 211, 211], [192, 192, 192],
    [169, 169, 169], [128, 128, 128], [105, 105, 105], [119, 136, 153], [112, 128, 144],
    [47, 79, 79], [0, 0, 0], [255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0],
    [0, 255, 255], [255, 0, 255], [192, 0, 0], [0, 192, 0], [0, 0, 192], [192, 192, 0],
    [0, 192, 192], [192, 0, 192], [128, 0, 0], [0, 128, 0], [0, 0, 128], [128, 128, 0],
    [0, 128, 128], [128, 0, 128], [255, 128, 0], [128, 255, 0], [0, 255, 128],
    [0, 128, 255], [128, 0, 255], [255, 0, 128], [128, 128, 255], [255, 128, 128],
    [128, 255, 128], [128, 128, 128]
  ];

  static render(worldMap: WorldMap): HTMLCanvasElement {
    const map = worldMap.getMap();
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
        const [r, g, b] = Renderer.getRGBForValue(value);
        const idx = (y * width + x) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255; // alpha
      }
    }
    ctx.putImageData(imgData, 0, 0);
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

  private static getRGBForValue(value: number): [number, number, number] {
    if (value === OCEAN) return [30, 144, 255]; // blue
    if (value === LAND) return [34, 139, 34];   // green
    if (value >= 0) {
      // Use distinct color for each country (cycle through palette if >100)
      const idx = Math.floor(value) % Renderer.countryColors.length;
      return Renderer.countryColors[idx];
    }
    return [0, 0, 0];                          // fallback
  }

  private static getColorForValue(value: number): string {
    if (value === OCEAN) return '#1e90ff'; // blue
    if (value === LAND) return '#228B22'; // green
    if (value >= 0) {
      const idx = Math.floor(value) % Renderer.countryColors.length;
      const [r, g, b] = Renderer.countryColors[idx];
      return `rgb(${r},${g},${b})`;
    }
    return '#000'; // fallback
  }
}
