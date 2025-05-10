// Continent map generation using simplex-noise
import { OCEAN, LAND } from './WorldMap';
import { createNoise2D } from 'simplex-noise';

/**
 * Generates a 2D map with natural-looking continents using simplex noise.
 * @param width Width of the map
 * @param height Height of the map
 * @param options Optional: scale (zoom), threshold (land/ocean), seed
 */
export function removeSmallIslands(map: number[][], oceanValue: number, landValue: number, minIslandSize: number = 1000): number[][] {
  const height = map.length;
  const width = map[0]?.length || 0;
  const visited = Array.from({ length: height }, () => Array(width).fill(false));
  const dirs = [[1,0], [-1,0], [0,1], [0,-1]];
  const result = map.map(row => row.slice());

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!visited[y][x] && map[y][x] === landValue) {
        // BFS to collect island
        const queue: [number, number][] = [[y, x]];
        const island: [number, number][] = [[y, x]];
        visited[y][x] = true;
        while (queue.length) {
          const [cy, cx] = queue.shift()!;
          for (const [dy, dx] of dirs) {
            const ny = cy + dy, nx = cx + dx;
            if (ny >= 0 && ny < height && nx >= 0 && nx < width && !visited[ny][nx] && map[ny][nx] === landValue) {
              visited[ny][nx] = true;
              queue.push([ny, nx]);
              island.push([ny, nx]);
            }
          }
        }
        // Remove small island
        if (island.length < minIslandSize) {
          for (const [iy, ix] of island) {
            result[iy][ix] = oceanValue;
          }
        }
      }
    }
  }
  return result;
}

export function removeInlandLakes(map: number[][], oceanValue: number, landValue: number): number[][] {
  const height = map.length;
  const width = map[0]?.length || 0;
  const visited = Array.from({ length: height }, () => Array(width).fill(false));
  const queue: [number, number][] = [];

  // Enqueue all edge ocean cells
  for (let x = 0; x < width; x++) {
    if (map[0][x] === oceanValue) { queue.push([0, x]); visited[0][x] = true; }
    if (map[height-1][x] === oceanValue) { queue.push([height-1, x]); visited[height-1][x] = true; }
  }
  for (let y = 1; y < height-1; y++) {
    if (map[y][0] === oceanValue) { queue.push([y, 0]); visited[y][0] = true; }
    if (map[y][width-1] === oceanValue) { queue.push([y, width-1]); visited[y][width-1] = true; }
  }

  // Flood fill to mark all ocean-connected water
  const dirs = [[1,0], [-1,0], [0,1], [0,-1]];
  while (queue.length) {
    const [y, x] = queue.shift()!;
    for (const [dy, dx] of dirs) {
      const ny = y + dy, nx = x + dx;
      if (ny >= 0 && ny < height && nx >= 0 && nx < width && !visited[ny][nx] && map[ny][nx] === oceanValue) {
        visited[ny][nx] = true;
        queue.push([ny, nx]);
      }
    }
  }

  // Any ocean not visited is an inland lake; set to landValue
  const result = map.map((row, y) => row.map((cell, x) => (cell === oceanValue && !visited[y][x]) ? landValue : cell));
  return result;
}


export function generateDefaultContinentsMap(width: number, height: number): number[][] {
  return generateContinentsMap(width, height, {
    scale: 0.0018,
    threshold: -0.05,
    borderStrength: 0.5,
    borderWidth: 0.15,
    octaves: 6,
    persistence: 0.5,
    seed: Math.floor(Math.random() * 1000000000)
  });
}

export function generateContinentsMap(
  width: number,
  height: number,
  options?: {
    scale?: number;
    threshold?: number;
    seed?: number;
    borderStrength?: number;
    borderWidth?: number;
    octaves?: number;
    persistence?: number;
  }
): number[][] {
  // Default parameters
  const scale = options?.scale ?? 0.015; // smaller = larger continents
  const threshold = options?.threshold ?? 0.0; // 0 = 50/50 land/ocean
  // Use Math.random if no seed is provided
  const rand = options?.seed !== undefined
    ? mulberry32(options.seed)
    : Math.random;
  const noise2D = createNoise2D(rand);
  const borderStrength = options?.borderStrength ?? 0.5;
  const borderWidth = options?.borderWidth ?? 0.2;
  // Use OCEAN from WorldMap everywhere

  // Smoothstep function
  function smoothstep(edge0: number, edge1: number, x: number) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  const octaves = options?.octaves ?? 4;
  const persistence = options?.persistence ?? 0.5;

  const map: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      // Center the noise for more organic shapes
      const nx = x - width / 2;
      const ny = y - height / 2;
      // Fractal (multi-octave) noise
      let value = 0;
      let maxAmp = 0;
      let freq = 1;
      let amp = 1;
      for (let o = 0; o < octaves; o++) {
        value += noise2D(nx * scale * freq, ny * scale * freq) * amp;
        maxAmp += amp;
        amp *= persistence;
        freq *= 2;
      }
      value /= maxAmp;

      // Rectangular ocean border
      const edgeDistX = Math.min(x, width - 1 - x) / (width / 2);
      const edgeDistY = Math.min(y, height - 1 - y) / (height / 2);
      const edgeDist = Math.min(edgeDistX, edgeDistY);
      let maskedValue = value;
      if (edgeDist < borderWidth) {
        // Blend toward ocean based on proximity to edge
        const mask = borderStrength * (1 - (edgeDist / borderWidth));
        maskedValue = value * (1 - mask) + OCEAN * mask;
      }
      row.push(maskedValue > threshold ? LAND : OCEAN);
    }
    map.push(row);
  }
  let processed = removeInlandLakes(map, OCEAN, LAND);
  processed = removeSmallIslands(processed, OCEAN, LAND, 1000);
  return processed;
}

// Simple seeded random generator (mulberry32)
function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}
