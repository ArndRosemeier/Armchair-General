import { Action } from './Action';
import { Country } from './Country';
import { Player } from './Player';
import { Game } from './Game';
import { ActionAttack } from './ActionAttack';

export class ActionCalculateAttack extends Action {
  /**
   * Returns button text for the calculate attack action, using selected countries and the active player.
   * If less than two countries are selected, or if the last country is not a valid attack target, returns null.
   */
  GetButtonText(countries: Country[], activePlayer: Player): string | null {
    if (countries.length < 2) {
      return null;
    }
    const fromCountry = countries[countries.length - 2];
    const toCountry = countries[countries.length - 1];
    if (fromCountry.owner !== activePlayer || fromCountry === toCountry) {
      return null;
    }
    const isNeighbor = fromCountry.neighbors.includes(toCountry);
    const isNaval = fromCountry.oceanBorder.length > 0 && toCountry.oceanBorder.length > 0;
    if (!isNeighbor && !isNaval) {
      return null;
    }
    if (toCountry.owner === activePlayer) {
      return null;
    }
    return `Calculate attack chance for ${toCountry.name} from ${fromCountry.name}`;
  }

  /**
   * Instead of performing the attack, simply calculate and return the attack chance as a string.
   */
  Act(countries: Country[], activePlayer: Player, currentGame: Game, amount: number = 0): string | null {
    if (!currentGame) {
      return 'Internal error: currentGame is required.';
    }
    if (countries.length < 2) {
      return 'Select source and target countries to calculate attack.';
    }
    const fromCountry = countries[countries.length - 2];
    const toCountry = countries[countries.length - 1];
    if (fromCountry.owner !== activePlayer) {
      return 'You must own the attacking country.';
    }
    const isNeighbor = fromCountry.neighbors.includes(toCountry);
    const isNaval = fromCountry.oceanBorder.length > 0 && toCountry.oceanBorder.length > 0;
    if (!isNeighbor && !isNaval) {
      return 'Target country must be a neighbor or reachable by naval attack.';
    }
    if (toCountry.owner === activePlayer) {
      return 'Cannot attack your own country.';
    }
    if (amount <= 0 || amount >= fromCountry.armies) {
      return 'Invalid number of armies committed.';
    }
    // Calculate and return chance only
    const chance = ActionAttack.AttackChance(fromCountry, toCountry, amount, currentGame);
    return `Attack chance: ${(chance * 100).toFixed(2)}%`;
  }

  RequiresAmount(countries: Country[]): [number, number] | null {
    if (countries.length < 2) return null;
    const fromCountry = countries[countries.length - 2];
    if (!fromCountry || typeof fromCountry.armies !== 'number' || fromCountry.armies <= 1) return null;
    return [1000, fromCountry.armies - 1000];
  }
}
