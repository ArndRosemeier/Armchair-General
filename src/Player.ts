import { Country } from './Country';

export interface CountryKnowledge {
  country: Country;
  gameTurn: number;
  army: number; // observed army size at time of spying
  income: number; // observed income at time of spying
}

export class Player {
  name: string;
  color: string;
  ownedCountries: Country[];
  homeCountry: Country | null;
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
    money: number = 0
  ) {
    this.name = name;
    this.color = color;
    this.ownedCountries = ownedCountries;
    this.homeCountry = homeCountry;
    this.knowledge = knowledge;
    this.money = money;
  }
}

