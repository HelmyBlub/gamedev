import { Game } from "../gameModel.js";
import { GameMap, MapChunk } from "./map.js";
import { GameMapAreaSpawnOnDistance, MAP_AREA_SPAWN_ON_DISTANCE_TYPES_FUNCTIONS } from "./mapAreaSpawnOnDistance.js";
import { mapObjectCreateCleanseFountain } from "./mapObjectCleanseFountain.js";

export const MAP_AREA_SPAWN_ON_DISTANCE_CURSE_CLEANSE = "Curse Cleanse Area";

export function addMapAreaSpawnOnDistanceCurseCleanse() {
    MAP_AREA_SPAWN_ON_DISTANCE_TYPES_FUNCTIONS[MAP_AREA_SPAWN_ON_DISTANCE_CURSE_CLEANSE] = {
        startFight: startCurseFight,
        modifyChunkGeneration: modifyChunkGeneration,
    }
}

function modifyChunkGeneration(areaSpanOnDistance: GameMapAreaSpawnOnDistance, chunk: MapChunk, chunkX: number, chunkY: number, map: GameMap) {
    if (!areaSpanOnDistance.spawnTopLeftChunk) return;
    const signChunkX = areaSpanOnDistance.spawnTopLeftChunk.x + Math.floor(areaSpanOnDistance.size / 2);
    const signChunkY = areaSpanOnDistance.spawnTopLeftChunk.y + Math.floor(areaSpanOnDistance.size / 2);
    if (chunkX !== signChunkX || chunkY !== signChunkY) return;
    const cleanseFountain = mapObjectCreateCleanseFountain(3, 3, areaSpanOnDistance.id);
    chunk.objects.push(cleanseFountain);
}

function startCurseFight(godArea: GameMapAreaSpawnOnDistance, game: Game) {
    console.log("start curse fight");
}
