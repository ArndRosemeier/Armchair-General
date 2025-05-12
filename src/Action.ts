import { Country } from './Country';
import { Player } from './Player';
import { Game } from './Game';

export abstract class Action {
  /**
   * Return the button text for this action, given a list of countries and the active player.
   * @param countries List of Country objects
   * @param activePlayer The active player
   */
  abstract GetButtonText(countries: Country[], activePlayer: Player): string | null;

  /**
   * Perform the action, given a list of countries and the active player.
   * @param countries List of Country objects
   * @param activePlayer The active player
   * @param currentGame The current game instance
   * @param amount Optional amount parameter (default 0)
   * @returns A string describing the result or outcome of the action.
   */
  abstract Act(countries: Country[], activePlayer: Player, currentGame: Game, amount?: number): string | null;
  /**
   * Returns null if this action does not require an amount, or [min, max] if it does.
   * @param countries List of Country objects currently selected
   * Override in derived classes if needed.
   */
  RequiresAmount(countries: Country[]): [number, number] | null {
    return null;
  }
}
