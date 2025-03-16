import { getPlayerCharacters } from "../character/character.js";
import { spawnGodEnemy } from "../character/enemy/god/godEnemy.js";
import { Game, Position } from "../gameModel.js";
import { GameMapAreaSpawnOnDistance, MAP_AREA_SPAWN_ON_DISTANCE_TYPES_FUNCTIONS } from "./mapAreaSpawnOnDistance.js";

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
    const map = game.state.map;
    const chunkSize = map.chunkLength * map.tileSize;
    const topLeft: Position = {
        x: godArea.spawnTopLeftChunk!.x * chunkSize + map.tileSize,
        y: godArea.spawnTopLeftChunk!.y * chunkSize + map.tileSize,
    };
    const size = godArea.size * map.chunkLength * map.tileSize - map.tileSize * 2;
    for (let player of allPlayers) {
        if (player.x <= topLeft.x || player.x >= topLeft.x + size
            || player.y <= topLeft.y || player.y >= topLeft.y + size) {
            return false;
        }
    }
    return true;
}

function startGodFight(godArea: GameMapAreaSpawnOnDistance, game: Game) {
    spawnGodEnemy(godArea, game);
}
