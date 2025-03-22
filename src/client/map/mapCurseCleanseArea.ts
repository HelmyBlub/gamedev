import { getPlayerCharacters } from "../character/character.js";
import { createBossWithLevel } from "../character/enemy/bossEnemy.js";
import { CHARACTER_TYPE_CURSE_FOUNTAIN_BOSS, CurseFountainBossEnemy } from "../character/enemy/curseFountainBoss.js";
import { createCurse, Curse } from "../curse/curse.js";
import { Game } from "../gameModel.js";
import { GameMap, MapChunk } from "./map.js";
import { areaSpawnOnDistanceGetAreaMiddlePosition, GameMapAreaSpawnOnDistance, MAP_AREA_SPAWN_ON_DISTANCE_TYPES_FUNCTIONS } from "./mapAreaSpawnOnDistance.js";
import { mapObjectCreateCleanseFountain } from "./mapObjectCleanseFountain.js";

export const MAP_AREA_SPAWN_ON_DISTANCE_CURSE_CLEANSE = "Curse Cleanse Area";

export type GameMapAreaSpawnOnDistanceCleanseFountain = GameMapAreaSpawnOnDistance & {
    bossCounter?: number,
}

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

function startCurseFight(spawnArea: GameMapAreaSpawnOnDistance, game: Game) {
    console.log("start curse fight");
    const fountainArea = spawnArea as GameMapAreaSpawnOnDistanceCleanseFountain;
    var bossCounter = 0;
    for (let player of getPlayerCharacters(game.state.players)) {
        if (player.curses === undefined) continue;
        for (let curse of player.curses) {
            const boss = createBossWithLevel(game.state.idCounter, 10, game) as CurseFountainBossEnemy;
            boss.type = CHARACTER_TYPE_CURSE_FOUNTAIN_BOSS;
            boss.spawnAreaIdRef = spawnArea.id;
            const middle = areaSpawnOnDistanceGetAreaMiddlePosition(spawnArea, game.state.map);
            boss.x = middle!.x - 200 + bossCounter * 50;
            boss.y = middle!.y - 200;
            const curseCopy = createCurse(curse.type, game.state.idCounter);
            curseCopy.level = curse.level;
            boss.curses = [curseCopy];
            game.state.bossStuff.bosses.push(boss);
            bossCounter++;
        }
    }
    fountainArea.bossCounter = bossCounter;
}
