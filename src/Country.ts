import { Player } from './Player';

export class Country {
  name: string;
  owner: Player | null;
  armies: number;

  constructor(name: string, owner: Player | null = null, armies: number = 0) {
    this.name = name;
    this.owner = owner;
    this.armies = armies;
  }

  setOwner(player: Player) {
    this.owner = player;
  }

  setArmies(count: number) {
    this.armies = count;
  }
}
