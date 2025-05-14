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

  Act(countries: Country[], activePlayer: Player, currentGame: Game, amount: number = 0): string | null {
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
    // Actual combat logic
    if (amount <= 0 || amount >= fromCountry.armies) {
      return 'Invalid number of armies committed.';
    }
    // Calculate chance
    const chance = ActionAttack.AttackChance(fromCountry.armies, toCountry.armies, currentGame.worldMap.distance(fromCountry, toCountry) || 0, toCountry.fortified, currentGame);
    const roll = Math.random();
    const delta = Math.sqrt(Math.abs(roll - chance));
    let resultMsg = '';
    fromCountry.armies -= amount;
    if (roll < chance) {
      // Attack successful
      const previousOwner = toCountry.owner;
      if (previousOwner) {
        previousOwner.ownedCountries = previousOwner.ownedCountries.filter(c => c !== toCountry);
      }
      toCountry.owner = activePlayer;
      activePlayer.ownedCountries.push(toCountry);
      // Defenders obliterated, attackers occupy with portion of amount based on delta
      // The closer the roll to chance, the fewer attackers remain
      // E.g., if delta is small, more attackers lost
      // Let's use: survivors = Math.max(1, Math.round(amount * delta))
      let survivors = Math.max(1, Math.round(amount * Math.sqrt(delta)));
      // Round survivors to nearest 1000, minimum 1000 if any survive
      if (survivors > 0) {
        survivors = Math.max(1000, Math.round(survivors / 1000) * 1000);
      }
      toCountry.armies = survivors;
      toCountry.fortified = false;
      resultMsg = `Attack successful! ${survivors} of your ${amount} armies occupy ${toCountry.name}.`;
    } else {
      // Attack repelled
      // All attackers lost, defenders diminished by portion based on delta
      // defenders lost = Math.round(toCountry.armies * delta)
      let defendersLost = Math.round(toCountry.armies * Math.sqrt(delta));
      // Round defendersLost to nearest 1000, minimum 1000 if any lost
      if (defendersLost > 0) {
        defendersLost = Math.max(1000, Math.round(defendersLost / 1000) * 1000);
      }
      toCountry.armies = Math.max(1, toCountry.armies - defendersLost);
      // Ensure remaining defenders is a multiple of 1000 if > 0
      if (toCountry.armies > 0) {
        toCountry.armies = Math.max(1000, Math.round(toCountry.armies / 1000) * 1000);
      }
      resultMsg = `Attack failed! All ${amount} attacking armies lost. Defenders lost ${defendersLost} troops.`;
    }
    return resultMsg;

  }

  /**
   * Calculates the chance of a successful attack.
   * @param attacker The attacking country
   * @param defender The defending country
   * @param attackerCommittedArmy Number of armies committed by attacker
   * @param game The game instance (for worldMap)
   * @returns Chance of success (0 to 1)
   */
  static AttackChance(attackForce: number, defenseForce: number, dist: number, fortified: boolean, game: Game): number {
    if (dist === null) return 0;
    defenseForce *= (dist / 100);
    if (fortified) defenseForce *= 2;

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

  RequiresAmount(countries: Country[], activePlayer: Player, currentGame: Game ): [number, number] | null {
    if (countries.length < 2) return null;
    const fromCountry = countries[countries.length - 2];
    if (!fromCountry || typeof fromCountry.armies !== 'number' || fromCountry.armies <= 1) return null;
    return [1000, fromCountry.armies - 1000];
  }
}
