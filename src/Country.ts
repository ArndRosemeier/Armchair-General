import { Player } from './Player';

export class Country {
  name: string;
  owner: Player | null;
  armies: number;
  income: number;
  IncomePotential: number;
  coordinates: [number, number][];
  border: [number, number][];
  oceanBorder: [number, number][];
  neighbors: Country[];
  color: [number, number, number];
  fortified: boolean = false;
  nationalPride: number;
  unrestLevel: number = 0;
  private _center: [number, number] | null = null;

  constructor(name: string, owner: Player | null = null, armies: number = 0, income: number = 0) {
    this.name = name;
    this.owner = owner;
    this.armies = armies;
    this.income = income;
    // IncomePotential: income * random factor between 1 and 10, heavily weighted towards 1
    const factor = 1 + 9 * Math.pow(Math.random(), 3); // Cubic bias towards 1
    this.IncomePotential = Math.floor(this.income * factor / 1000) * 1000;
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
    // Initialize nationalPride with bias towards lower values using random multiplication
    const min = 1000;
    const max = 100000;
    const random = Math.random() * Math.random(); // Multiply three random numbers for heavy bias towards lower values
    this.nationalPride = Math.floor(min + (max - min) * random);
    this.unrestLevel = 0;
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

  canBeFortified(): boolean {
    if (this.fortified) return false;
    if (this.owner) {
      // plannedFortifications: [Country, number][]
      for (const [country, _] of this.owner.plannedFortifications) {
        if (country === this) return false;
      }
    }
    return true;
  }

  toJSON() {
    return {
      id: this.name, // Use name as unique ID
      name: this.name,
      ownerId: this.owner ? this.owner.name : null,
      armies: this.armies,
      income: this.income,
      coordinates: this.coordinates,
      border: this.border,
      oceanBorder: this.oceanBorder,
      neighborIds: this.neighbors.map(n => n.name),
      color: this.color,
      fortified: this.fortified,
      nationalPride: this.nationalPride,
      unrestLevel: this.unrestLevel
    };
  }

  /**
   * fromJSON: create a Country from plain data, then resolve references.
   * @param data - plain object from JSON
   * @param playerRegistry - map of player name to Player instance
   * @param countryRegistry - map of country name to Country instance
   */
  static fromJSON(data: any, playerRegistry: Record<string, any>, countryRegistry: Record<string, any>): Country {
    const c = new Country(data.name, null, data.armies, data.income);
    c.coordinates = data.coordinates;
    c.border = data.border;
    c.oceanBorder = data.oceanBorder;
    c.color = data.color;
    c.fortified = data.fortified;
    c.nationalPride = data.nationalPride ?? 1000;
    c.unrestLevel = data.unrestLevel ?? 0;
    // owner and neighbors will be resolved after all countries/players are created
    // Store for later resolution
    (c as any)._ownerId = data.ownerId;
    (c as any)._neighborIds = data.neighborIds;
    // Register in countryRegistry
    countryRegistry[data.name] = c;
    return c;
  }

  /**
   * After all countries and players are created, resolve references.
   */
  resolveReferences(playerRegistry: Record<string, any>, countryRegistry: Record<string, any>) {
    this.owner = (this as any)._ownerId ? playerRegistry[(this as any)._ownerId] : null;
    this.neighbors = ((this as any)._neighborIds || []).map((n: string) => countryRegistry[n]).filter(Boolean);
    delete (this as any)._ownerId;
    delete (this as any)._neighborIds;
  }

  static calculateIncomePotential(income: number): number {
    const factor = 1 + 9 * Math.pow(Math.random(), 3); // Cubic bias towards 1
    return Math.floor(income * factor / 1000) * 1000;
  }

  recalculateIncomePotential() {
    this.IncomePotential = Country.calculateIncomePotential(this.income);
  }
}

