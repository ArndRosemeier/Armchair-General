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
   * @returns A string describing the result or outcome of the action.
   */
  abstract Act(countries: Country[], activePlayer: Player, currentGame: Game): string | null;
}
