import { createNoise2D } from 'simplex-noise';
import { OCEAN, LAND } from './WorldMap';
import { Country } from './Country';
import { Player } from './Player';

export interface GenerateCountriesResult {
  map: number[][];
  countries: Country[];
}

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
    options: {
      countryCount?: number;
      scale?: number; // Used for resistance map
      seed?: number;
      minResistance?: number;
      maxResistance?: number;
      skipProbability?: number;
    } = {}
  ): number[][] {
    if (!continentMap || continentMap.length === 0 || !continentMap[0]) {
      throw new Error("continentMap must be a non-empty 2D array");
    }
    const height = continentMap.length;
    const width = continentMap[0].length;
    const countryCount = options.countryCount ?? 12;
    const scale = options.scale ?? 0.09; // Higher scale = more granular resistance
    const minResistance = options.minResistance ?? 10.0;
    const maxResistance = options.maxResistance ?? 50.0;
    const skipProbability = options.skipProbability ?? 0.9;
    const rand = options.seed !== undefined ? mulberry32(options.seed) : Math.random;
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
    const countryMap: number[][] = Array.from({ length: height }, () => Array(width).fill(LAND));
    for (const { x, y, idx } of seeds) {
      countryMap[y][x] = idx;
    }
    const frontiers: [number, number, number][] = seeds.map(({ x, y, idx }) => [x, y, idx]);

    // 4. Grow countries
    const resistanceMid = (minResistance + maxResistance) / 2;
    while (frontiers.length > 0) {
      const i = Math.floor(rand() * frontiers.length);
      const [x, y, country] = frontiers.splice(i, 1)[0];
      const neighbors: [number, number][] = [];
      for (const [dx, dy] of [[1,0],[0,1],[-1,0],[0,-1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && countryMap[ny][nx] === LAND && continentMap[ny][nx] === LAND) {
          neighbors.push([nx, ny]);
        }
      }
      if (neighbors.length === 0) continue;
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

  /**
   * Generates a filled country map and extracts Country instances with coordinates, border, and oceanBorder.
   */
  static generateCountriesInternal(
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
    if (!map || map.length === 0 || !map[0]) {
      throw new Error("map must be a non-empty 2D array");
    }
    const height = map.length;
    const width = map[0].length;
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
    this.findCountryBorders(map, countryMap, width, height);

    return { map, countries: Object.values(countryMap) };
  }

  /**
   * Finds the border and ocean border cells for each country in the countryMap.
   * Updates each Country instance's border and oceanBorder arrays in place.
   */
  private static findCountryBorders(
    map: number[][],
    countryMap: { [id: number]: Country },
    width: number,
    height: number
  ): void {
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
  }


  /**
   * Finds and sets neighbors for each country in the array based on border adjacency.
   * @param countries Array of Country instances (without names)
   */
  static findNeighbors(countries: Country[]): void {

    // Map each border coordinate to its country
    const coordToCountry: Map<string, Country> = new Map();
    for (const country of countries) {
      for (const [x, y] of country.border) {
        coordToCountry.set(`${x},${y}`, country);
      }
    }
    // For each country, collect unique neighbors
    for (const country of countries) {
      const neighborSet: Set<Country> = new Set();
      for (const [x, y] of country.border) {
        for (const [dx, dy] of [[1,0],[0,1],[-1,0],[0,-1]]) {
          const nx = x + dx;
          const ny = y + dy;
          const neighbor = coordToCountry.get(`${nx},${ny}`);
          if (neighbor && neighbor !== country) {
            neighborSet.add(neighbor);
          }
        }
      }
      country.neighbors = Array.from(neighborSet);
    }
  }
  /**
   * Merges countries smaller than minSize into their smallest neighbor.
   * @param countries Array of Country instances
   * @param minSize Minimum size threshold (default 1000)
   */
  static mergeSmallCountries(countries: Country[], minSize: number = 1000): void {
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = countries.length - 1; i >= 0; i--) {
        const country = countries[i];
        if (country.coordinates.length < minSize && country.neighbors.length > 0) {
          // Find the smallest neighbor by coordinates.length
          let smallestNeighbor = country.neighbors[0];
          for (const neighbor of country.neighbors) {
            if (neighbor.coordinates.length < smallestNeighbor.coordinates.length) {
              smallestNeighbor = neighbor;
            }
          }
          // Merge this country into smallestNeighbor
          smallestNeighbor.coordinates.push(...country.coordinates);
          // Remove the merged country from the countries array
          countries.splice(i, 1);
          changed = true;
        }
      }
      // After any merge, update neighbors
      if (changed) {
        this.findNeighbors(countries);
      }
    }
  }
  /**
   * Full pipeline for generating countries: initial generation, neighbor finding, merging, and border adjustment.
   */
  static generateCountries(
    continentMap: number[][],
    options: {
      countryCount?: number;
      scale?: number;
      seed?: number;
      minResistance?: number;
      maxResistance?: number;
      skipProbability?: number;
      minCountrySize?: number;
    } = {}
  ): GenerateCountriesResult {
    // 1. Initial generation
    const { map, countries } = this.generateCountriesInternal(continentMap, options);

    // 2. Initial neighbors
    this.findNeighbors(countries);

    // 3. Merge small countries
    const minSize = options?.minCountrySize ?? 1000;
    this.mergeSmallCountries(countries, minSize);

    // 4. Recompute borders after merge
    // Build a countryMap for border finding
    if (!map || map.length === 0 || !map[0]) {
      throw new Error("map must be a non-empty 2D array");
    }
    const width = map[0].length;
    const height = map.length;
    const countryMap: { [id: number]: Country } = {};
    for (let i = 0; i < countries.length; i++) {
      countryMap[i] = countries[i];
    }
    this.findCountryBorders(map, countryMap, width, height);

    // 5. Recompute neighbors after merge
    this.findNeighbors(countries);

    return { map, countries };
  }
}

function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

export function generateDefaultCountries(continentMap: number[][], countryCount: number): number[][] {
  return CountryGenerator.generateCountriesMap(continentMap, {
    countryCount,
    minResistance: 0,
    maxResistance: 130,
    skipProbability: 0.99
  });
}
