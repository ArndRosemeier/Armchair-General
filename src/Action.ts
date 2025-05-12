import { Country } from './Country';
import { Player } from './Player';

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
   */
  abstract Act(countries: Country[], activePlayer: Player): void;
}
