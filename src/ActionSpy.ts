import { Action } from './Action';
import { Game } from './Game';
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
    if (lastCountry.owner == activePlayer) return null;
    const knowledge = activePlayer.knowledge.find(k => k.country === lastCountry);
    const gameTurn = activePlayer.game?.gameTurn;
    if (!lastCountry.owner && knowledge) return null;
    if (lastCountry.owner && lastCountry.owner !== activePlayer && knowledge && knowledge.gameTurn === gameTurn) return null;
    return `Spy on ${lastCountry.name}`;
  }

  async Act(countries: Country[], activePlayer: Player, currentGame: Game, amount: number = 0): Promise<string | null> {
    // 1. Check if at least one country is given
    if (countries.length === 0) {
      return 'Please select a country to spy on.';
    }
    // 2. Take the latest country as the target
    const target = countries[countries.length - 1];
    // 3. Check if player has enough money
    const spyCost = target.fortified ? Game.spyFortifiedCost : Game.spyCost;
    if (activePlayer.money < spyCost) {
      return `Not enough money to spy. You need $${spyCost}.`;
    }
    // 4. Check if country is already in knowledge and was spied on this turn
    const knowledge = activePlayer.knowledge.find(k => k.country === target);
    if (!currentGame) {
      return 'Internal error: currentGame is required.';
    }
    const gameTurn = currentGame.gameTurn;
    if (knowledge && knowledge.gameTurn === gameTurn) {
      return 'You already have recent information about this country.';
    }
    // 5. Deduct spycost and update knowledge
    activePlayer.money -= spyCost;
    const newKnowledge = {
      country: target,
      gameTurn: gameTurn,
      army: target.armies,
      income: target.income
    };
    if (knowledge) {
      knowledge.gameTurn = newKnowledge.gameTurn;
      knowledge.army = newKnowledge.army;
      knowledge.income = newKnowledge.income;
    } else {
      activePlayer.knowledge.push(newKnowledge);
    }
    return null;
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
    return 'Spy';
  }

  ActionString(countries: Country[], activePlayer: Player, currentGame: Game, amount: number = 0): string {
    if (countries.length < 1) return 'Spy: No country selected.';
    const country = countries[countries.length - 1];
    return `Spying on ${country.name}`;
  }
}
