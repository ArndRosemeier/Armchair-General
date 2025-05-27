import { Action } from './Action';
import { Country } from './Country';
import { Player } from './Player';
import { Game } from './Game';

/**
 * ActionInvest allows a player to invest money into a country to increase its income.
 */
export class ActionInvest extends Action {
  /**
   * Returns button text for the invest action, using the selected country and the active player.
   * Requires one friendly country.
   */
  GetButtonText(countries: Country[], activePlayer: Player): string | null {
    if (countries.length < 1) return null;
    const country = countries[countries.length - 1];
    if (!country || country.owner !== activePlayer) return null;
    return `Invest in ${country.name}`;
  }

  /**
   * Invests money into a country, increasing its income by one fifth of the amount (rounded down to nearest 1000).
   * Deducts the full amount from the player's money.
   */
  async Act(countries: Country[], activePlayer: Player, currentGame: Game, amount: number = 0): Promise<string | null> {
    if (!currentGame) {
      return 'Internal error: currentGame is required.';
    }
    if (countries.length < 1) {
      return 'Select a country to invest in.';
    }
    const country = countries[countries.length - 1];
    if (country.owner !== activePlayer) {
      return 'You can only invest in your own country.';
    }
    if (amount <= 0) {
      return 'Investment amount must be positive.';
    }
    if (activePlayer.money < amount) {
      return 'You do not have enough money to invest.';
    }
    // Calculate max possible income increase
    const maxIncrease = country.IncomePotential - country.income;
    if (maxIncrease <= 0) {
      return `${country.name} is already at its income potential.`;
    }
    // Calculate the actual amount needed to reach potential
    let incomeIncrease = Math.floor((amount / 5) / 1000) * 1000;
    if (incomeIncrease <= 0) {
      return 'Investment amount too small to increase income.';
    }
    if (incomeIncrease > maxIncrease) {
      incomeIncrease = Math.floor(maxIncrease / 1000) * 1000;
    }
    if (incomeIncrease <= 0) {
      return 'Investment amount too small to increase income.';
    }
    // Calculate the actual money to deduct
    let actualAmount = incomeIncrease * 5;
    if (actualAmount > amount) actualAmount = amount;
    country.income += incomeIncrease;
    activePlayer.money -= actualAmount;
    return `Invested ${actualAmount} in ${country.name}. Income increased by ${incomeIncrease}. New income: ${country.income} (Potential: ${country.IncomePotential})`;
  }

  /**
   * Requires an amount between 5000 and the player's available money (rounded down to nearest 1000).
   */
  RequiresAmount(countries: Country[], activePlayer: Player, currentGame: Game): [number, number] | null {
    if (countries.length < 1) return null;
    const country = countries[countries.length - 1];
    if (!country) return null;
    const min = 5000;
    // Calculate the max possible increase
    const maxIncrease = country.IncomePotential - country.income;
    if (maxIncrease <= 0) return null;
    // The max amount is the money needed to reach the potential, floored to nearest 1000
    let max = Math.floor((maxIncrease * 5) / 1000) * 1000;
    // Also cap to player's available money (rounded down)
    max = Math.min(max, Math.floor(activePlayer.money / 1000) * 1000);
    if (max < min) return null;
    return [min, max];
  }

  get countryCountNeeded(): number {
    return 1;
  }

  /**
   * Returns the type of the action as a string.
   */
  Type(): string {
    return 'Invest';
  }

  /**
   * Returns a string describing the action.
   */
  ActionString(countries: Country[], activePlayer: Player, currentGame: Game, amount: number = 0): string {
    if (countries.length < 1) return 'Invest: No country selected.';
    const country = countries[countries.length - 1];
    return `Investing ${amount} in ${country.name}`;
  }
} 