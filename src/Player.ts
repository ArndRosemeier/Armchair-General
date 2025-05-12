import { Country } from './Country';
import { Strategy } from './Strategy';

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

export class Player {
  static readonly ACTIONS_PER_TURN = 5;
  actionsLeft: number = Player.ACTIONS_PER_TURN;

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
    yellow: "255,255,0"
  };

  /**
   * Returns the RGB color string for the player's color (e.g., '255,0,0').
   * Defaults to '0,0,0' (black) if color is unknown.
   */
  get RGBColor(): string {
    return Player.COLOR_RGBS[this.color] || "0,0,0";
  }

  static COLORS = ["red", "blue", "green", "yellow"];
  name: string;
  color: string;
  ownedCountries: Country[];
  homeCountry: Country | null;
  /**
   * Whether this player is an AI (true) or a human (false)
   */
  isAI: boolean;
  /**
   * The AI strategy for this player, if AI. Undefined for human players.
   */
  ai?: Strategy;
  /**
   * Player's available money.
   */
  money: number;
  /**
   * Knowledge about countries the player owns or has spied upon.
   * Each entry is a country and the turn it was spied upon.
   */
  knowledge: CountryKnowledge[];

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
}
