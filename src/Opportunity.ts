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
  followUp: Opportunity | null;

  constructor(countries: Country[], amount: number, action: Action, score: number, followUp: Opportunity | null = null) {
    this.countries = countries;
    this.amount = amount;
    this.action = action;
    this.score = score;
    this.followUp = followUp;
  }
}
