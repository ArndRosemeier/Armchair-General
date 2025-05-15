import { Game } from './Game';
import { Player } from './Player';
import { Country } from './Country';
import { WorldMap, regenerateMapFromCountries } from './WorldMap';
import { AI } from './AI';

// You must provide this function somewhere in your codebase
// function regenerateMapFromCountries(countries: Country[]): WorldMap;

export class Serializer {
  static serialize(game: Game): string {
    // Serialize all countries and players
    const countries = game.worldMap.getCountries();
    const players = game.players;
    return JSON.stringify({
      countries: countries.map(c => c.toJSON()),
      players: players.map(p => p.toJSON()),
      game: game.toJSON()
    });
  }

  static deserialize(json: string): Game {
    const data = JSON.parse(json);
    // 1. Create all countries (no references yet)
    const countryRegistry: Record<string, Country> = {};
    const countries = data.countries.map((c: any) => Country.fromJSON(c, {}, countryRegistry));
    // 2. Create all players (no references yet)
    const playerRegistry: Record<string, Player> = {};
    const players = data.players.map((p: any) => {
      const player = Player.fromJSON(p, countryRegistry);
      playerRegistry[player.name] = player;
      return player;
    });
    // 3. Resolve country references
    countries.forEach((c: Country) => c.resolveReferences(playerRegistry, countryRegistry));
    // 4. Resolve player references
    players.forEach((p: Player) => p.resolveReferences(countryRegistry));
    // --- Ensure AI is set up for AI players ---
    for (const player of players) {
      if (player.isAI) {
        if (!player.AI) {
          // Pass a dummy object for now; correct game will be set after Game is created
          player.AI = new AI(player, {} as any);
        }
      }
    }
    // 5. Regenerate world map
    const worldMap = regenerateMapFromCountries(countries);
    // 6. Create game
    const game = Game.fromJSON(data.game, players, worldMap);
    // --- Set AI.game and AI.player references ---
    for (const player of players) {
      if (player.isAI && player.AI) {
        player.AI.game = game;
        player.AI.player = player;
      }
    }
    return game;
  }
} 