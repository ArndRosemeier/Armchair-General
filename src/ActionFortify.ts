import { Action } from './Action';
import { Country } from './Country';
import { Player } from './Player';
import { Game } from './Game';

export class ActionFortify extends Action {
  /**
   * Returns button text for the fortify action, using selected countries and the active player.
   */
  GetButtonText(countries: Country[], activePlayer: Player): string | null {
    if (countries.length === 0) {
      return null;
    }
    const lastCountry = countries[countries.length - 1];
    if (lastCountry.owner !== activePlayer || lastCountry.fortified) {
      return null;
    }
    return `Fortify ${lastCountry.name}`;
  }

  Act(countries: Country[], activePlayer: Player, currentGame: Game, amount: number = 0): string | null {
    if (!currentGame) {
      return 'Internal error: currentGame is required.';
    }
    if (countries.length === 0) {
      return 'Please select a country to fortify.';
    }
    const target = countries[countries.length - 1];
    if (activePlayer.money < Game.fortifyCost) {
      return `Not enough money to fortify. You need $${Game.fortifyCost}.`;
    }
    activePlayer.money -= Game.fortifyCost;
    target.fortified = true;
    return null;
  }

  RequiresAmount(countries: Country[]): [number, number] | null {
    return null;
  }
}
