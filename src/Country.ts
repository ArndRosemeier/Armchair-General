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

  constructor(name: string, owner: Player | null = null, armies: number = 0, income: number = 0) {
    this.name = name;
    this.owner = owner;
    this.armies = armies;
    this.income = income;
    this.coordinates = [];
    this.border = [];
    this.oceanBorder = [];
    this.neighbors = [];
  }

  setOwner(player: Player) {
    this.owner = player;
  }

  setArmies(count: number) {
    this.armies = count;
  }
}
