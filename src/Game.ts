import { WorldMap } from './WorldMap';
import { Player } from './Player';
import { Country } from './Country';

/**
 * Core game logic class for RiskTs.
 * Manages players, world map, turns, and active player.
 */
export class Game {
  static readonly armyCost = 100;
  static readonly spyCost = 200000;
  static readonly spyFortifiedCost = 1000000;
  static readonly initialPlayerMoney = 10000000;
  static readonly homeCountryIncome = 4000000;
  static readonly fortifyCost = 100000;
  worldMap: WorldMap;
  players: Player[];
  gameTurn: number;
  activePlayerIndex: number;

  constructor(worldMap: WorldMap, players: Player[] = []) {
    this.worldMap = worldMap;
    this.players = players;
    this.gameTurn = 1;
    this.activePlayerIndex = 0;
  }

  /**
   * Returns the currently active player.
   */
  get activePlayer(): Player {
    return this.players[this.activePlayerIndex];
  }

  /**
   * Advances the game to the next player's turn, incrementing gameTurn if needed.
   */
  nextTurn() {
    this.activePlayerIndex = (this.activePlayerIndex + 1) % this.players.length;
    if (this.activePlayerIndex === 0) {
      this.gameTurn++;
    }
    // Reset action limit for all players (or just active player if preferred)
    for (const player of this.players) {
      player.resetActions();
    }
  }

   /**
   * Initializes a new game with the given world map and players.
   * Returns a new Game instance.
   */
  static initNewGame(worldMap: WorldMap, players: Player[]): Game {
    // 1. Give each player initial player money
    for (const player of players) {
      player.money = Game.initialPlayerMoney;
      player.homeCountry = null;
      player.ownedCountries = [];
    }

    // 2. Set income for each country (500000 to 2500000, multiple of 1000)
    const countries = worldMap.getCountries();
    for (const country of countries) {
      const min = 500_000, max = 2_500_000;
      country.income = Math.floor((min + Math.random() * (max - min)) / 1000) * 1000;
      country.owner = null;
    }

    // New logic: Try 10 random assignments, maximize min distance
    let bestMinDist = -1;
    let bestSet: Country[] = [];
    const playerCount = players.length;
    const attempts = 10;
    function dist(a: Country, b: Country): number {
      // Use Euclidean distance between centers
      if (!a.center || !b.center) return 0;
      const [ax, ay] = a.center();
      const [bx, by] = b.center();
      return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
    }
    for (let attempt = 0; attempt < attempts; ++attempt) {
      // Shuffle countries and pick first N as home countries
      const shuffled = [...countries];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const candidateSet = shuffled.slice(0, playerCount);
      // Compute smallest pairwise distance
      let minDist = Infinity;
      for (let i = 0; i < candidateSet.length; ++i) {
        for (let j = i + 1; j < candidateSet.length; ++j) {
          minDist = Math.min(minDist, dist(candidateSet[i], candidateSet[j]));
        }
      }
      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestSet = candidateSet;
      }
    }
    // Assign chosen home countries
    for (let i = 0; i < players.length; ++i) {
      const home = bestSet[i];
      players[i].homeCountry = home;
      home.owner = players[i];
      players[i].ownedCountries.push(home);
      home.income = Game.homeCountryIncome;
      home.fortified = true;
    }
    // Initialize army sizes
    for (const country of worldMap.getCountries()) {
      if (country.owner) {
        country.armies = 100000;
      } else {
        // Heavily weight toward smaller numbers
        const army = Math.round((Math.random() * Math.random() * 99000 + 1000) / 1000) * 1000;
        country.armies = army;
      }
    }
    return new Game(worldMap, players);
  }
}
