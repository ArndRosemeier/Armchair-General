import { Action } from './Action';
import { Country } from './Country';
import { Player } from './Player';
import { Game } from './Game';

export class ActionAttack extends Action {
  /**
   * Returns button text for the attack action, using selected countries and the active player.
   * If less than two countries are selected, or if the last country is not a valid attack target, returns null.
   */
  GetButtonText(countries: Country[], activePlayer: Player): string | null {
    if (countries.length < 2) {
      return null;
    }
    const fromCountry = countries[countries.length - 2];
    const toCountry = countries[countries.length - 1];
    // Only allow attack if fromCountry is owned by player and toCountry is a neighbor and not owned by player
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
    return `Attack ${toCountry.name} from ${fromCountry.name}`;
  }

  Act(countries: Country[], activePlayer: Player, currentGame: Game): string | null {
    if (!currentGame) {
      return 'Internal error: currentGame is required.';
    }
    if (countries.length < 2) {
      return 'Select source and target countries to attack.';
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
    // Placeholder: no combat logic, just mark as conquered
    toCountry.owner = activePlayer;
    toCountry.armies = Math.floor(fromCountry.armies / 2);
    fromCountry.armies = Math.ceil(fromCountry.armies / 2);
    return null;
  }

  /**
   * Calculates the chance of a successful attack.
   * @param attacker The attacking country
   * @param defender The defending country
   * @param attackerCommittedArmy Number of armies committed by attacker
   * @param game The game instance (for worldMap)
   * @returns Chance of success (0 to 1)
   */
  static AttackChance(attacker: Country, defender: Country, attackerCommittedArmy: number, game: Game): number {
    let attackForce = attackerCommittedArmy;
    let defenseForce = defender.armies;
    const dist = game.worldMap.distance(attacker, defender);
    if (dist === null) return 0;
    defenseForce *= (dist / 100);
    if (defender.fortified) defenseForce *= 2;

    // Smooth interpolation:
    // - If attackForce >= 3 * defenseForce, chance = 1
    // - If attackForce <= (1/3) * defenseForce, chance = 0
    // - If attackForce == defenseForce, chance = 0.5
    if (attackForce >= 3 * defenseForce) return 1.0;
    if (attackForce <= (defenseForce / 3)) return 0.0;
    // Linear interpolation between the points
    // Map (defenseForce/3, 0) -> (defenseForce, 0.5) -> (3*defenseForce, 1)
    if (attackForce < defenseForce) {
      // From 0 to 0.5
      return 0.5 * (attackForce - (defenseForce / 3)) / (defenseForce - (defenseForce / 3));
    } else {
      // From 0.5 to 1
      return 0.5 + 0.5 * (attackForce - defenseForce) / (2 * defenseForce);
    }
  }
}
