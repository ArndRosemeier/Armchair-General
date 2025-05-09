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
  static generateCountriesMap(
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
      seeds.push({ x, y, idx: i }); // start at 0
    }

    // 3. Initialize country map and frontier queues
    const countryMap: number[][] = [];
    for (let y = 0; y < height; y++) {
      const row: number[] = [];
      for (let x = 0; x < width; x++) {
        row.push(continentMap[y][x] === LAND ? LAND : continentMap[y][x]);
      }
      countryMap.push(row);
    }
    // Use [x, y, country] arrays for frontiers
    const frontiers: Array<[number, number, number]> = [];
    for (const seed of seeds) {
      countryMap[seed.y][seed.x] = seed.idx;
      frontiers.push([seed.x, seed.y, seed.idx]);
    }

    // 4. Flood-fill competition with resistance
    const dirs = [[1,0],[0,1],[-1,0],[0,-1]];
    // Calculate resistanceMid once before the loop
    const resistanceMid = (minResistance + maxResistance) / 2;
    while (frontiers.length > 0) {
      // Randomly pick a frontier cell
      const i = Math.floor(rand() * frontiers.length);
      const [x, y, country] = frontiers[i];
      // Try to expand into random neighbor (use [nx, ny] arrays)
      const neighbors: [number, number][] = [];
      for (let d = 0; d < 4; d++) {
        const nx = x + dirs[d][0];
        const ny = y + dirs[d][1];
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && countryMap[ny][nx] === LAND) {
          neighbors.push([nx, ny]);
        }
      }
      if (neighbors.length === 0) {
        // No more expansion possible from this cell
        frontiers.splice(i, 1);
        continue;
      }
      // Prefer lower resistance
      neighbors.sort((a, b) => resistance[a[1]][a[0]] - resistance[b[1]][b[0]]);
      // With 70% probability, pick the lowest resistance, else pick randomly for irregularity
      let pickIdx = 0;
      if (neighbors.length > 1 && rand() > 0.7) pickIdx = Math.floor(rand() * neighbors.length);
      // Assign neighbor coordinates to local variables
      const neighbor = neighbors[pickIdx];
      const nx = neighbor[0];
      const ny = neighbor[1];
      // Probabilistically skip high-resistance cells to create more jagged borders
      const res = resistance[ny][nx];
      // Use skipProbability for all cells above the midpoint resistance
      if (res > resistanceMid && rand() < skipProbability) continue;
      countryMap[ny][nx] = country;
      frontiers.push([nx, ny, country]);
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

// New: Generate country map and extract Country instances
import { Country } from './Country';
import { Player } from './Player';

export interface GenerateCountriesResult {
  map: number[][];
  countries: Country[];
}

export class CountryGeneratorExtended extends CountryGenerator {
  /**
   * Generates a filled country map and extracts Country instances with coordinates, border, and oceanBorder.
   */
  static generateCountries(
    continentMap: number[][],
    options?: {
      countryCount?: number;
      scale?: number;
      seed?: number;
      minResistance?: number;
      maxResistance?: number;
      skipProbability?: number;
    }
  ): GenerateCountriesResult {
    const map = this.generateCountriesMap(continentMap, options);
    const height = map.length;
    const width = map[0]?.length || 0;
    const countryMap: { [id: number]: Country } = {};

    // 1. Collect coordinates for each country
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const id = map[y][x];
        if (id >= 0) { // 0 and up are valid country IDs
          if (!countryMap[id]) {
            countryMap[id] = new Country(`Country ${id}`);
          }
          countryMap[id].coordinates.push([x, y]);
        }
      }
    }

    // 2. Collect border and ocean border for each country
    const dirs = [[1,0],[0,1],[-1,0],[0,-1]];
    for (const idStr in countryMap) {
      const id = Number(idStr);
      const country = countryMap[id];
      for (const [x, y] of country.coordinates) {
        let isBorder = false;
        let isOceanBorder = false;
        for (const [dx, dy] of dirs) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height || map[ny][nx] !== id) {
            isBorder = true;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height || map[ny][nx] === OCEAN) {
              isOceanBorder = true;
            }
          }
        }
        if (isBorder) country.border.push([x, y]);
        if (isOceanBorder) country.oceanBorder.push([x, y]);
      }
    }

    return { map, countries: Object.values(countryMap) };
  }
}

// Generate countries with strong resistance defaults for highly irregular borders
export function generateDefaultCountries(continentMap: number[][], countryCount: number): number[][] {
  return CountryGenerator.generateCountriesMap(continentMap, {
    countryCount,
    minResistance: 0,
    maxResistance: 130,
    skipProbability: 0.99
  });
}
