import { Country } from './Country';
import { Action } from './Action';

/**
 * Represents an actionable opportunity for the AI, including the countries involved, amount, action, and a score.
 */
export class Opportunity {
  countries: Country[];
  amount: number;
  action: Action;
  score: number;

  constructor(countries: Country[], amount: number, action: Action, score: number) {
    this.countries = countries;
    this.amount = amount;
    this.action = action;
    this.score = score;
  }
}
