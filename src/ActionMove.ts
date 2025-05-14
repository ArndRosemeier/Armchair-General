import { Action } from './Action';
import { Country } from './Country';
import { Player } from './Player';
import { Game } from './Game';

/**
 * ActionMove allows moving armies between two friendly countries.
 */
export class ActionMove extends Action {
  /**
   * Returns button text for the move action, using selected countries and the active player.
   * Requires two friendly countries.
   */
  GetButtonText(countries: Country[], activePlayer: Player): string | null {
    if (countries.length < 2) return null;
    const fromCountry = countries[countries.length - 2];
    const toCountry = countries[countries.length - 1];
    if (!fromCountry || !toCountry) return null;
    if (fromCountry.owner !== activePlayer || toCountry.owner !== activePlayer) return null;
    if (fromCountry === toCountry) return null;
    return `Move armies from ${fromCountry.name} to ${toCountry.name}`;
  }

  /**
   * Moves armies from one friendly country to another.
   * @param countries List of countries (last two are source and target)
   * @param activePlayer The player performing the move
   * @param currentGame The current game instance
   * @param amount Number of armies to move
   */
  async Act(countries: Country[], activePlayer: Player, currentGame: Game, amount: number = 0): Promise<string | null> {
    if (!currentGame) {
      return 'Internal error: currentGame is required.';
    }
    if (countries.length < 2) {
      return 'Select source and target countries to move armies.';
    }
    const fromCountry = countries[countries.length - 2];
    const toCountry = countries[countries.length - 1];
    if (fromCountry.owner !== activePlayer || toCountry.owner !== activePlayer) {
      return 'Both countries must be owned by you.';
    }
    if (fromCountry === toCountry) {
      return 'Source and target countries must be different.';
    }
    if (amount <= 0 || amount >= fromCountry.armies) {
      return 'Invalid number of armies to move.';
    }
    // Move armies
    fromCountry.armies -= amount;
    toCountry.armies += amount;
    return `Moved ${amount} armies from ${fromCountry.name} to ${toCountry.name}.`;
  }

  /**
   * Requires an amount: at least 1, at most all but one army in the source country.
   */
  RequiresAmount(countries: Country[], activePlayer: Player, currentGame: Game): [number, number] | null {
    if (countries.length < 2) return null;
    const fromCountry = countries[countries.length - 2];
    if (!fromCountry || typeof fromCountry.armies !== 'number' || fromCountry.armies <= 1) return null;
    return [1000, fromCountry.armies - 1000];
  }
}
