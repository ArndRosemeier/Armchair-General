import { WorldMap } from './WorldMap';
import { Player } from './Player';
import { Country } from './Country';
import { AI } from './AI';
import { GameGui } from './GameGui';
import { Opportunity } from './Opportunity';

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
  static showArmies: boolean = false;
  static readonly INCOME_SHARE_WIN = 0.8;
  worldMap: WorldMap;
  players: Player[];
  gameTurn: number;
  activePlayerIndex: number;
  gui?: GameGui;
  advisedOpportunity: Opportunity | null;

  constructor(worldMap: WorldMap, players: Player[] = []) {
    this.worldMap = worldMap;
    this.players = players;
    this.gameTurn = 1;
    this.activePlayerIndex = 0;
    this.advisedOpportunity = null;
    // Start the first player's turn
    if (this.players.length > 0) {
      this.activePlayer.startTurn();
    }
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
    // Add total income to the current active player's money before changing turn
    this.activePlayer.money += this.activePlayer.totalIncome();
    this.activePlayerIndex = (this.activePlayerIndex + 1) % this.players.length;
    if (this.activePlayerIndex === 0) {
      this.gameTurn++;
      this.handleUnrest();
    }
    // Process planned fortifications for the new active player
    const player = this.activePlayer;
    player.plannedFortifications = player.plannedFortifications.filter(([country, dueTurn]) => {
      if (dueTurn === this.gameTurn) {
        country.fortified = true;
        return false; // Remove from list
      }
      return true; // Keep in list
    });
    // Start the new active player's turn
    this.activePlayer.startTurn();
    // Clear advised opportunity at the start of a new turn
    this.advisedOpportunity = null;
  }

   /**
   * Initializes a new game with the given world map and players.
   * Returns a new Game instance.
   */
  static initNewGame(worldMap: WorldMap, players: Player[], gui?: GameGui): Game {
    // 1. Give each player initial player money
    for (const player of players) {
      player.money = Game.initialPlayerMoney;
      player.homeCountry = null;
      player.ownedCountries = [];
      // Assign AI instance if player is AI
      if (player.isAI) {
        player.AI = new AI(player, null as any); // game will be assigned after Game is constructed
      }
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
      home.nationalPride = 1000;
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
    const game = new Game(worldMap, players);
    if (gui) game.gui = gui;
    // Now set the game reference on each AI instance
    for (const player of players) {
      player.game = game;
      if (player.isAI && player.AI) {
        player.AI.game = game;
        player.AI.player = player;
      }
    }
    return game;
  }

  toJSON() {
    return {
      gameTurn: this.gameTurn,
      activePlayerName: this.players[this.activePlayerIndex]?.name ?? null,
      playerNames: this.players.map(p => p.name),
      // You do NOT need to serialize worldMap if you can regenerate it from countries
      // Just serialize the countries and players separately
    };
  }

  /**
   * fromJSON: create a Game from plain data, after countries and players are created.
   * @param data - plain object from JSON
   * @param players - array of Player instances
   * @param worldMap - WorldMap instance (regenerated from countries)
   */
  static fromJSON(data: any, players: Player[], worldMap: WorldMap): Game {
    const game = new Game(worldMap, players);
    game.gameTurn = data.gameTurn;
    // Find the index of the active player by name
    game.activePlayerIndex = players.findIndex(p => p.name === data.activePlayerName);
    if (game.activePlayerIndex === -1) game.activePlayerIndex = 0;
    // Set the game reference on each player
    for (const player of players) {
      player.game = game;
      if (player.isAI && player.AI) {
        player.AI.game = game;
        player.AI.player = player;
      }
    }
    return game;
  }

  /**
   * Adds a player to the game if there are fewer than 8 players.
   * Returns true if the player was added, false otherwise.
   */
  AddPlayer(player: Player): boolean {
    if (this.players.length >= 8) return false;
    this.players.push(player);
    return true;
  }

  /**
   * Generates a random emperor name for AI players.
   * Uses a reservoir of historical emperor names.
   */
  private static generateAIName(): string {
    const EMPEROR_NAMES = [
      'Augustus', 'Charlemagne', 'Qin Shi Huang', 'Akbar', 'Justinian',
      'Napoleon', 'Constantine', 'Ashoka', 'Catherine', 'Meiji',
      'Trajan', 'Hadrian', 'Aurangzeb', 'Elizabeth', 'Peter',
      'Victoria', 'Franz Joseph', 'Wilhelm', 'Haile Selassie', 'Menelik'
    ];
    return EMPEROR_NAMES[Math.floor(Math.random() * EMPEROR_NAMES.length)];
  }

  /**
   * Handles unrest in countries based on their national pride and current army count.
   * Countries with high unrest may rebel and form new AI-controlled nations.
   */
  handleUnrest() {
    for (const country of this.worldMap.getCountries()) {
      if (!country.owner) continue; // Skip unowned countries

      // Roll a dice between 1000 and 100000
      const diceRoll = Math.floor(Math.random() * 99000) + 1000;
      const totalValue = diceRoll + country.armies;

      // Update unrest level based on comparison with national pride
      if (totalValue < country.nationalPride) {
        country.unrestLevel = Math.min(country.unrestLevel + 1, 2);
        country.nationalPride = Math.min(country.nationalPride + 1000, 100000);
      } else {
        country.unrestLevel = Math.max(country.unrestLevel - 1, 0);
        country.nationalPride = Math.max(country.nationalPride - 1000, 1000);
      }

      // Handle rebellion if unrest level reaches 2
      if (country.unrestLevel === 2) {
        // Create new AI player
        const newPlayer = new Player(
          Game.generateAIName(),
          Player.COLORS[this.players.length % Player.COLORS.length],
          [],
          null,
          [],
          0,
          true
        );

        // Try to add the player
        if (this.AddPlayer(newPlayer)) {
          // Remove country from old owner's owned countries
          const oldOwner = country.owner;
          if (oldOwner) {
            oldOwner.ownedCountries = oldOwner.ownedCountries.filter(c => c !== country);
          }
          this.UnKnowCountry(country);
          country.nationalPride = 1000;
          country.unrestLevel = 0;
          country.income *= 2;
          // Set up new player
          newPlayer.homeCountry = country;
          newPlayer.ownedCountries.push(country);
          country.owner = newPlayer;
          country.armies = country.nationalPride * 2;
          country.fortified = true;

          // Initialize AI
          newPlayer.game = this;
          newPlayer.AI = new AI(newPlayer, this);
        } else {
          // If AddPlayer fails, make the country unowned
          const oldOwner = country.owner;
          if (oldOwner) {
            oldOwner.ownedCountries = oldOwner.ownedCountries.filter(c => c !== country);
          }
          this.UnKnowCountry(country);
          country.owner = null;
          country.armies = country.nationalPride;
          country.fortified = false;
        }
      }
    }
  }

  /**
   * Removes a country from all players' knowledge.
   * @param country The country to remove from knowledge
   */
  UnKnowCountry(country: Country) {
    for (const player of this.players) {
      player.knowledge = player.knowledge.filter(k => k.country !== country);
    }
  }
}
