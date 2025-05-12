import { Action } from './Action';
import { Country } from './Country';
import { Player } from './Player';

export class ActionSpy extends Action {
  /**
   * Returns button text for the spy action, using selected countries and the active player.
   */
  GetButtonText(countries: Country[], activePlayer: Player): string | null {
    if (countries.length === 0) {
      return null;
    }
    const lastCountry = countries[countries.length - 1];
    return `Spy on ${lastCountry.name}`;
  }

  Act(countries: Country[], activePlayer: Player): void {
    if (countries.length === 0) {
      console.log('[ActionSpy] No country selected to spy on.');
      return;
    }
    const lastCountry = countries[countries.length - 1];
    console.log(`[ActionSpy] ${activePlayer.name} spies on ${lastCountry.name}`);
  }
}
