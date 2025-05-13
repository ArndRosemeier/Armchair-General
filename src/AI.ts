import { Player } from './Player';
import { Game } from './Game';
import { Country } from './Country';
import { Opportunity } from './Opportunity';
import { Action } from './Action';
import { ActionAttack } from './ActionAttack';
import { ActionSpy } from './ActionSpy';
import { ActionMove } from './ActionMove';
import { ActionFortify } from './ActionFortify';

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
   * Finds spy opportunities by selecting 10 random countries and evaluating them.
   * Returns an array of Opportunity objects for valid targets.
   */
  FindSpyOpportunities(): Opportunity[] {
    const action = new ActionSpy();
    const worldMap = this.game.worldMap;
    const allCountries = worldMap.getCountries();
    const opportunities: Opportunity[] = [];
    for (const country of allCountries) {
      const knowledge = this.player.knowledge.find(k => k.country === country);
      const isOwnedByOther = country.owner && country.owner !== this.player;
      const isUnknown = !knowledge;
      const isStale = isOwnedByOther && knowledge && (this.game.gameTurn - knowledge.gameTurn) > 3;
      if (isUnknown || isStale) {
        const [, score] = this.countryBestAttackerScore(country);
        opportunities.push(new Opportunity([country], 0, action, score * 1.1));
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
      if (!country.owner || country.owner === this.player) continue; // Only consider enemy countries
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
  takeTurn(): boolean {
    if (this.player.actionsLeft <= 0) return false;
    const opportunity = this.findBestOpportunity();
    if (!opportunity) return false;
    opportunity.action.Act(opportunity.countries, this.player, this.game, opportunity.amount);
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
      if (attackChance >= 0.5) {
        score = attackChance * this.countryScore(country);
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
        opportunities.push(new Opportunity([strongest, bestTarget], amount, action, bestScore * 100));
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
        const score = country.income / 1000;
        opportunities.push(new Opportunity([country], 0, action, score));
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
}
