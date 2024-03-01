import { calculateDistance } from "../game.js";
import { Game, Position } from "../gameModel.js";
import { GameMap, MapChunk, TILE_ID_GRASS, TILE_ID_PATH1_HORIZONTAL, TILE_ID_PATH2_VERTICAL, TILE_ID_TREE, chunkXYToMapKey, getMapMidlePosition } from "./map.js";
import { createNewChunk } from "./mapGeneration.js";

export type GameMapGodArea = {
    size: number,
    autoSpawnOnDistance: number,
    pathChunkGenerationLength: number,
    areaCreated?: {
        spawnTopLeftChunk: Position,
    }
}

export function createAndSetGodAreaOnMap(chunkX: number, chunkY: number, map: GameMap, game: Game): boolean {
    if (!map.godArea) return false;
    if (!checkCreateGodArea(chunkX, chunkY, map)) return false;
    let leftGodAreaChunkX = 0;
    let topGodAreaChunkY = 0;
    if (Math.abs(chunkX) > Math.abs(chunkY)) {
        if (chunkX > 0) {
            leftGodAreaChunkX = chunkX;
            topGodAreaChunkY = chunkY - Math.floor(map.godArea.size / 2);
        } else {
            leftGodAreaChunkX = chunkX - map.godArea.size + 1;
            topGodAreaChunkY = chunkY - Math.floor(map.godArea.size / 2);
        }
    } else {
        if (chunkY > 0) {
            leftGodAreaChunkX = chunkX - Math.floor(map.godArea.size / 2);
            topGodAreaChunkY = chunkY;
        } else {
            leftGodAreaChunkX = chunkX - Math.floor(map.godArea.size / 2);
            topGodAreaChunkY = chunkY - map.godArea.size + 1;
        }
    }

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
            map.chunks[chunkXYToMapKey(leftGodAreaChunkX + godAreaChunkX, topGodAreaChunkY + godAreaChunkY)] = mapChunk;
        }
    }

    map.godArea.areaCreated = {
        spawnTopLeftChunk: { x: leftGodAreaChunkX, y: topGodAreaChunkY },
    };

    createPathesAndEntryToGodArea(map.godArea, map, game);

    console.log("god area created", map.godArea.areaCreated, chunkX, chunkY);
    return true;
}

function createPathesAndEntryToGodArea(godArea: GameMapGodArea, map: GameMap, game: Game) {
    //north
    const topMiddleChunk = {
        x: godArea.areaCreated!.spawnTopLeftChunk.x + Math.floor(godArea.size / 2),
        y: godArea.areaCreated!.spawnTopLeftChunk.y,
    }
    const middleTileIndex = Math.floor(map.chunkLength / 2);
    map.chunks[chunkXYToMapKey(topMiddleChunk.x, topMiddleChunk.y)].tiles[middleTileIndex][0] = TILE_ID_PATH2_VERTICAL;
    for (let chunkYOffset = 1; chunkYOffset <= godArea.pathChunkGenerationLength; chunkYOffset++) {
        let currentChunk = map.chunks[chunkXYToMapKey(topMiddleChunk.x, topMiddleChunk.y - chunkYOffset)];
        if (!currentChunk) {
            currentChunk = createNewChunk(map, topMiddleChunk.x, topMiddleChunk.y - chunkYOffset, game.state.idCounter, game);
        }
        for (let tileY = 0; tileY < map.chunkLength; tileY++) {
            currentChunk.tiles[middleTileIndex][tileY] = TILE_ID_PATH2_VERTICAL;
        }
    }
    //south
    const bottomMiddleChunk = {
        x: godArea.areaCreated!.spawnTopLeftChunk.x + Math.floor(godArea.size / 2),
        y: godArea.areaCreated!.spawnTopLeftChunk.y + godArea.size - 1,
    }
    map.chunks[chunkXYToMapKey(bottomMiddleChunk.x, bottomMiddleChunk.y)].tiles[middleTileIndex][map.chunkLength - 1] = TILE_ID_PATH2_VERTICAL;
    for (let chunkYOffset = 1; chunkYOffset <= godArea.pathChunkGenerationLength; chunkYOffset++) {
        let currentChunk = map.chunks[chunkXYToMapKey(bottomMiddleChunk.x, bottomMiddleChunk.y + chunkYOffset)];
        if (!currentChunk) {
            currentChunk = createNewChunk(map, bottomMiddleChunk.x, bottomMiddleChunk.y + chunkYOffset, game.state.idCounter, game);
        }
        for (let tileY = 0; tileY < map.chunkLength; tileY++) {
            currentChunk.tiles[middleTileIndex][tileY] = TILE_ID_PATH2_VERTICAL;
        }
    }
    //west
    const leftMiddleChunk = {
        x: godArea.areaCreated!.spawnTopLeftChunk.x,
        y: godArea.areaCreated!.spawnTopLeftChunk.y + Math.floor(godArea.size / 2),
    }
    map.chunks[chunkXYToMapKey(leftMiddleChunk.x, leftMiddleChunk.y)].tiles[0][middleTileIndex] = TILE_ID_PATH1_HORIZONTAL;
    for (let chunkXOffset = 1; chunkXOffset <= godArea.pathChunkGenerationLength; chunkXOffset++) {
        let currentChunk = map.chunks[chunkXYToMapKey(leftMiddleChunk.x - chunkXOffset, leftMiddleChunk.y)];
        if (!currentChunk) {
            currentChunk = createNewChunk(map, leftMiddleChunk.x - chunkXOffset, leftMiddleChunk.y, game.state.idCounter, game);
        }
        for (let tileX = 0; tileX < map.chunkLength; tileX++) {
            currentChunk.tiles[tileX][middleTileIndex] = TILE_ID_PATH1_HORIZONTAL;
        }
    }
    //east
    const rightMiddleChunk = {
        x: godArea.areaCreated!.spawnTopLeftChunk.x + godArea.size - 1,
        y: godArea.areaCreated!.spawnTopLeftChunk.y + Math.floor(godArea.size / 2),
    }
    map.chunks[chunkXYToMapKey(rightMiddleChunk.x, rightMiddleChunk.y)].tiles[map.chunkLength - 1][middleTileIndex] = TILE_ID_PATH1_HORIZONTAL;
    for (let chunkXOffset = 1; chunkXOffset <= godArea.pathChunkGenerationLength; chunkXOffset++) {
        let currentChunk = map.chunks[chunkXYToMapKey(rightMiddleChunk.x + chunkXOffset, rightMiddleChunk.y)];
        if (!currentChunk) {
            currentChunk = createNewChunk(map, rightMiddleChunk.x + chunkXOffset, rightMiddleChunk.y, game.state.idCounter, game);
        }
        for (let tileX = 0; tileX < map.chunkLength; tileX++) {
            currentChunk.tiles[tileX][middleTileIndex] = TILE_ID_PATH1_HORIZONTAL;
        }
    }
}

function checkCreateGodArea(chunkX: number, chunkY: number, map: GameMap): boolean {
    if (!map.godArea || map.godArea.areaCreated) return false;
    const chunkLength = map.chunkLength * map.tileSize;
    const distance = calculateDistance({ x: chunkX * chunkLength, y: chunkY * chunkLength }, getMapMidlePosition(map));
    if (distance >= map.godArea.autoSpawnOnDistance) return true;
    return false;
}

