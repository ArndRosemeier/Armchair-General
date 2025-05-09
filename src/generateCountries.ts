import { createNoise2D } from 'simplex-noise';
import { OCEAN, LAND } from './WorldMap';

export class CountryGenerator {
  /**
   * Generates a country map from a continent map.
   * Ocean and land use negative values; countries are positive integers (1, 2, ...)
   * @param continentMap The continent map (2D array with OCEAN, LAND, or processed land)
   * @param options Optional parameters
   *   - countryCount: number of countries to generate
   *   - scale: noise scale for border detail
   *   - seed: random seed for reproducibility
   *   - borderWiggle: strength of border noise (default 0.5)
   */
  static generateCountries(
    continentMap: number[][],
    options?: {
      countryCount?: number;
      scale?: number; // Used for resistance map
      seed?: number;
      minResistance?: number;
      maxResistance?: number;
      skipProbability?: number;
    }
  ): number[][] {
    const height = continentMap.length;
    const width = continentMap[0]?.length || 0;
    const countryCount = options?.countryCount ?? 12;
    const scale = options?.scale ?? 0.09; // Higher scale = more granular resistance
    const minResistance = options?.minResistance ?? 10.0;
    const maxResistance = options?.maxResistance ?? 50.0;
    const skipProbability = options?.skipProbability ?? 0.9;
    const rand = options?.seed !== undefined ? mulberry32(options.seed) : Math.random;
    const noise2D = createNoise2D(rand);

    // 1. Generate resistance map (higher = harder to claim)
    const resistance: number[][] = [];
    for (let y = 0; y < height; y++) {
      const row: number[] = [];
      for (let x = 0; x < width; x++) {
        // Much stronger resistance: range minResistance to maxResistance
        row.push(continentMap[y][x] === LAND ? (minResistance + (maxResistance - minResistance) * Math.abs(noise2D(x * scale, y * scale))) : Infinity);
      }
      resistance.push(row);
    }

    // 2. Place seeds for each country
    const seeds: { x: number, y: number, idx: number }[] = [];
    const landCells: [number, number][] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (continentMap[y][x] === LAND) landCells.push([y, x]);
      }
    }
    for (let i = 0; i < countryCount && landCells.length > 0; i++) {
      const pick = Math.floor(rand() * landCells.length);
      const [y, x] = landCells.splice(pick, 1)[0];
      seeds.push({ x, y, idx: i + 1 });
    }

    // 3. Initialize country map and frontier queues
    const countryMap: number[][] = [];
    for (let y = 0; y < height; y++) {
      const row: number[] = [];
      for (let x = 0; x < width; x++) {
        row.push(continentMap[y][x] === LAND ? 0 : continentMap[y][x]);
      }
      countryMap.push(row);
    }
    const frontiers: Array<{x: number, y: number, country: number}> = [];
    for (const seed of seeds) {
      countryMap[seed.y][seed.x] = seed.idx;
      frontiers.push({x: seed.x, y: seed.y, country: seed.idx});
    }

    // 4. Flood-fill competition with resistance
    const dirs = [[1,0],[0,1],[-1,0],[0,-1]];
    while (frontiers.length > 0) {
      // Randomly pick a frontier cell
      const i = Math.floor(rand() * frontiers.length);
      const {x, y, country} = frontiers[i];
      // Try to expand into random neighbor
      const neighbors = dirs
        .map(([dx,dy]) => ({nx: x+dx, ny: y+dy}))
        .filter(({nx,ny}) => nx>=0 && nx<width && ny>=0 && ny<height && countryMap[ny][nx] === 0);
      if (neighbors.length === 0) {
        // No more expansion possible from this cell
        frontiers.splice(i, 1);
        continue;
      }
      // Prefer lower resistance
      neighbors.sort((a,b) => resistance[a.ny][a.nx] - resistance[b.ny][b.nx]);
      // With 70% probability, pick the lowest resistance, else pick randomly for irregularity
      let pickIdx = 0;
      if (neighbors.length > 1 && rand() > 0.7) pickIdx = Math.floor(rand() * neighbors.length);
      const {nx, ny} = neighbors[pickIdx];
      // Probabilistically skip high-resistance cells to create more jagged borders
      const res = resistance[ny][nx];
      // Use skipProbability for all cells above the midpoint resistance
      const resistanceMid = (minResistance + maxResistance) / 2;
      if (res > resistanceMid && rand() < skipProbability) continue;
      countryMap[ny][nx] = country;
      frontiers.push({x: nx, y: ny, country});
    }

    return countryMap;
  }
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

// Generate countries with strong resistance defaults for highly irregular borders
export function generateDefaultCountries(continentMap: number[][], countryCount: number): number[][] {
  return CountryGenerator.generateCountries(continentMap, {
    countryCount,
    minResistance: 0,
    maxResistance: 130,
    skipProbability: 0.99
  });
}
