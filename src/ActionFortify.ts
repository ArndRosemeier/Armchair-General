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
    if (lastCountry.owner !== activePlayer || !lastCountry.canBeFortified()) {
      return null;
    }
    return `Fortify ${lastCountry.name}`;
  }

  async Act(countries: Country[], activePlayer: Player, currentGame: Game, amount: number = 0): Promise<string | null> {
    if (!currentGame) {
      return 'Internal error: currentGame is required.';
    }
    if (countries.length === 0) {
      return 'Please select a country to fortify.';
    }
    const target = countries[countries.length - 1];
    if (!target.canBeFortified()) {
      return `${target.name} cannot be fortified.`;
    }
    if (activePlayer.money < Game.fortifyCost) {
      return `Not enough money to fortify. You need $${Game.fortifyCost}.`;
    }
    activePlayer.money -= Game.fortifyCost;
    activePlayer.plannedFortifications.push([target, currentGame.gameTurn + 2]);
    return `Fortification planned for ${target.name} on turn ${currentGame.gameTurn + 2}.`;
  }

  RequiresAmount(countries: Country[], activePlayer: Player, currentGame: Game): [number, number] | null {
    return null;
  }

  get countryCountNeeded(): number {
    return 1;
  }

  /**
   * Returns the type of the action as a string.
   */
  Type(): string {
    return 'Fortify';
  }

  ActionString(countries: Country[], activePlayer: Player, currentGame: Game, amount: number = 0): string {
    if (countries.length < 1) return 'Fortify: No country selected.';
    const country = countries[countries.length - 1];
    return `Fortifying ${country.name}`;
  }
}
