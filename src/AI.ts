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
  public actionPlan: Opportunity[] = [];

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
    // Calculate knowledge goal for opponent-owned countries
    const worldMap = this.game.worldMap;
    const allCountries = worldMap.getCountries();
    const opponentCountries = allCountries.filter(c => c.owner && c.owner !== this.player);
    const n = Math.min(5, this.player.ownedCountries.length);
    let freshKnowledgeCount = 0;
    for (const country of opponentCountries) {
      const knowledge = this.player.knowledge.find(k => k.country === country);
      if (country.owner && country.owner !== this.player) {
        // For opponent-owned countries, knowledge is fresh if <= 3 turns old
        if (knowledge && (this.game.gameTurn - knowledge.gameTurn) <= 3) {
          freshKnowledgeCount++;
        }
      } else if (!country.owner) {
        // For unowned countries, knowledge never gets stale
        if (knowledge) {
          freshKnowledgeCount++;
        }
      }
    }
    let knowledgeBoost = 1;
    if (freshKnowledgeCount < n) {
      knowledgeBoost = 10;
    }
    for (const { country, distance } of nonOwned) {
      const knowledge = this.player.knowledge.find(k => k.country === country);
      if (!country.owner && knowledge) continue;
      if (country.owner && country.owner !== this.player) {
        // Only create spy opportunity if no knowledge or knowledge is stale (>3 turns)
        if (knowledge && (this.game.gameTurn - knowledge.gameTurn) <= 3) continue;
      }
      let score = 3000 - Math.sqrt(distance);
      score *= knowledgeBoost;
      if (score > 0) {
        const spyCost = country.fortified ? Game.spyFortifiedCost : Game.spyCost;
        if (this.player.money >= spyCost) {
          const adjustedScore = score * (this.player.totalIncome() / 5000000);
          opportunities.push(new Opportunity([country], 0, action, adjustedScore));
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
      opportunities.push(new Opportunity([attacker, country], attackForce, action, score * this.player.aggressivity));
    }
    return opportunities;
  }

  /**
   * Main method for AI to take its turn. Finds and executes the best opportunity if actions remain.
   * Returns true if an action was taken, false otherwise.
   */
  async takeAction(): Promise<boolean> {
    if (this.player.actionsLeft <= 0) return false;
    // With a chance of 0.2, do PlanSurpriseAttack if actionsLeft is 4 or more, but only if actionPlan is empty
    if (this.player.actionsLeft >= 4 && Math.random() < 0.2 && this.actionPlan.length === 0) {
      this.PlanSurpriseAttack();
      return true;
    }
    let opportunity: Opportunity | null = null;
    let fromActionPlan = false;
    if (this.actionPlan.length > 0) {
      opportunity = this.actionPlan.shift()!;
      fromActionPlan = true;
      // Revalidate before executing
      const act = opportunity.action;
      const countries = opportunity.countries;
      const amount = opportunity.amount;
      let valid = true;
      if (act instanceof ActionMove) {
        const donor = countries[0];
        if (!donor || donor.armies < amount + 1000) {
          console.warn('Skipping invalid move from actionPlan:', opportunity);
          this.actionPlan = [];
          return false;
        }
      } else if (act instanceof ActionAttack) {
        const fromCountry = countries[0];
        const toCountry = countries[1];
        if (!fromCountry || !toCountry || toCountry.owner === this.player || fromCountry.armies < amount) {
          console.warn('Skipping invalid attack from actionPlan:', opportunity);
          this.actionPlan = [];
          return false;
        }
      } else if (act instanceof ActionBuyArmies) {
        if (this.player.money < amount * Game.armyCost) {
          console.warn('Skipping invalid buy from actionPlan:', opportunity);
          this.actionPlan = [];
          return false;
        }
      }
    } else {
      opportunity = this.findBestOpportunity();
    }
    if (!opportunity) return false;
    const result = await opportunity.action.Act(opportunity.countries, this.player, this.game, opportunity.amount);
    // Log the action
    const usedCountries = opportunity.countries.slice(-opportunity.action.countryCountNeeded);
    this.player.actionLog.push({
      actionType: opportunity.action.Type(),
      countries: usedCountries,
      amount: opportunity.amount,
      result: result ?? null
    });
    // If the executed opportunity has a followUp and the actionPlan is empty, push it
    if (opportunity.followUp && this.actionPlan.length === 0) {
      this.actionPlan.push(opportunity.followUp);
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
        score = attackChance * attackChance * this.countryScore(country) * 1000;
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
   * The target is either the owned land with the a juicy target nearby or the land with the fewest armies.
   * Only creates move opportunities between owned countries.
   */
  FindMoveOpportunities(action: Action): Opportunity[] {
    const opportunities: Opportunity[] = [];
    if (this.player.ownedCountries.length === 0) return opportunities;
    // Find the strongest owned country (source)
    const strongest = this.player.ownedCountries.reduce((max, c) => c.armies > max.armies ? c : max, this.player.ownedCountries[0]);
    // 1. Find the owned country with the juiciest reachable non-owned country (using distance-based score)
    let bestTarget: Country | null = null;
    let bestScore = -Infinity;
    let bestJuicy: Country | null = null;
    for (const owned of this.player.ownedCountries) {
      const reachable = this.getReachableNonOwnedCountries(owned);
      for (const { country: target, distance } of reachable) {
        let distFactor = 1;
        if (distance > 100) {
          distFactor = Math.max(0, 1 - (distance - 100) / 900);
        }
        const score = this.countryScore(target) * distFactor;
        if (score > bestScore) {
          bestScore = score;
          bestTarget = owned;
          bestJuicy = target;
        }
      }
    }
    if (bestTarget && bestTarget !== strongest) {
      const amount = Math.floor(strongest.armies * 0.5 / 1000) * 1000; // Move half armies, rounded
      if (amount > 0 && strongest !== bestTarget) {
        let followUp: Opportunity | null = null;
        if (this.actionPlan.length === 0 && bestJuicy) {
          // Simulate armies after move
          const armiesAfter = bestTarget.armies + amount;
          // Clone bestTarget to preserve prototype
          const simulatedTarget = Object.create(bestTarget);
          simulatedTarget.armies = armiesAfter;
          // Check if attack is feasible after move
          if (this.isAttackFeasible(simulatedTarget, bestJuicy, AI.ATTACK_COMMIT)) {
            const attackAction = new ActionAttack();
            const attackAmount = Math.floor(armiesAfter * AI.ATTACK_COMMIT / 1000) * 1000;
            followUp = new Opportunity([bestTarget, bestJuicy], attackAmount, attackAction, 100);
          }
        }
        opportunities.push(new Opportunity([strongest, bestTarget], amount, action, bestScore, followUp));
      }
    }
    // 2. Find the weakest owned country and check if it needs reinforcement
    const avgArmy = this.player.totalArmies() / this.player.ownedCountries.length;
    const weakest = this.player.ownedCountries.reduce((min, c) => c.armies < min.armies ? c : min, this.player.ownedCountries[0]);
    if (weakest.armies < avgArmy / 2 && weakest !== strongest) {
      const targetArmies = avgArmy / 2;
      const needed = Math.floor((targetArmies - weakest.armies) / 1000) * 1000;
      const amount = Math.max(0, Math.min(needed, strongest.armies - 1000));
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
    const unfortifiedCount = this.player.ownedCountries.filter(c => !c.fortified).length;
    for (const country of this.player.ownedCountries) {
      if (country.canBeFortified()) {
        if (this.player.money >= Game.fortifyCost) {
          let score = country.income / 100;
          score *= unfortifiedCount;
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
    const availableMoney = Math.max(0, money - MoneyReserve);
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
    // 2. Reinforce the country with the juiciest reachable non-owned country (using distance-based score)
    let bestTarget: Country | null = null;
    let bestScore = -Infinity;
    let bestJuicy: Country | null = null;
    for (const owned of this.player.ownedCountries) {
      const reachable = this.getReachableNonOwnedCountries(owned);
      for (const { country: target, distance } of reachable) {
        let distFactor = 1;
        if (distance > 100) {
          distFactor = Math.max(0, 1 - (distance - 100) / 900);
        }
        const score = this.countryScore(target) * distFactor;
        if (score > bestScore) {
          bestScore = score;
          bestTarget = owned;
          bestJuicy = target;
        }
      }
    }
    if (!bestTarget) bestTarget = this.player.homeCountry;
    if (bestTarget) {
      const affordable = Math.floor((availableMoney - MoneyReserve) / armyCost);
      const roundedAffordable = Math.floor(affordable / 1000) * 1000;
      if (roundedAffordable > 0) {
        let followUp: Opportunity | null = null;
        if (this.actionPlan.length === 0 && bestJuicy) {
          // Simulate armies after buy
          const armiesAfter = bestTarget.armies + roundedAffordable;
          const simulatedTarget = Object.create(bestTarget);
          simulatedTarget.armies = armiesAfter;
          if (this.isAttackFeasible(simulatedTarget, bestJuicy, AI.ATTACK_COMMIT)) {
            const attackAction = new ActionAttack();
            const attackAmount = Math.floor(armiesAfter * AI.ATTACK_COMMIT / 1000) * 1000;
            followUp = new Opportunity([bestTarget, bestJuicy], attackAmount, attackAction, 100);
          }
        }
        opportunities.push(new Opportunity([bestTarget], roundedAffordable, action, bestScore * 1000, followUp));
      }
    }

    // 3. Spend all available money (except reserve) to reinforce the most threatened owned country
    if (availableMoney > 0 && this.player.ownedCountries.length > 0) {
      const mostThreatened = this.findMostThreatenedOwnedCountry();
      if (!mostThreatened) {
        throw new Error("findMostThreatenedOwnedCountry() returned null, which should not happen if there are owned countries.");
      }
      const maxAffordable = Math.floor(availableMoney / armyCost);
      const roundedMaxAffordable = Math.floor(maxAffordable / 1000) * 1000;
      if (roundedMaxAffordable > 0) {
        const score = availableMoney / 1000;
        opportunities.push(new Opportunity([mostThreatened], roundedMaxAffordable, action, score));
      }
    }
    return opportunities;
  }

  /**
   * Finds the best opportunity among all possible actions using softmax selection.
   * Higher score opportunities are more likely, but not guaranteed, to be chosen.
   * Throws an error if no opportunities exist.
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

    if (allOpportunities.length === 0) {
      return null
    }

    // Softmax selection
    const temperature = 0.5; // Lower = greedier, higher = more random
    const maxScore = Math.max(...allOpportunities.map(o => o.score));
    // Avoid overflow/underflow by subtracting maxScore
    const expScores = allOpportunities.map(o => Math.exp((o.score - maxScore) / temperature));
    const sumExp = expScores.reduce((a, b) => a + b, 0);
    const probs = expScores.map(e => e / sumExp);
    // Sample one opportunity according to softmax probabilities
    const r = Math.random();
    let acc = 0;
    for (let i = 0; i < allOpportunities.length; ++i) {
      acc += probs[i];
      if (r < acc) return allOpportunities[i];
    }
    // Fallback (should not happen)
    throw new Error("Softmax selection failed to pick an opportunity.");
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

  /**
   * Returns all non-owned countries reachable from the given origin, with their distance, sorted by distance ascending.
   */
  getReachableNonOwnedCountries(origin: Country): { country: Country, distance: number }[] {
    const worldMap = this.game.worldMap;
    const allCountries = worldMap.getCountries();
    const result: { country: Country, distance: number }[] = [];
    for (const country of allCountries) {
      if (country.owner === this.player) continue;
      const dist = worldMap.distance(origin, country);
      if (dist !== null) {
        result.push({ country, distance: dist });
      }
    }
    result.sort((a, b) => a.distance - b.distance);
    return result;
  }

  /**
   * Attempts to build an attack plan for a juicy target. If a plan is found that results in >70% attack chance, it is queued in actionPlan.
   * @param target The enemy country to attack
   */
  MakeAttackPlan(target: Country): void {
    if (this.actionPlan.length > 0) return;
    const ActionAttackClass = ActionAttack;
    const ActionMoveClass = ActionMove;
    const ActionBuyArmiesClass = ActionBuyArmies;
    const owned = this.player.ownedCountries;
    if (owned.length === 0) return;
    // Do not plan attack on own country
    if (target.owner === this.player) return;
    // Find closest owned country to target
    let minDist = Infinity;
    let closest: Country | null = null;
    for (const c of owned) {
      const d = this.game.worldMap.distance(c, target);
      if (d !== null && d < minDist) {
        minDist = d;
        closest = c;
      }
    }
    if (!closest) return;
    // Simulate up to 1 buy and 2 moves to get armies to closest
    const simulatedArmies = new Map<Country, number>();
    for (const c of owned) {
      simulatedArmies.set(c, c.armies);
    }
    let simulatedMoney = this.player.money;
    const plan: Opportunity[] = [];
    // 1. Try to buy armies if possible
    const buyAction = new ActionBuyArmiesClass();
    const armyCost = Game.armyCost;
    const maxBuy = Math.floor(simulatedMoney / armyCost);
    if (maxBuy > 0) {
      const roundedBuy = Math.floor(maxBuy / 1000) * 1000;
      if (roundedBuy > 0) {
        plan.push(new Opportunity([closest], roundedBuy, buyAction, 1));
        simulatedArmies.set(closest, simulatedArmies.get(closest)! + roundedBuy);
        simulatedMoney -= roundedBuy * armyCost;
      }
    }
    // 2. Try to move armies from up to 2 other owned countries (not closest)
    const moveAction = new ActionMoveClass();
    let moves = 0;
    let tempArmies = simulatedArmies.get(closest)!;
    const donorCandidates = owned.filter(c => c !== closest).sort((a, b) => b.armies - a.armies);
    for (const donor of donorCandidates) {
      if (moves >= 2) break;
      const moveDist = this.game.worldMap.distance(donor, closest);
      const donorArmies = simulatedArmies.get(donor)!;
      if (moveDist !== null && donorArmies > 1000) {
        const moveAmount = Math.floor((donorArmies - 1000) / 1000) * 1000;
        if (moveAmount > 0) {
          plan.push(new Opportunity([donor, closest], moveAmount, moveAction, 1));
          simulatedArmies.set(donor, donorArmies - moveAmount);
          tempArmies += moveAmount;
          simulatedArmies.set(closest, tempArmies);
          moves++;
        }
      }
    }
    // 3. Simulate attack chance
    const defenseForce = this.countryDefenseEstimate(target);
    const dist = this.game.worldMap.distance(closest, target) || 1;
    const attackForce = Math.floor(tempArmies * AI.ATTACK_COMMIT / 1000) * 1000;
    const chance = ActionAttackClass.AttackChance(
      attackForce,
      defenseForce,
      dist,
      target.fortified,
      this.game
    );
    if (chance > 0.7 && attackForce >= 1000) {
      // Add attack opportunity
      const attackAction = new ActionAttackClass();
      plan.push(new Opportunity([closest, target], attackForce, attackAction, chance * 100));
      // After attack, set simulated armies in closest to 1000 (minimum survivors)
      simulatedArmies.set(closest, 1000);
      // Do not plan any further moves from closest after attack
      // (No further actions are planned after attack in this plan)
      // Queue the plan
      this.actionPlan.push(...plan);
    }
  }

  /**
   * Plans a surprise attack: first tries the weakest unoccupied country, then the weakest opponent country.
   */
  PlanSurpriseAttack(): void {
    if (this.actionPlan.length > 0) return;
    const allCountries = this.game.worldMap.getCountries();
    // 1. Find unoccupied country with minimal defense estimate
    let minUnoccDef = Infinity;
    let bestUnocc: Country | null = null;
    for (const c of allCountries) {
      if (!c.owner) {
        const def = this.countryDefenseEstimate(c);
        if (def < minUnoccDef) {
          minUnoccDef = def;
          bestUnocc = c;
        }
      }
    }
    if (bestUnocc) {
      this.MakeAttackPlan(bestUnocc);
      return;
    }
    // 2. Find opponent-owned country with minimal defense estimate
    let minOppDef = Infinity;
    let bestOpp: Country | null = null;
    for (const c of allCountries) {
      if (c.owner && c.owner !== this.player) {
        const def = this.countryDefenseEstimate(c);
        if (def < minOppDef) {
          minOppDef = def;
          bestOpp = c;
        }
      }
    }
    if (bestOpp) {
      this.MakeAttackPlan(bestOpp);
    }
  }

  /**
   * Determines if an attack from an origin country to a target country is feasible for this player.
   * attackCommitPart: fraction of armies to commit (default 1)
   */
  isAttackFeasible(from: Country, to: Country, attackCommitPart: number = 0.8): boolean {
    if (!from || !to) return false;
    if (from.owner !== this.player) return false;
    if (to.owner === this.player) return false;
    if (from === to) return false;
    const isNeighbor = from.neighbors.includes(to);
    const isNaval = from.oceanBorder.length > 0 && to.oceanBorder.length > 0;
    if (!isNeighbor && !isNaval) return false;
    if (typeof from.armies !== 'number' || from.armies <= 1000) return false;
    const estimatedDefense = this.countryDefenseEstimate(to);
    const dist = this.game.worldMap.distance(from, to);
    if (dist === null) return false;
    const committedArmies = Math.floor(from.armies * attackCommitPart);
    const chance = ActionAttack.AttackChance(committedArmies, estimatedDefense, dist, to.fortified, this.game);
    if (chance < 0.7) return false;
    return true;
  }

  /**
   * Finds the most threatened owned country.
   * For each owned country, sums 1/distance to every country owned by another player (ignoring unreachable countries).
   * Returns the owned country with the highest score.
   */
  findMostThreatenedOwnedCountry(): Country | null {
    if (!this.player.ownedCountries || this.player.ownedCountries.length === 0) {
      throw new Error("AI has no owned countries to evaluate for threat.");
    }
    const worldMap = this.game.worldMap;
    const allCountries = worldMap.getCountries();
    let bestCountry: Country | null = null;
    let bestScore = -Infinity;
    for (const owned of this.player.ownedCountries) {
      let score = 0;
      for (const other of allCountries) {
        if (!other.owner || other.owner === this.player) continue;
        const dist = worldMap.distance(owned, other);
        if (dist === null || dist === 0) continue;
        score += 1 / dist;
      }
      if (score > bestScore) {
        bestScore = score;
        bestCountry = owned;
      }
    }
    if (!bestCountry) {
      throw new Error("No threatened country found. This should not happen if there are enemy countries.");
    }
    return bestCountry;
  }
}
