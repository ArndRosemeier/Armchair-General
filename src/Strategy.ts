// src/Strategy.ts

import { Game } from './Game';
import { Player } from './Player';

/**
 * Abstract base class for AI strategies.
 */
export abstract class Strategy {
  /**
   * Called each turn to let the AI make its move.
   * @param game The current game state.
   * @param player The player for whom this strategy acts.
   */
  abstract takeTurn(game: Game, player: Player): void;
}

