import { Player } from './Player';
import { Game } from './Game';
import { Country } from './Country';
import { Opportunity } from './Opportunity';
import { Action } from './Action';

/**
 * AI class for handling computer-controlled player logic.
 * Extend this class or implement methods for various AI strategies.
 */
export class AI {
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
  FindSpyOpportunities(action: Action): Opportunity[] {
    const worldMap = this.game.worldMap;
    const allCountries = worldMap.getCountries();
    const opportunities: Opportunity[] = [];
    if (!this.player.ownedCountries.length) return opportunities;
    // Pick a reference country (with most armies)
    const fromCountry = this.GetBestArmies(1)[0] || this.player.ownedCountries[0];
    // Shuffle countries and take first 10
    const shuffled = allCountries.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const candidates = shuffled.slice(0, 10);
    for (const country of candidates) {
      // Discard if no owner and already in knowledge
      const known = this.player.knowledge.find(k => k.country === country);
      if (!country.owner && known) continue;
      // Discard if owned by player
      if (country.owner === this.player) continue;
      // Discard if owned by someone else and is in knowledge with recency < 4
      if (country.owner && country.owner !== this.player && known && (this.game.gameTurn - known.gameTurn) < 4) continue;
      // Compute distance from fromCountry
      const distance = worldMap.distance(fromCountry, country);
      if (distance === null) continue;
      // Score: 500 - distance
      const score = 500 - distance;
      opportunities.push(new Opportunity([country], 0, action, score));
    }
    return opportunities;
  }

  /**
   * Main method for AI to take its turn. Override or implement logic here.
   */
  takeTurn(): void {
    // TODO: Implement AI turn logic
    // Example: choose action, select countries, execute moves
  }
}
