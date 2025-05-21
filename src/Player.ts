import { Country } from './Country';
import { Strategy } from './Strategy';
import { Game } from './Game';

export interface CountryKnowledge {
  country: Country;
  gameTurn: number;
  army: number; // observed army size at time of spying
  income: number; // observed income at time of spying
}

export interface CountryInfo {
  name: string;
  owner: Player | null;
  income: number | undefined;
  army: number | undefined;
  recency: number | undefined;
}

import { AI } from './AI';

export interface PlayerActionLogEntry {
  actionType: string;
  countries: Country[];
  amount: number;
  result: string | null;
}

export class Player {
  static readonly ACTIONS_PER_TURN = 5;
  actionsLeft: number = Player.ACTIONS_PER_TURN;
  game?: Game;
  actionLog: PlayerActionLogEntry[] = [];

  /**
   * Resets the available actions to the turn limit.
   */
  resetActions() {
    this.actionsLeft = Player.ACTIONS_PER_TURN;
  }

  /**
   * Decrements the actions left for the player, to be called when an action is taken.
   */
  useAction() {
    if (this.actionsLeft > 0) this.actionsLeft--;
  }
  /**
   * Lookup for color names to RGB values
   */
  private static COLOR_RGBS: { [key: string]: string } = {
    red: "255,0,0",
    blue: "0,0,255",
    green: "0,128,0",
    yellow: "255,255,0",
    purple: "128,0,128",
    orange: "255,140,0",
    teal: "0,128,128",
    brown: "139,69,19"
  };

  /**
   * Returns the RGB color string for the player's color (e.g., '255,0,0').
   * Defaults to '0,0,0' (black) if color is unknown.
   */
  get RGBColor(): string {
    return Player.COLOR_RGBS[this.color] || "0,0,0";
  }

  static COLORS = [
    "red", "blue", "green", "yellow",
    "purple", "orange", "teal", "brown"
  ];
  name: string;
  color: string;
  ownedCountries: Country[];
  homeCountry: Country | null;
  /**
   * Whether this player is an AI (true) or a human (false)
   */
  isAI: boolean;
  /**
   * The AI instance for this player, if AI. Undefined for human players.
   */
  AI: AI;
  /**
   * Player's available money.
   */
  money: number;
  /**
   * Knowledge about countries the player owns or has spied upon.
   * Each entry is a country and the turn it was spied upon.
   */
  knowledge: CountryKnowledge[];
  /**
   * List of planned fortifications: [Country, int]
   */
  plannedFortifications: [Country, number][] = [];
  aggressivity: number;

  constructor(
    name: string,
    color: string,
    ownedCountries: Country[] = [],
    homeCountry: Country | null = null,
    knowledge: CountryKnowledge[] = [],
    money: number = 0,
    isAI: boolean = false
  ) {
    this.name = name;
    this.color = color;
    this.ownedCountries = ownedCountries;
    this.homeCountry = homeCountry;
    this.knowledge = knowledge;
    this.money = money;
    this.isAI = isAI;
    this.actionsLeft = Player.ACTIONS_PER_TURN;
    this.aggressivity = Math.floor(Math.random() * 8) + 2;
    this.AI = new AI(this, undefined as any); // Game will be set later
  }

  /**
   * Returns both the owned countries and known countries (from spying)
   * in a combined object.
   */
  getKnownCountries(): { owned: Country[]; known: Country[] } {
    const knownCountriesSet = new Set<Country>();
    
    // Add countries from knowledge (spied upon)
    this.knowledge.forEach(item => knownCountriesSet.add(item.country));
    
    // Filter out owned countries from the known set to avoid duplicates
    const knownCountries = Array.from(knownCountriesSet)
      .filter(country => !this.ownedCountries.includes(country));
    
    return {
      owned: [...this.ownedCountries],
      known: knownCountries
    };
  }

  /**
   * Returns an info object for the given country, including:
   * - name: from country
   * - owner: from country
   * - income: from country if owned by this player, else from knowledge
   * - army: from country if owned by this player, else from knowledge
   * - recency: 0 if owned by this player, else (currentGameTurn - knowledge.gameTurn) or null if no knowledge
   */
  getCountryInfo(country: Country, currentGameTurn: number): CountryInfo {
    if (country.owner === this) {
      return {
        name: country.name,
        owner: country.owner,
        income: country.income,
        army: country.armies,
        recency: 0
      };
    } else {
      const knowledge = this.knowledge.find(k => k.country === country);
      return {
        name: country.name,
        owner: country.owner,
        income: knowledge ? knowledge.income : undefined,
        army: knowledge ? knowledge.army : undefined,
        recency: knowledge ? (currentGameTurn - knowledge.gameTurn) : undefined
      };
    }
  }

  /**
   * Returns the total income from all owned countries.
   */
  totalIncome(): number {
    return this.ownedCountries.reduce((sum, country) => {
      // Skip countries with unrest level > 0
      if (country.unrestLevel > 0) return sum;
      return sum + (country.income ?? 0);
    }, 0);
  }

  /**
   * Returns the total army count from all owned countries.
   */
  totalArmies(): number {
    return this.ownedCountries.reduce((sum, country) => sum + (country.armies ?? 0), 0);
  }

  /**
   * Called whenever a player starts a turn. Resets actions and can be extended for per-turn logic.
   */
  startTurn() {
    this.resetActions();
    // Add any other per-turn initialization logic here if needed
  }

  /**
   * Returns the share of total income this player has among all players (between 0 and 1).
   */
  get IncomeShare(): number {
    if (!this.game || !this.game.players || this.game.players.length === 0) return 0;
    const total = this.game.players.reduce((sum, p) => sum + (p.totalIncome?.() ?? 0), 0);
    if (total === 0) return 0;
    return this.totalIncome() / total;
  }

  /**
   * Returns true if the player knows the army size of the given country.
   * - If the player owns the country
   * - If nobody owns the country and it is in the player's knowledge
   * - If somebody else owns the country, it is in the knowledge and the knowledge is from the current game turn
   */
  armyKnown(country: Country): boolean {
    if (country.owner === this) return true;
    const knowledge = this.knowledge.find(k => k.country === country);
    if (!country.owner && knowledge) return true;
    if (country.owner && country.owner !== this && knowledge && this.game && knowledge.gameTurn === this.game.gameTurn) return true;
    return false;
  }

  toJSON() {
    return {
      id: this.name, // Use name as unique ID
      name: this.name,
      color: this.color,
      ownedCountryIds: this.ownedCountries.map(c => c.name),
      homeCountryId: this.homeCountry ? this.homeCountry.name : null,
      isAI: this.isAI,
      money: this.money,
      knowledge: this.knowledge.map(k => ({
        countryId: k.country.name,
        gameTurn: k.gameTurn,
        army: k.army,
        income: k.income
      })),
      plannedFortifications: this.plannedFortifications.map(([country, turn]) => [country.name, turn]),
      aggressivity: this.aggressivity,
      actionsLeft: this.actionsLeft
      // AI, game, and actionLog are not serialized (rebuild or ignore for now)
    };
  }

  /**
   * fromJSON: create a Player from plain data, then resolve references.
   * @param data - plain object from JSON
   * @param countryRegistry - map of country name to Country instance
   */
  static fromJSON(data: any, countryRegistry: Record<string, any>): Player {
    const p = new Player(
      data.name,
      data.color,
      [], // ownedCountries will be resolved later
      null, // homeCountry will be resolved later
      [], // knowledge will be resolved later
      data.money,
      data.isAI
    );
    p.aggressivity = data.aggressivity;
    p.actionsLeft = data.actionsLeft ?? Player.ACTIONS_PER_TURN;
    // Store for later resolution
    (p as any)._ownedCountryIds = data.ownedCountryIds;
    (p as any)._homeCountryId = data.homeCountryId;
    (p as any)._knowledgeRaw = data.knowledge;
    (p as any)._plannedFortificationsRaw = data.plannedFortifications;
    return p;
  }

  /**
   * After all countries are created, resolve references.
   */
  resolveReferences(countryRegistry: Record<string, any>) {
    this.ownedCountries = ((this as any)._ownedCountryIds || []).map((id: string) => countryRegistry[id]).filter(Boolean);
    this.homeCountry = (this as any)._homeCountryId ? countryRegistry[(this as any)._homeCountryId] : null;
    this.knowledge = ((this as any)._knowledgeRaw || []).map((k: any) => ({
      country: countryRegistry[k.countryId],
      gameTurn: k.gameTurn,
      army: k.army,
      income: k.income
    }));
    this.plannedFortifications = ((this as any)._plannedFortificationsRaw || []).map(
      ([countryId, turn]: [string, number]) => [countryRegistry[countryId], turn]
    );
    delete (this as any)._ownedCountryIds;
    delete (this as any)._homeCountryId;
    delete (this as any)._knowledgeRaw;
    delete (this as any)._plannedFortificationsRaw;
  }
}
