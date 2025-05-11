import { Player } from './Player';

export class Country {
  name: string;
  owner: Player | null;
  armies: number;
  income: number;
  coordinates: [number, number][];
  border: [number, number][];
  oceanBorder: [number, number][];
  neighbors: Country[];
  color: [number, number, number];
  private _center: [number, number] | null = null;

  constructor(name: string, owner: Player | null = null, armies: number = 0, income: number = 0) {
    this.name = name;
    this.owner = owner;
    this.armies = armies;
    this.income = income;
    this.coordinates = [];
    this.border = [];
    this.oceanBorder = [];
    this.neighbors = [];
    // Assign a random RGB color
    this.color = [
      Math.floor(80 + Math.random() * 150), // R: avoid too dark/light
      Math.floor(80 + Math.random() * 150), // G
      Math.floor(80 + Math.random() * 150)  // B
    ];
  }

  setOwner(player: Player) {
    this.owner = player;
  }

  setArmies(count: number) {
    this.armies = count;
  }

  /**
   * Returns the geometric center (average x, y) of the country's coordinates.
   */
  center(): [number, number] {
    if (this._center) return this._center;
    if (!this.coordinates.length) {
      this._center = [0, 0];
      return this._center;
    }
    let sumX = 0, sumY = 0;
    for (const [x, y] of this.coordinates) {
      sumX += x;
      sumY += y;
    }
    this._center = [sumX / this.coordinates.length, sumY / this.coordinates.length];
    return this._center;
  }
}

