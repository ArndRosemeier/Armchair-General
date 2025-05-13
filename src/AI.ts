import { Player } from './Player';
import { Game } from './Game';
import { Country } from './Country';
import { Opportunity } from './Opportunity';
import { Action } from './Action';
import { ActionAttack } from './ActionAttack';
import { ActionSpy } from './ActionSpy';
import { ActionMove } from './ActionMove';
import { ActionFortify } from './ActionFortify';
import { ActionBuyArmies } from './ActionBuyArmies';

/**
 * AI class for handling computer-controlled player logic.
 * Extend this class or implement methods for various AI strategies.
 */
export class AI {
  static readonly ATTACK_COMMIT = 0.8;
  player: Player;
  game: Game;

  constructor(player: Player, game: Game) {
    this.player = player;
    this.game = game;
  }

  /**
   * Returns the owned n countries with the highest army count.
   */
  GetBestArmies(n: number): Country[] {
    if (!this.player.ownedCountries || this.player.ownedCountries.length === 0) return [];
    // Sort owned countries by army count descending
    return this.player.ownedCountries
      .slice()
      .sort((a, b) => (b.armies || 0) - (a.armies || 0))
      .slice(0, n);
  }

  /**
   * Finds spy opportunities using distance to closest owned country.
   * Only considers countries that are not already known (if unowned) or are stale (if opponent owned).
   * Score is 500 - distance (if > 0).
   */
  FindSpyOpportunities(): Opportunity[] {
    const action = new ActionSpy();
    const opportunities: Opportunity[] = [];
    const nonOwned = this.getNonOwnedCountriesSortedByDistance();
    for (const { country, distance } of nonOwned) {
      const knowledge = this.player.knowledge.find(k => k.country === country);
      if (!country.owner) {
        // Dismiss if unowned and already in knowledge
        if (knowledge) continue;
      } else {
        // Dismiss if opponent owned and knowledge is not stale
        if (knowledge && (this.game.gameTurn - knowledge.gameTurn) <= 3) continue;
      }
      const score = 2000 - Math.sqrt(distance);
      if (score > 0) {
        const spyCost = country.fortified ? Game.spyFortifiedCost : Game.spyCost;
        if (this.player.money >= spyCost) {
          opportunities.push(new Opportunity([country], 0, action, score));
        }
      }
    }
    return opportunities;
  }

  /**
   * Finds attack opportunities by evaluating all enemy countries and checking if any owned country can attack them.
   * Returns an array of Opportunity objects for valid attacks.
   */
  FindAttackOpportunities(): Opportunity[] {
    const action = new ActionAttack();
    const worldMap = this.game.worldMap;
    const allCountries = worldMap.getCountries();
    const opportunities: Opportunity[] = [];
    for (const country of allCountries) {
      if (country.owner === this.player) continue; // Only consider enemy countries
      // Find the best owned country to attack this target
      const [attacker, score] = this.countryBestAttackerScore(country);
      if (!attacker) continue;
      // Calculate attack force (max possible, but must leave at least 1000 behind)
      const attackForce = Math.floor(attacker.armies * AI.ATTACK_COMMIT / 1000) * 1000;
      if (attackForce < 1000) continue;
      opportunities.push(new Opportunity([attacker, country], attackForce, action, score));
    }
    return opportunities;
  }

  /**
   * Main method for AI to take its turn. Finds and executes the best opportunity if actions remain.
   * Returns true if an action was taken, false otherwise.
   */
  takeAction(): boolean {
    if (this.player.actionsLeft <= 0) return false;
    const opportunity = this.findBestOpportunity();
    if (!opportunity) return false;
    console.log('Executing opportunity:', {
      countries: opportunity.countries.map(c => c.name),
      amount: opportunity.amount,
      action: opportunity.action.constructor.name,
      score: opportunity.score
    });
    const result = opportunity.action.Act(opportunity.countries, this.player, this.game, opportunity.amount);
    if (result) {
      console.log('Action result:', result);
    }
    this.player.useAction();
    return true;
  }

  /**
   * Estimates the defense strength of a country for AI decision making.
   * @param country The country to estimate defense for
   * @returns estimatedArmy
   */
  countryDefenseEstimate(country: Country): number {
    let estimatedArmy: number;
    const knowledge = this.player.knowledge.find(k => k.country === country);
    const isOwnedByOther = country.owner && country.owner !== this.player;
    if (isOwnedByOther && (!knowledge || (this.game.gameTurn - knowledge.gameTurn) > 3)) {
      estimatedArmy = 100000;
    } else if (!isOwnedByOther && !knowledge) {
      estimatedArmy = 70000;
    } else if (knowledge) {
      estimatedArmy = knowledge.army;
    } else {
      estimatedArmy = 70000;
    }
    if (country.fortified) {
      estimatedArmy *= 2;
    }
    return estimatedArmy;
  }

  /**
   * Scores a country for AI decision making: income divided by estimated defense.
   * @param country The country to score
   * @returns score (income / defense)
   */
  countryScore(country: Country): number {
    let income: number;
    const knowledge = this.player.knowledge.find(k => k.country === country);
    if (knowledge && typeof knowledge.income === 'number') {
      income = knowledge.income;
    } else {
      income = 1000000;
    }
    const defense = this.countryDefenseEstimate(country);
    return income / defense;
  }

  /**
   * Finds the best owned country to attack a target country, maximizing score.
   * @param country The target country
   * @returns [attackerCountry, score]
   */
  countryBestAttackerScore(country: Country): [Country | null, number] {
    const defenseForce = this.countryDefenseEstimate(country);
    let bestScore = 0;
    let bestAttacker: Country | null = null;
    for (const owned of this.player.ownedCountries) {
      const distance = this.game.worldMap.distance(owned, country);
      if (distance === null) continue;
      const attackForce = Math.round((owned.armies || 0) * AI.ATTACK_COMMIT / 1000) * 1000;
      if (attackForce < 1000) continue;
      const attackChance = ActionAttack.AttackChance(
        attackForce,
        defenseForce,
        distance,
        false, // fortified already in defenseForce
        this.game
      );
      let score = 0;
      if (attackChance >= 0.7) {
        score = attackChance * attackChance * attackChance  * this.countryScore(country) * 100;
      }
      if (score > bestScore) {
        bestScore = score;
        bestAttacker = owned;
      }
    }
    return [bestAttacker, bestScore];
  }

  /**
   * Finds move opportunities where the source is always the owned country with the most armies.
   * The target is either the owned land with the juiciest neighbor or the land with the fewest armies.
   * Only creates move opportunities between owned countries.
   */
  FindMoveOpportunities(action: Action): Opportunity[] {
    const opportunities: Opportunity[] = [];
    if (this.player.ownedCountries.length === 0) return opportunities;
    // Find the strongest owned country (source)
    const strongest = this.player.ownedCountries.reduce((max, c) => c.armies > max.armies ? c : max, this.player.ownedCountries[0]);
    // 1. Find the owned country with the juiciest neighbor
    let bestTarget: Country | null = null;
    let bestScore = -Infinity;
    for (const owned of this.player.ownedCountries) {
      for (const neighbor of owned.neighbors) {
        if (neighbor.owner !== this.player) {
          const score = this.countryScore(neighbor);
          if (score > bestScore) {
            bestScore = score;
            bestTarget = owned;
          }
        }
      }
    }
    if (bestTarget && bestTarget !== strongest) {
      // Move opportunity: move armies from strongest to the owned land with the juiciest neighbor
      const amount = Math.floor(strongest.armies * 0.5 / 1000) * 1000; // Move half armies, rounded
      if (amount > 0 && strongest !== bestTarget) {
        opportunities.push(new Opportunity([strongest, bestTarget], amount, action, bestScore));
      }
    }
    // 2. Find the weakest owned country and check if it needs reinforcement
    const avgArmy = this.player.totalArmies() / this.player.ownedCountries.length;
    const weakest = this.player.ownedCountries.reduce((min, c) => c.armies < min.armies ? c : min, this.player.ownedCountries[0]);
    if (weakest.armies < avgArmy / 2 && weakest !== strongest) {
      const amount = Math.floor(strongest.armies * 0.5 / 1000) * 1000; // Move half armies, rounded
      if (amount > 0 && strongest !== weakest) {
        opportunities.push(new Opportunity([strongest, weakest], amount, action, avgArmy - weakest.armies));
      }
    }
    return opportunities;
  }

  /**
   * Finds fortify opportunities for all owned, unfortified countries.
   * Returns an array of Opportunity objects for valid fortifications.
   */
  FindFortifyOpportunities(action: Action): Opportunity[] {
    const opportunities: Opportunity[] = [];
    for (const country of this.player.ownedCountries) {
      if (!country.fortified) {
        if (this.player.money >= Game.fortifyCost) {
          const score = country.income / 1000;
          opportunities.push(new Opportunity([country], 0, action, score));
        }
      }
    }
    return opportunities;
  }

  /**
   * Finds buy armies opportunities, prioritizing reinforcing the weakest country to average, then reinforcing near juicy targets.
   */
  FindBuyOpportunities(): Opportunity[] {
    const MoneyReserve = 2000000;
    if (this.player.money <= MoneyReserve) return [];  

    const opportunities: Opportunity[] = [];
    const action = new ActionBuyArmies();
    const money = this.player.money;
    const armyCost = Game.armyCost;
    const reserve = 2000000;
    const availableMoney = Math.max(0, money - reserve);
    if (this.player.ownedCountries.length === 0 || availableMoney < armyCost) return opportunities;
    const avgArmy = Math.floor(this.player.totalArmies() / this.player.ownedCountries.length);
    // 1. Bring weakest country up to average if possible
    const weakest = this.player.ownedCountries.reduce((min, c) => c.armies < min.armies ? c : min, this.player.ownedCountries[0]);
    if (weakest.armies < avgArmy) {
      const needed = avgArmy - weakest.armies;
      const affordable = Math.floor(availableMoney / armyCost);
      const amount = Math.min(needed, affordable, 100000);
      const roundedAmount = Math.floor(amount / 1000) * 1000;
      if (roundedAmount > 0) {
        const score = (avgArmy - weakest.armies) / 1000;
        opportunities.push(new Opportunity([weakest], roundedAmount, action, score));
      }
    }
    // 2. Reinforce the country with the juiciest neighbor
    let bestTarget: Country | null = null;
    let bestScore = -Infinity;
    for (const owned of this.player.ownedCountries) {
      for (const neighbor of owned.neighbors) {
        if (neighbor.owner !== this.player) {
          const score = this.countryScore(neighbor);
          if (score > bestScore) {
            bestScore = score;
            bestTarget = owned;
          }
        }
      }
    }
    if (!bestTarget) bestTarget = this.player.homeCountry;
    if (bestTarget) {
      const affordable = Math.floor((availableMoney - MoneyReserve) / armyCost);
      const roundedAffordable = Math.floor(affordable / 1000) * 1000;
      if (roundedAffordable > 0) {
        opportunities.push(new Opportunity([bestTarget], roundedAffordable, action, bestScore * 1000));
      }
    }
    return opportunities;
  }

  /**
   * Finds the best opportunity among all possible actions.
   * Logs all opportunities to the console and returns the one with the highest score.
   */
  findBestOpportunity(): Opportunity | null {
    // Prepare actions
    const spyAction = new ActionSpy();
    const attackAction = new ActionAttack();
    const moveAction = new ActionMove();
    const fortifyAction = new ActionFortify();

    // Gather all opportunities
    const allOpportunities: Opportunity[] = [];
    allOpportunities.push(...this.FindSpyOpportunities());
    allOpportunities.push(...this.FindAttackOpportunities());
    allOpportunities.push(...this.FindMoveOpportunities(moveAction));
    allOpportunities.push(...this.FindFortifyOpportunities(fortifyAction));
    allOpportunities.push(...this.FindBuyOpportunities());

    // Log all opportunities
    for (const opp of allOpportunities) {
      console.log('Opportunity:', {
        countries: opp.countries.map(c => c.name),
        amount: opp.amount,
        action: opp.action.constructor.name,
        score: opp.score
      });
    }

    // Return the best opportunity
    if (allOpportunities.length === 0) return null;
    return allOpportunities.reduce((best, curr) => curr.score > best.score ? curr : best, allOpportunities[0]);
  }

  /**
   * Returns all non-owned countries sorted by distance to the closest owned country.
   * If a country is not reachable, uses 10000 as the distance.
   */
  getNonOwnedCountriesSortedByDistance(): { country: Country, distance: number }[] {
    const worldMap = this.game.worldMap;
    const allCountries = worldMap.getCountries();
    const nonOwned: { country: Country, distance: number }[] = [];
    for (const country of allCountries) {
      if (country.owner === this.player) continue;
      let minDist = 10000;
      for (const owned of this.player.ownedCountries) {
        const dist = worldMap.distance(owned, country);
        if (dist !== null) {
          minDist = Math.min(minDist, dist);
        }
      }
      nonOwned.push({ country, distance: minDist });
    }
    nonOwned.sort((a, b) => a.distance - b.distance);
    return nonOwned;
  }
}
