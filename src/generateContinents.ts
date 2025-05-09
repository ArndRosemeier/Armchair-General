// Continent map generation using simplex-noise
import { OCEAN, LAND } from './WorldMap';
import { createNoise2D } from 'simplex-noise';

/**
 * Generates a 2D map with natural-looking continents using simplex noise.
 * @param width Width of the map
 * @param height Height of the map
 * @param options Optional: scale (zoom), threshold (land/ocean), seed
 */
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
  const OCEAN_VALUE = -1; // Value representing pure ocean in noise

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
        maskedValue = value * (1 - mask) + OCEAN_VALUE * mask;
      }
      row.push(maskedValue > threshold ? LAND : OCEAN);
    }
    map.push(row);
  }
  return map;
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
