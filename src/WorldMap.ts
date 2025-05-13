import { Country } from './Country';
import { Continent } from './Continent';
import { generateContinentsMap as generateContinentsMapImpl, generateDefaultContinentsMap } from './generateContinents';
import { generateDefaultCountries } from './generateCountries';

export const OCEAN = -1;
export const LAND = -2;

export class WorldMap {
  /**
   * Logs all country names in order, with an optional label for context.
   */
  static logCountryNamesInOrder(countries: Country[], label: string = ''): void {
    const names = countries.map((c, i) => `${i}: ${c.name}`);
    console.log(`[WorldMap] Country order${label ? ' - ' + label : ''}:\n` + names.join(', '));
  }

  /**
   * Checks that for every country index in the map, countries[index] is a valid Country instance.
   * Optionally logs any mismatches or out-of-bounds indices. Returns true if consistent, false otherwise.
   */
  static checkMapCountryConsistency(map: number[][], countries: Country[]): boolean {
    if (!Array.isArray(map) || !Array.isArray(countries)) {
      console.error('[WorldMap] Consistency check failed: map or countries not arrays');
      return false;
    }
    let consistent = true;
    for (let y = 0; y < map.length; ++y) {
      for (let x = 0; x < map[y].length; ++x) {
        const idx = map[y][x];
        if (idx >= 0) {
          if (!countries[idx]) {
            console.error(`[WorldMap] Inconsistent: map[${y}][${x}] = ${idx}, but countries[${idx}] is undefined`);
            consistent = false;
          } else if (typeof countries[idx].name !== 'string') {
            console.error(`[WorldMap] Inconsistent: countries[${idx}] has no valid name at map[${y}][${x}]`);
            consistent = false;
          }
        }
      }
    }
    return consistent;
  }

  private countries: Country[];
  private map: number[][];
  public continents: Continent[] = [];

  // 100 real country names (ISO country list, no repeats)
  static readonly REAL_COUNTRY_NAMES: string[] = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
    "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
    "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon",
    "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia",
    "Cuba", "Cyprus", "Czechia", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador",
    "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia",
    "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti",
    "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
    "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia",
    "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia"
  ];

  // Assigns random names to all countries, no duplicates
  assignRandomCountryNames() {
    let allUnique = false;
    while (!allUnique) {
      const used = new Set<string>();
      for (const country of this.countries) {
        let name: string;
        let attempts = 0;
        do {
          name = WorldMap.generateRandomName();
          attempts++;
          if (attempts > 1000) throw new Error('Failed to generate unique random country names');
        } while (used.has(name));
        country.name = name;
        used.add(name);
      }
      allUnique = used.size === this.countries.length;
    }
  }

  // Assigns real country names, falling back to random if all used
  assignRealCountryNames() {
    let allUnique = false;
    while (!allUnique) {
      const available = [...WorldMap.REAL_COUNTRY_NAMES];
      const used = new Set<string>();
      for (const country of this.countries) {
        let name: string;
        if (available.length > 0) {
          const idx = Math.floor(Math.random() * available.length);
          name = available.splice(idx, 1)[0];
        } else {
          let attempts = 0;
          do {
            name = WorldMap.generateRandomName();
            attempts++;
            if (attempts > 1000) throw new Error('Failed to generate unique fallback country names');
          } while (used.has(name));
        }
        country.name = name;
        used.add(name);
      }
      allUnique = used.size === this.countries.length;
    }
  }

  // Generates a random fantasy-like name (e.g. 'Zantria', 'Morvek')
  static generateRandomName(): string {
    const syllables = [
      'zan', 'mor', 'vek', 'tal', 'rin', 'dor', 'lek', 'sha', 'val', 'nor', 'ka', 'bel', 'dra', 'sil', 'tur', 'gar', 'fen', 'mir', 'sol', 'vor',
      'lin', 'sar', 'qu', 'zel', 'ron', 'bar', 'zen', 'tir', 'lom', 'kal', 'vin', 'lor', 'mel', 'dar', 'gol', 'han', 'jor', 'ken', 'lun', 'mar',
    ];
    const syllableCount = 2 + Math.floor(Math.random() * 2); // 2 or 3 syllables
    let name = '';
    for (let i = 0; i < syllableCount; i++) {
      name += syllables[Math.floor(Math.random() * syllables.length)];
    }
    // Capitalize first letter
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  constructor(width: number, height: number, countries: Country[] = []) {
    this.countries = countries;
    this.map = WorldMap.createOceanMap(width, height);
  }

  static createOceanMap(width: number, height: number): number[][] {
    // OCEAN constant
    return Array.from({ length: height }, () => Array(width).fill(OCEAN));
  }

  /**
   * Creates a world map with natural-looking continents using simplex noise
   */
  static generateContinentsMap(
    width: number,
    height: number,
    options?: { scale?: number; threshold?: number; seed?: number; borderStrength?: number; borderWidth?: number; octaves?: number; persistence?: number }
  ): number[][] {
    return generateContinentsMapImpl(width, height, options);
  }

  /**
   * Creates a full world map with continents and countries.
   */
  static createMap(width: number, height: number, countryCount: number = 40, useRealNames: boolean = true): WorldMap {
    // 1. Generate continents
    const continents = generateDefaultContinentsMap(width, height);
    // 2. Generate countries on those continents
    const { map, countries } = generateDefaultCountries(continents, countryCount);
    // 3. Create new WorldMap instance
    const worldMap = new WorldMap(width, height, countries);
    (worldMap as any).map = map; // Set the map property directly
    if (useRealNames) {
      worldMap.assignRealCountryNames();
    } else {
      worldMap.assignRandomCountryNames();
    }
    worldMap.regenerateMapFromCountries(worldMap.countries);
    worldMap.createContinents();
    return worldMap;
  }

  addCountry(country: Country) {
    this.countries.push(country);
  }

  /**
   * Groups countries into continents using their neighbors property.
   * Each continent is a cluster of connected countries.
   */
  createContinents() {
    const visited = new Set<Country>();
    const continents: Continent[] = [];
    for (const country of this.countries) {
      if (!visited.has(country)) {
        // BFS to find all connected countries
        const queue: Country[] = [country];
        const continentCountries: Country[] = [];
        visited.add(country);
        while (queue.length > 0) {
          const current = queue.shift()!;
          continentCountries.push(current);
          for (const neighbor of current.neighbors) {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push(neighbor);
            }
          }
        }
        continents.push(new Continent(continentCountries));
      }
    }
    this.continents = continents;
  }

  getCountries(): Country[] {
    return this.countries;
  }

  /**
   * Calculates the distance between two countries.
   * If they are neighbors, returns the Euclidean distance between centers.
   * If not neighbors and both have ocean borders, returns distance * 5.
   * If not neighbors and at least one lacks ocean border, returns null (unreachable).
   */
  distance(a: Country, b: Country): number | null {
    // Calculate Euclidean distance between centers
    const [ax, ay] = a.center();
    const [bx, by] = b.center();
    const dist = Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
    // Check if they are neighbors
    if (a.neighbors.includes(b) || b.neighbors.includes(a)) {
      return dist;
    }
    // Check if both have ocean borders
    const aHasOcean = a.oceanBorder && a.oceanBorder.length > 0;
    const bHasOcean = b.oceanBorder && b.oceanBorder.length > 0;
    if (aHasOcean && bHasOcean) {
      return dist * 5;
    }
    // Otherwise unreachable
    return null;
  }

  getMap(): number[][] {
    return this.map;
  }

  /**
   * Regenerates the internal map array from the given countries array.
   * - Initializes an ocean map of the same size as the current map.
   * - For each country, marks all its coordinate pixels with its index in the array.
   * Throws if country coordinates are out of bounds.
   */
  regenerateMapFromCountries(countries: Country[]): void {
    if (!this.map || !Array.isArray(this.map) || this.map.length === 0 || this.map[0].length === 0) {
      throw new Error("WorldMap.map is not initialized or has invalid dimensions");
    }
    const height = this.map.length;
    const width = this.map[0].length;
    // Create new ocean map
    const newMap = WorldMap.createOceanMap(width, height);
    // For each country, mark its coordinates
    for (let idx = 0; idx < countries.length; ++idx) {
      const country = countries[idx];
      if (!country.coordinates || !Array.isArray(country.coordinates)) {
        throw new Error(`Country at index ${idx} has no valid coordinates array`);
      }
      for (const [x, y] of country.coordinates) {
        if (
          typeof x !== "number" || typeof y !== "number" ||
          x < 0 || x >= width ||
          y < 0 || y >= height
        ) {
          throw new Error(`Country index ${idx} has out-of-bounds coordinate (${x}, ${y})`);
        }
        newMap[y][x] = idx;
      }
    }
    this.map = newMap;
  }
}

