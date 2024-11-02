import { getPlayerCharacters } from "../character/character.js";
import { spawnGodEnemy } from "../character/enemy/god/godEnemy.js";
import { calculateDistance } from "../game.js";
import { Game, Position } from "../gameModel.js";
import { GameMap, MapChunk, TILE_ID_GRASS, TILE_ID_PATH1_HORIZONTAL, TILE_ID_PATH2_VERTICAL, TILE_ID_ROCK, TILE_ID_TREE, changeTileIdOfMapChunk, chunkXYToMapKey, deletePaintCacheForMapChunk, getMapMidlePosition, positionToMapKey } from "./map.js";
import { createNewChunk } from "./mapGeneration.js";

export type GameMapGodArea = {
    size: number,
    autoSpawnOnDistance: number,
    pathChunkGenerationLength: number,
    spawnTopLeftChunk?: Position,
}

export function createAndSetGodAreaOnMap(chunkX: number, chunkY: number, map: GameMap, game: Game): boolean {
    if (!map.godArea) return false;
    if (!checkCreateGodArea(chunkX, chunkY, map)) return false;

    map.godArea.spawnTopLeftChunk = calculateSpawnTopLeft(chunkX, chunkY, map.godArea);
    createAndSetChunks(map);
    createPathesAndEntryToGodArea(map.godArea, map, game);

    return true;
}

export function checkGodFightStart(game: Game) {
    if (!game.state.map.godArea || game.state.bossStuff.kingFightStartedTime !== undefined || game.state.bossStuff.godFightStartedTime !== undefined) return;
    const allPlayers = getPlayerCharacters(game.state.players);
    if (allPlayers === undefined || allPlayers.length === 0) return;
    for (let player of allPlayers) {
        const mapKey = positionToMapKey(player, game.state.map);
        const chunk = game.state.map.chunks[mapKey];
        if (chunk) {
            if (!chunk.isGodAreaChunk) return;
            const chunkSize = game.state.map.chunkLength * game.state.map.tileSize;
            const tileSize = game.state.map.tileSize;
            const playerChunkX = (Math.abs(player.x) % chunkSize);
            const playerChunkY = (Math.abs(player.y) % chunkSize);
            if (playerChunkX <= tileSize || playerChunkX >= chunkSize - tileSize
                || playerChunkY <= tileSize || playerChunkY >= chunkSize - tileSize) {
                return;
            }
        }
    }
    startGodFight(game.state.map.godArea, game.state.map, game);
}

export function startGodFight(godArea: GameMapGodArea, map: GameMap, game: Game) {
    game.state.bossStuff.godFightStartedTime = game.state.time;
    closeOfGodArea(godArea, map, game);
    spawnGodEnemy(godArea, game);
    if (game.UI.playerGlobalAlphaMultiplier > 0.25) {
        game.UI.playerGlobalAlphaMultiplier = 0.25;
    }
}

export function getGodAreaMiddlePosition(godArea: GameMapGodArea, map: GameMap): Position | undefined {
    if (!godArea.spawnTopLeftChunk) return undefined;
    return {
        x: (godArea.spawnTopLeftChunk.x + godArea.size / 2) * map.chunkLength * map.tileSize,
        y: (godArea.spawnTopLeftChunk.y + godArea.size / 2) * map.chunkLength * map.tileSize,
    }
}

function closeOfGodArea(godArea: GameMapGodArea, map: GameMap, game: Game) {
    const entranceData = getAllEntranceLocationsData(godArea, map);
    changeTileIdOfMapChunk(entranceData.topMiddleChunk.x, entranceData.topMiddleChunk.y, entranceData.middleTileIndex, 0, TILE_ID_ROCK, game);
    changeTileIdOfMapChunk(entranceData.bottomMiddleChunk.x, entranceData.bottomMiddleChunk.y, entranceData.middleTileIndex, map.chunkLength - 1, TILE_ID_ROCK, game);
    changeTileIdOfMapChunk(entranceData.leftMiddleChunk.x, entranceData.leftMiddleChunk.y, 0, entranceData.middleTileIndex, TILE_ID_ROCK, game);
    changeTileIdOfMapChunk(entranceData.rightMiddleChunk.x, entranceData.rightMiddleChunk.y, map.chunkLength - 1, entranceData.middleTileIndex, TILE_ID_ROCK, game);
}

function createAndSetChunks(map: GameMap) {
    if (!map.godArea || !map.godArea.spawnTopLeftChunk) return;
    for (let godAreaChunkX = 0; godAreaChunkX < map.godArea.size; godAreaChunkX++) {
        for (let godAreaChunkY = 0; godAreaChunkY < map.godArea.size; godAreaChunkY++) {
            const tiles: number[][] = [];
            const mapChunk: MapChunk = { tiles: tiles, characters: [], objects: [], isGodAreaChunk: true };
            for (let tileX = 0; tileX < map.chunkLength; tileX++) {
                tiles[tileX] = [];
                for (let tileY = 0; tileY < map.chunkLength; tileY++) {
                    const isAreaBorder = godAreaChunkX === 0 && tileX === 0
                        || godAreaChunkX === map.godArea.size - 1 && tileX === map.chunkLength - 1
                        || godAreaChunkY === 0 && tileY === 0
                        || godAreaChunkY === map.godArea.size - 1 && tileY === map.chunkLength - 1;
                    if (isAreaBorder) {
                        tiles[tileX][tileY] = TILE_ID_TREE;
                    } else {
                        tiles[tileX][tileY] = TILE_ID_GRASS;
                    }
                }
            }
            map.chunks[chunkXYToMapKey(map.godArea.spawnTopLeftChunk.x + godAreaChunkX, map.godArea.spawnTopLeftChunk.y + godAreaChunkY)] = mapChunk;
        }
    }
}

function calculateSpawnTopLeft(chunkX: number, chunkY: number, godArea: GameMapGodArea) {
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

function createPathesAndEntryToGodArea(godArea: GameMapGodArea, map: GameMap, game: Game) {
    const entranceData = getAllEntranceLocationsData(godArea, map);
    const middleTileIndex = entranceData.middleTileIndex;
    //north
    const topMiddleChunk = entranceData.topMiddleChunk;
    map.chunks[chunkXYToMapKey(topMiddleChunk.x, topMiddleChunk.y)].tiles[middleTileIndex][0] = TILE_ID_PATH2_VERTICAL;
    for (let chunkYOffset = 1; chunkYOffset <= godArea.pathChunkGenerationLength; chunkYOffset++) {
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
    for (let chunkYOffset = 1; chunkYOffset <= godArea.pathChunkGenerationLength; chunkYOffset++) {
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
    for (let chunkXOffset = 1; chunkXOffset <= godArea.pathChunkGenerationLength; chunkXOffset++) {
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
    for (let chunkXOffset = 1; chunkXOffset <= godArea.pathChunkGenerationLength; chunkXOffset++) {
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

function getAllEntranceLocationsData(godArea: GameMapGodArea, map: GameMap) {
    return {
        topMiddleChunk: {
            x: godArea.spawnTopLeftChunk!.x + Math.floor(godArea.size / 2),
            y: godArea.spawnTopLeftChunk!.y,
        },
        bottomMiddleChunk: {
            x: godArea.spawnTopLeftChunk!.x + Math.floor(godArea.size / 2),
            y: godArea.spawnTopLeftChunk!.y + godArea.size - 1,
        },
        leftMiddleChunk: {
            x: godArea.spawnTopLeftChunk!.x,
            y: godArea.spawnTopLeftChunk!.y + Math.floor(godArea.size / 2),
        },
        rightMiddleChunk: {
            x: godArea.spawnTopLeftChunk!.x + godArea.size - 1,
            y: godArea.spawnTopLeftChunk!.y + Math.floor(godArea.size / 2),
        },
        middleTileIndex: Math.floor(map.chunkLength / 2),
    };
}

function checkCreateGodArea(chunkX: number, chunkY: number, map: GameMap): boolean {
    if (!map.godArea || map.godArea.spawnTopLeftChunk) return false;
    const chunkLength = map.chunkLength * map.tileSize;
    const distance = calculateDistance({ x: chunkX * chunkLength, y: chunkY * chunkLength }, getMapMidlePosition(map));
    if (distance >= map.godArea.autoSpawnOnDistance && distance <= map.godArea.autoSpawnOnDistance * 1.1) return true;
    return false;
}

