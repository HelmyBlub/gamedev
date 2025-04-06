import { calculateDistance, getNextId } from "../game.js";
import { Game, IdCounter, Position } from "../gameModel.js";
import { changeTileIdOfMapChunk, chunkXYToMapKey, deletePaintCacheForMapChunk, GameMap, getMapMidlePosition, MapChunk, TILE_ID_GRASS, TILE_ID_PATH1_HORIZONTAL, TILE_ID_PATH2_VERTICAL, TILE_ID_ROCK, TILE_ID_TREE } from "./map.js";
import { addMapAreaSpawnOnDistanceCurseCleanse } from "./mapCurseCleanseArea.js";
import { createNewChunk } from "./mapGeneration.js";
import { addMapAreaSpawnOnDistanceGod } from "./mapGodArea.js";

export type MapAreaSpawnOnDistanceFunctions = {
    checkFightStart?: (areaSpanOnDistance: GameMapAreaSpawnOnDistance, game: Game) => boolean,
    getPlayerRetrySpawn?: (areaSpanOnDistance: GameMapAreaSpawnOnDistance, game: Game) => Position,
    modifyChunkGeneration?: (areaSpanOnDistance: GameMapAreaSpawnOnDistance, chunk: MapChunk, chunkX: number, chunkY: number, map: GameMap) => void,
    startFight: (areaSpanOnDistance: GameMapAreaSpawnOnDistance, game: Game) => void,
}

export type MapAreaSpawnOnDistanceTypesFunctions = {
    [key: string]: MapAreaSpawnOnDistanceFunctions,
}
export const MAP_AREA_SPAWN_ON_DISTANCE_TYPES_FUNCTIONS: MapAreaSpawnOnDistanceTypesFunctions = {};

export type GameMapAreaSpawnOnDistance = {
    type: string,
    id: number,
    size: number,
    autoSpawnOnDistance: number,
    pathChunkGenerationLength: number,
    spawnTopLeftChunk?: Position,
}

export function addMapAreaSpawnOnDistanceFunctions() {
    addMapAreaSpawnOnDistanceGod();
    addMapAreaSpawnOnDistanceCurseCleanse();
}

export function createAreaSpawnOnDistance(type: string, map: GameMap, distance: number, idCounter: IdCounter) {
    map.areaSpawnOnDistance.push({
        id: getNextId(idCounter),
        type: type,
        size: 5,
        autoSpawnOnDistance: distance,
        pathChunkGenerationLength: 3,
    });
}

export function areaSpawnOnDistanceCheckFightStart(game: Game) {
    if (game.state.bossStuff.areaSpawnFightStartedTime != undefined) return;
    for (let area of game.state.map.areaSpawnOnDistance) {
        const areaFunctions = MAP_AREA_SPAWN_ON_DISTANCE_TYPES_FUNCTIONS[area.type];
        if (areaFunctions.checkFightStart && area.spawnTopLeftChunk && areaFunctions.checkFightStart(area, game)) {
            areaSpawnOnDistanceFightStart(area, game);
        }
    }
}

export function areaSpawnOnDistanceFightStart(area: GameMapAreaSpawnOnDistance, game: Game) {
    areaSpawnOnDistanceCloseOfArea(area, game.state.map, game);
    game.state.bossStuff.areaSpawnFightStartedTime = game.state.time;
    game.state.bossStuff.areaSpawnIdFightStart = area.id;
    if (game.UI.playerGlobalAlphaMultiplier > 0.25) {
        game.UI.playerGlobalAlphaMultiplier = 0.25;
    }
    const areaFunctions = MAP_AREA_SPAWN_ON_DISTANCE_TYPES_FUNCTIONS[area.type];
    areaFunctions.startFight(area, game);
}

export function areaSpawnOnDistanceRetry(game: Game) {
    const areaId = game.state.bossStuff.areaSpawnIdFightStart;
    const area = game.state.map.areaSpawnOnDistance.find(a => a.id === areaId);
    if (area === undefined) throw "should not happen";
    game.state.bossStuff.areaSpawnFightStartedTime = game.state.time;
    const areaFunctions = MAP_AREA_SPAWN_ON_DISTANCE_TYPES_FUNCTIONS[area.type];
    areaFunctions.startFight(area, game);
}

export function areaSpawnOnDistanceGetRetrySpawn(game: Game): Position {
    const areaId = game.state.bossStuff.areaSpawnIdFightStart;
    const area = game.state.map.areaSpawnOnDistance.find(a => a.id === areaId);
    if (area === undefined) throw "should not happen";
    const areaFunctions = MAP_AREA_SPAWN_ON_DISTANCE_TYPES_FUNCTIONS[area.type];
    if (areaFunctions.getPlayerRetrySpawn) {
        return areaFunctions.getPlayerRetrySpawn(area, game);
    } else {
        const bossEnemy = game.state.bossStuff.bosses[0];
        return {
            x: bossEnemy.x - ((area.size * game.state.map.chunkLength * game.state.map.tileSize) / 2 - game.state.map.tileSize * 2),
            y: bossEnemy.y,
        }
    }
}

export function areaSpawnOnDistanceCreateAndSetOnMap(chunkX: number, chunkY: number, map: GameMap, game: Game): boolean {
    for (let area of game.state.map.areaSpawnOnDistance) {
        if (!checkCreateArea(area, chunkX, chunkY, map)) continue;

        area.spawnTopLeftChunk = calculateSpawnTopLeft(chunkX, chunkY, area);
        createAndSetChunks(area, map);
        createPathesAndEntryToArea(area, map, game);
        return true;
    }
    return false;
}

export function areaSpawnOnDistanceCloseOfArea(areaSpanOnDistance: GameMapAreaSpawnOnDistance, map: GameMap, game: Game) {
    const entranceData = getAllEntranceLocationsData(areaSpanOnDistance, map);
    changeTileIdOfMapChunk(entranceData.topMiddleChunk.x, entranceData.topMiddleChunk.y, entranceData.middleTileIndex, 0, TILE_ID_ROCK, game);
    changeTileIdOfMapChunk(entranceData.bottomMiddleChunk.x, entranceData.bottomMiddleChunk.y, entranceData.middleTileIndex, map.chunkLength - 1, TILE_ID_ROCK, game);
    changeTileIdOfMapChunk(entranceData.leftMiddleChunk.x, entranceData.leftMiddleChunk.y, 0, entranceData.middleTileIndex, TILE_ID_ROCK, game);
    changeTileIdOfMapChunk(entranceData.rightMiddleChunk.x, entranceData.rightMiddleChunk.y, map.chunkLength - 1, entranceData.middleTileIndex, TILE_ID_ROCK, game);
}

export function areaSpawnOnDistanceGetAreaMiddlePosition(areaSpanOnDistance: GameMapAreaSpawnOnDistance, map: GameMap): Position | undefined {
    if (!areaSpanOnDistance.spawnTopLeftChunk) return undefined;
    return {
        x: (areaSpanOnDistance.spawnTopLeftChunk.x + areaSpanOnDistance.size / 2) * map.chunkLength * map.tileSize,
        y: (areaSpanOnDistance.spawnTopLeftChunk.y + areaSpanOnDistance.size / 2) * map.chunkLength * map.tileSize,
    }
}

function getAllEntranceLocationsData(areaSpanOnDistance: GameMapAreaSpawnOnDistance, map: GameMap) {
    return {
        topMiddleChunk: {
            x: areaSpanOnDistance.spawnTopLeftChunk!.x + Math.floor(areaSpanOnDistance.size / 2),
            y: areaSpanOnDistance.spawnTopLeftChunk!.y,
        },
        bottomMiddleChunk: {
            x: areaSpanOnDistance.spawnTopLeftChunk!.x + Math.floor(areaSpanOnDistance.size / 2),
            y: areaSpanOnDistance.spawnTopLeftChunk!.y + areaSpanOnDistance.size - 1,
        },
        leftMiddleChunk: {
            x: areaSpanOnDistance.spawnTopLeftChunk!.x,
            y: areaSpanOnDistance.spawnTopLeftChunk!.y + Math.floor(areaSpanOnDistance.size / 2),
        },
        rightMiddleChunk: {
            x: areaSpanOnDistance.spawnTopLeftChunk!.x + areaSpanOnDistance.size - 1,
            y: areaSpanOnDistance.spawnTopLeftChunk!.y + Math.floor(areaSpanOnDistance.size / 2),
        },
        middleTileIndex: Math.floor(map.chunkLength / 2),
    };
}

function createPathesAndEntryToArea(areaSpanOnDistance: GameMapAreaSpawnOnDistance, map: GameMap, game: Game) {
    const entranceData = getAllEntranceLocationsData(areaSpanOnDistance, map);
    const middleTileIndex = entranceData.middleTileIndex;
    //north
    const topMiddleChunk = entranceData.topMiddleChunk;
    map.chunks[chunkXYToMapKey(topMiddleChunk.x, topMiddleChunk.y)].tiles[middleTileIndex][0] = TILE_ID_PATH2_VERTICAL;
    for (let chunkYOffset = 1; chunkYOffset <= areaSpanOnDistance.pathChunkGenerationLength; chunkYOffset++) {
        let currentChunk = map.chunks[chunkXYToMapKey(topMiddleChunk.x, topMiddleChunk.y - chunkYOffset)];
        if (!currentChunk) {
            currentChunk = createNewChunk(map, topMiddleChunk.x, topMiddleChunk.y - chunkYOffset, game.state.idCounter, game);
        }
        for (let tileY = 0; tileY < map.chunkLength; tileY++) {
            currentChunk.tiles[middleTileIndex][tileY] = TILE_ID_PATH2_VERTICAL;
        }
        deletePaintCacheForMapChunk(topMiddleChunk.x, topMiddleChunk.y - chunkYOffset, game);
    }
    //south
    const bottomMiddleChunk = entranceData.bottomMiddleChunk;
    map.chunks[chunkXYToMapKey(bottomMiddleChunk.x, bottomMiddleChunk.y)].tiles[middleTileIndex][map.chunkLength - 1] = TILE_ID_PATH2_VERTICAL;
    for (let chunkYOffset = 1; chunkYOffset <= areaSpanOnDistance.pathChunkGenerationLength; chunkYOffset++) {
        let currentChunk = map.chunks[chunkXYToMapKey(bottomMiddleChunk.x, bottomMiddleChunk.y + chunkYOffset)];
        if (!currentChunk) {
            currentChunk = createNewChunk(map, bottomMiddleChunk.x, bottomMiddleChunk.y + chunkYOffset, game.state.idCounter, game);
        }
        for (let tileY = 0; tileY < map.chunkLength; tileY++) {
            currentChunk.tiles[middleTileIndex][tileY] = TILE_ID_PATH2_VERTICAL;
        }
        deletePaintCacheForMapChunk(bottomMiddleChunk.x, bottomMiddleChunk.y + chunkYOffset, game);
    }
    //west
    const leftMiddleChunk = entranceData.leftMiddleChunk;
    map.chunks[chunkXYToMapKey(leftMiddleChunk.x, leftMiddleChunk.y)].tiles[0][middleTileIndex] = TILE_ID_PATH1_HORIZONTAL;
    for (let chunkXOffset = 1; chunkXOffset <= areaSpanOnDistance.pathChunkGenerationLength; chunkXOffset++) {
        let currentChunk = map.chunks[chunkXYToMapKey(leftMiddleChunk.x - chunkXOffset, leftMiddleChunk.y)];
        if (!currentChunk) {
            currentChunk = createNewChunk(map, leftMiddleChunk.x - chunkXOffset, leftMiddleChunk.y, game.state.idCounter, game);
        }
        for (let tileX = 0; tileX < map.chunkLength; tileX++) {
            currentChunk.tiles[tileX][middleTileIndex] = TILE_ID_PATH1_HORIZONTAL;
        }
        deletePaintCacheForMapChunk(leftMiddleChunk.x - chunkXOffset, leftMiddleChunk.y, game);
    }
    //east
    const rightMiddleChunk = entranceData.rightMiddleChunk;
    map.chunks[chunkXYToMapKey(rightMiddleChunk.x, rightMiddleChunk.y)].tiles[map.chunkLength - 1][middleTileIndex] = TILE_ID_PATH1_HORIZONTAL;
    for (let chunkXOffset = 1; chunkXOffset <= areaSpanOnDistance.pathChunkGenerationLength; chunkXOffset++) {
        let currentChunk = map.chunks[chunkXYToMapKey(rightMiddleChunk.x + chunkXOffset, rightMiddleChunk.y)];
        if (!currentChunk) {
            currentChunk = createNewChunk(map, rightMiddleChunk.x + chunkXOffset, rightMiddleChunk.y, game.state.idCounter, game);
        }
        for (let tileX = 0; tileX < map.chunkLength; tileX++) {
            currentChunk.tiles[tileX][middleTileIndex] = TILE_ID_PATH1_HORIZONTAL;
        }
        deletePaintCacheForMapChunk(rightMiddleChunk.x + chunkXOffset, rightMiddleChunk.y, game);
    }
    //after tile changes, pathing caches are not longer correct
    game.performance.pathingCache = {};
}

function createAndSetChunks(area: GameMapAreaSpawnOnDistance, map: GameMap) {
    if (!area.spawnTopLeftChunk) return;
    const areafunctions = MAP_AREA_SPAWN_ON_DISTANCE_TYPES_FUNCTIONS[area.type];
    for (let areaChunkX = 0; areaChunkX < area.size; areaChunkX++) {
        for (let areaChunkY = 0; areaChunkY < area.size; areaChunkY++) {
            const tiles: number[][] = [];
            const mapChunk: MapChunk = { tiles: tiles, characters: [], objects: [], isGodAreaChunk: true };
            for (let tileX = 0; tileX < map.chunkLength; tileX++) {
                tiles[tileX] = [];
                for (let tileY = 0; tileY < map.chunkLength; tileY++) {
                    const isAreaBorder = areaChunkX === 0 && tileX === 0
                        || areaChunkX === area.size - 1 && tileX === map.chunkLength - 1
                        || areaChunkY === 0 && tileY === 0
                        || areaChunkY === area.size - 1 && tileY === map.chunkLength - 1;
                    if (isAreaBorder) {
                        tiles[tileX][tileY] = TILE_ID_TREE;
                    } else {
                        tiles[tileX][tileY] = TILE_ID_GRASS;
                    }
                }
            }
            const chunkX = areaChunkX + area.spawnTopLeftChunk.x;
            const chunkY = areaChunkY + area.spawnTopLeftChunk.y;
            if (areafunctions.modifyChunkGeneration) areafunctions.modifyChunkGeneration(area, mapChunk, chunkX, chunkY, map);
            map.chunks[chunkXYToMapKey(chunkX, chunkY)] = mapChunk;
        }
    }
}

function calculateSpawnTopLeft(chunkX: number, chunkY: number, godArea: GameMapAreaSpawnOnDistance) {
    let leftGodAreaChunkX = 0;
    let topGodAreaChunkY = 0;
    if (Math.abs(chunkX) > Math.abs(chunkY)) {
        if (chunkX > 0) {
            leftGodAreaChunkX = chunkX;
            topGodAreaChunkY = chunkY - Math.floor(godArea.size / 2);
        } else {
            leftGodAreaChunkX = chunkX - godArea.size + 1;
            topGodAreaChunkY = chunkY - Math.floor(godArea.size / 2);
        }
    } else {
        if (chunkY > 0) {
            leftGodAreaChunkX = chunkX - Math.floor(godArea.size / 2);
            topGodAreaChunkY = chunkY;
        } else {
            leftGodAreaChunkX = chunkX - Math.floor(godArea.size / 2);
            topGodAreaChunkY = chunkY - godArea.size + 1;
        }
    }
    return { x: leftGodAreaChunkX, y: topGodAreaChunkY };
}

function checkCreateArea(area: GameMapAreaSpawnOnDistance, chunkX: number, chunkY: number, map: GameMap): boolean {
    if (area.spawnTopLeftChunk) return false;
    const chunkLength = map.chunkLength * map.tileSize;
    const distance = calculateDistance({ x: chunkX * chunkLength, y: chunkY * chunkLength }, getMapMidlePosition(map));
    if (distance >= area.autoSpawnOnDistance && distance <= area.autoSpawnOnDistance * 1.1) return true;
    return false;
}
