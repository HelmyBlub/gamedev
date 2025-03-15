import { getPlayerCharacters } from "../character/character.js";
import { spawnGodEnemy } from "../character/enemy/god/godEnemy.js";
import { Game } from "../gameModel.js";
import { positionToMapKey } from "./map.js";
import { areaSpawnOnDistanceCloseOfArea, GameMapAreaSpawnOnDistance, MAP_AREA_SPAWN_ON_DISTANCE_TYPES_FUNCTIONS } from "./mapAreaSpawnOnDistance.js";

export const MAP_AREA_SPAWN_ON_DISTANCE_GOD = "God Area";

export function addMapAreaSpawnOnDistanceGod() {
    MAP_AREA_SPAWN_ON_DISTANCE_TYPES_FUNCTIONS[MAP_AREA_SPAWN_ON_DISTANCE_GOD] = {
        checkFightStart: checkGodFightStart,
        startFight: startGodFight,
    }
}

function checkGodFightStart(godArea: GameMapAreaSpawnOnDistance, game: Game): boolean {
    if (game.state.bossStuff.kingFightStartedTime !== undefined || game.state.bossStuff.areaSpawnFightStartedTime !== undefined) return false;
    const allPlayers = getPlayerCharacters(game.state.players);
    if (allPlayers === undefined || allPlayers.length === 0) return false;
    for (let player of allPlayers) {
        const mapKey = positionToMapKey(player, game.state.map);
        const chunk = game.state.map.chunks[mapKey];
        if (chunk) {
            if (!chunk.isGodAreaChunk) return false;
            const chunkSize = game.state.map.chunkLength * game.state.map.tileSize;
            const tileSize = game.state.map.tileSize;
            const playerChunkX = (Math.abs(player.x) % chunkSize);
            const playerChunkY = (Math.abs(player.y) % chunkSize);
            if (playerChunkX <= tileSize || playerChunkX >= chunkSize - tileSize
                || playerChunkY <= tileSize || playerChunkY >= chunkSize - tileSize) {
                return false;
            }
        }
    }
    console.log("TODO: code needs to check if in this specific godArea");
    return true;
}

function startGodFight(godArea: GameMapAreaSpawnOnDistance, game: Game) {
    spawnGodEnemy(godArea, game);
}
