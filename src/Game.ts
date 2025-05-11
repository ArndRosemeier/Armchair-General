import { WorldMap } from './WorldMap';
import { Player } from './Player';

/**
 * Core game logic class for RiskTs.
 * Manages players, world map, turns, and active player.
 */
export class Game {
  worldMap: WorldMap;
  players: Player[];
  gameTurn: number;
  activePlayerIndex: number;

  constructor(worldMap: WorldMap, players: Player[] = []) {
    this.worldMap = worldMap;
    this.players = players;
    this.gameTurn = 1;
    this.activePlayerIndex = 0;
  }

  /**
   * Returns the currently active player.
   */
  get activePlayer(): Player {
    return this.players[this.activePlayerIndex];
  }

  /**
   * Advances the game to the next player's turn, incrementing gameTurn if needed.
   */
  nextTurn() {
    this.activePlayerIndex = (this.activePlayerIndex + 1) % this.players.length;
    if (this.activePlayerIndex === 0) {
      this.gameTurn++;
    }
  }
}
