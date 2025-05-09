import { Country } from './Country';
import { generateContinentsMap as generateContinentsMapImpl } from './generateContinents';

export const OCEAN = -1;
export const LAND = -2;

export class WorldMap {
  private countries: Country[];
  private map: number[][];

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
   * Creates a world map (for now, just an ocean map)
   */
  static createMap(width: number, height: number): number[][] {
    return WorldMap.createOceanMap(width, height);
  }

  addCountry(country: Country) {
    this.countries.push(country);
  }

  getCountries(): Country[] {
    return this.countries;
  }

  getMap(): number[][] {
    return this.map;
  }
}
