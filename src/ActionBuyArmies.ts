import { Action } from './Action';
import { Country } from './Country';
import { Player } from './Player';
import { Game } from './Game';

/**
 * ActionBuyArmies allows a player to buy armies for a friendly country.
 */
export class ActionBuyArmies extends Action {
  /**
   * Returns button text for the buy armies action, using the selected country and the active player.
   * Requires one friendly country.
   */
  GetButtonText(countries: Country[], activePlayer: Player): string | null {
    if (countries.length < 1) return null;
    const country = countries[countries.length - 1];
    if (!country || country.owner !== activePlayer) return null;
    return `Buy armies for ${country.name}`;
  }

  /**
   * Buys armies for a friendly country, deducting the cost from the player.
   * @param countries List of countries (last is the target)
   * @param activePlayer The player buying armies
   * @param currentGame The current game instance
   * @param amount Number of armies to buy
   */
  async Act(countries: Country[], activePlayer: Player, currentGame: Game, amount: number = 0): Promise<string | null> {
    if (!currentGame) {
      return 'Internal error: currentGame is required.';
    }
    if (countries.length < 1) {
      return 'Select a friendly country to buy armies for.';
    }
    const country = countries[countries.length - 1];
    if (country.owner !== activePlayer) {
      return 'You must own the target country.';
    }
    if (amount <= 0) {
      return 'Invalid number of armies to buy.';
    }
    const cost = amount * Game.armyCost;
    if (activePlayer.money < cost) {
      return `Not enough money. Need ${cost.toLocaleString()}, have ${activePlayer.money.toLocaleString()}.`;
    }
    // Deduct money and add armies
    activePlayer.money -= cost;
    country.armies += amount;
    return `Bought ${amount} armies for ${country.name} at a cost of ${cost.toLocaleString()}.`;
  }

  /**
   * Requires an amount: at least 1, at most 1,000,000 (or adjust as needed).
   */
  RequiresAmount(countries: Country[], activePlayer: Player, currentGame: Game): [number, number] | null {
    const maxAffordable = Math.floor(activePlayer.money / Game.armyCost / 1000) * 1000;
    if (maxAffordable < 1000) return null;
    return [1000, maxAffordable];
  }

  get countryCountNeeded(): number {
    return 1;
  }

  /**
   * Returns the type of the action as a string.
   */
  Type(): string {
    return 'BuyArmies';
  }

  ActionString(countries: Country[], activePlayer: Player, currentGame: Game, amount: number = 0): string {
    if (countries.length < 1) return 'Buy Armies: No country selected.';
    const country = countries[countries.length - 1];
    return `Buying ${amount} armies for ${country.name}`;
  }
}
