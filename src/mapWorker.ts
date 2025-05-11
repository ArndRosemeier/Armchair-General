// src/mapWorker.ts
import { WorldMap } from './WorldMap';

// Types for worker messages
interface MapGenRequest {
  type: 'generate';
  width: number;
  height: number;
  countryCount: number;
}

// For Vite, use self as DedicatedWorkerGlobalScope
const ctx: DedicatedWorkerGlobalScope = self as any;

ctx.onmessage = async (event: MessageEvent) => {
  const data = event.data as MapGenRequest;
  if (data.type === 'generate') {
    // Generate the map (runs in worker thread)
    const worldMap = WorldMap.createMap(data.width, data.height, data.countryCount);
    // Serialize the map (WorldMap is not structured cloneable)
    const serialized = {
      map: worldMap.getMap(),
      countries: worldMap.getCountries(),
    };
    ctx.postMessage({ type: 'done', result: serialized });
  }
};
