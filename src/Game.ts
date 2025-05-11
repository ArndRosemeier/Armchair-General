import { WorldMap } from './WorldMap';
import { Player } from './Player';
import { Country } from './Country';

/**
 * Core game logic class for RiskTs.
 * Manages players, world map, turns, and active player.
 */
export class Game {
  static readonly armyCost = 100000;
  static readonly spyCost = 200000;
  static readonly spyFortifiedCost = 1000000;
  static readonly initialPlayerMoney = 10000000;
  static readonly homeCountryIncome = 4000000;
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
  }

  /**
   * Player spies on a country; updates their knowledge for the current turn.
   */
  spy(player: Player, country: Country) {
    const existing = player.knowledge.find(k => k.country === country);
    const knowledge = {
      country,
      gameTurn: this.gameTurn,
      army: country.armies,
      income: country.income,
    };
    if (existing) {
      existing.gameTurn = knowledge.gameTurn;
      existing.army = knowledge.army;
      existing.income = knowledge.income;
    } else {
      player.knowledge.push(knowledge);
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

    // 3. Select candidate home countries
    const playerCount = players.length;
    const candidateCount = playerCount * 3;
    const shuffled = countries.slice().sort(() => Math.random() - 0.5);
    const candidates = shuffled.slice(0, candidateCount);

    // Helper: Euclidean distance between country centers
    function dist(a: Country, b: Country): number {
      const [ax, ay] = a.center();
      const [bx, by] = b.center();
      return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
    }

    // Find the set of playerCount countries with maximal minimal pairwise distance
    let bestSet: Country[] = [];
    let bestMinDist = -1;
    // Try all combinations if small, else greedy
    if (candidateCount <= 10) {
      // Brute force all combinations
      function* combinations(arr: Country[], k: number): Generator<Country[]> {
        if (k === 0) yield [];
        else for (let i = 0; i <= arr.length - k; ++i)
          for (const tail of combinations(arr.slice(i + 1), k))
            yield [arr[i], ...tail];
      }
      for (const combo of combinations(candidates, playerCount)) {
        let minDist = Infinity;
        for (let i = 0; i < combo.length; ++i) {
          for (let j = i + 1; j < combo.length; ++j) {
            minDist = Math.min(minDist, dist(combo[i], combo[j]));
          }
        }
        if (minDist > bestMinDist) {
          bestMinDist = minDist;
          bestSet = combo;
        }
      }
    } else {
      // Greedy farthest-point algorithm
      bestSet = [candidates[0]];
      while (bestSet.length < playerCount) {
        let farthest: Country | null = null;
        let farthestDist = -1;
        for (const cand of candidates) {
          if (bestSet.includes(cand)) continue;
          const minDist = Math.min(...bestSet.map(c => dist(c, cand)));
          if (minDist > farthestDist) {
            farthestDist = minDist;
            farthest = cand;
          }
        }
        if (farthest) bestSet.push(farthest);
        else break;
      }
    }

    // Assign home countries to players
    for (let i = 0; i < players.length; ++i) {
      const home = bestSet[i % bestSet.length];
      players[i].homeCountry = home;
      home.owner = players[i];
      players[i].ownedCountries.push(home);
    }

    // Set all home countries' income to homeCountryIncome
    for (const player of players) {
      if (player.homeCountry) {
        player.homeCountry.income = Game.homeCountryIncome;
        player.homeCountry.fortified = true;
      }
    }

    return new Game(worldMap, players);
  }
}
