import { Character } from "../character/characterModel.js";
import { calculateDistance } from "../game.js";
import { IdCounter, Position } from "../gameModel.js"
import { createNewChunk } from "./mapGeneration.js";

type MapTiles = {
    [key: number]: MapTile,
}

type MapTile = {
    name: string,
    color?: string,
    imagePath?: string,
    imageRef?: HTMLImageElement,
    blocking: boolean,
}

export type MapChunk = {
    tiles: number[][],
    characters: Character[],
}

export let TILE_VALUES: MapTiles = {
    0: { name: "grass", imagePath: "/images/grass.png", blocking: false },
    1: { name: "tree", imagePath: "/images/tree.png", blocking: true },
    2: { name: "rock", imagePath: "/images/rock.png", blocking: true },
}

export type GameMap = {
    seed?: number,
    tileSize: number,
    chunkLength: number,
    activeChunkKeys: string[],
    chunks: { [key: string]: MapChunk },
}

export function createMap(): GameMap {
    return {
        tileSize: 40,
        chunkLength: 8,
        activeChunkKeys: [],
        chunks: {},
    }
}

export function addEnemyToMap(map: GameMap, character: Character) {
    let chunkSize = map.tileSize * map.chunkLength;
    let chunkI = Math.floor(character.y / chunkSize);
    let chunkJ = Math.floor(character.x / chunkSize);
    let key = `${chunkI}_${chunkJ}`;
    map.chunks[key].characters.push(character);
}

export function isPositionBlocking(pos: Position, map: GameMap, idCounter: IdCounter) {
    let tile = getMapTile(pos, map, idCounter);
    if (!tile) return false;
    return tile.blocking;
}

export function findNearNonBlockingPosition(pos: Position, map: GameMap, idCounter: IdCounter): Position {
    let currentPosition: Position = { x: pos.x, y: pos.y };
    let distance = 1;
    let counterX = -distance;
    let counterY = -distance;
    while (isPositionBlocking(currentPosition, map, idCounter)) {
        currentPosition.x = pos.x + counterX * map.tileSize;
        currentPosition.y = pos.y + counterY * map.tileSize;
        if (Math.abs(counterY) === distance) {
            counterX++;
        } else {
            if (counterX >= distance) {
                counterX = -distance;
                counterY++;
            } else {
                counterX = distance;
            }
        }
    }

    return currentPosition;
}

export function positionToMapKey(pos: Position, map: GameMap): string {
    let chunkSize = map.tileSize * map.chunkLength;
    return `${Math.floor(pos.y / chunkSize)}_${Math.floor(pos.x / chunkSize)}`;
}

export function mapKeyToChunkIJ(mapKey: string){
    let chunkI = parseInt(mapKey.split("_")[0]);
    let chunkJ = parseInt(mapKey.split("_")[1]);
    return {chunkI, chunkJ};
}

export function determineMapKeysInDistance(position: Position, map: GameMap, maxDistance: number, addNotCreatedChunkKeys: boolean = true): string[] {
    let chunkSize = map.tileSize * map.chunkLength;
    let maxChunks = Math.ceil(maxDistance / chunkSize);
    let result: string[] = [];
    for (let i = - maxChunks; i <= maxChunks; i++) {
        for (let j = - maxChunks; j <= maxChunks; j++) {
            let chunkI = Math.floor(position.y / chunkSize) + i;
            let chunkJ = Math.floor(position.x / chunkSize) + j;
            if (!addNotCreatedChunkKeys && map.chunks[`${chunkI}_${chunkJ}`] === undefined) continue;
            let distance = calculateDistanceToMapChunk(chunkI, chunkJ, position, map);
            if (distance <= maxDistance) {
                result.push(`${chunkI}_${chunkJ}`);
            }
        }
    }
    return result;
}

export function removeAllMapCharacters(map: GameMap) {
    let key = Object.keys(map.chunks);
    for (let i = 0; i < key.length; i++) {
        map.chunks[key[i]].characters = [];
    }
}

function calculateDistanceToMapChunk(chunkI: number, chunkJ: number, position: Position, map: GameMap): number {
    let chunkSize = map.tileSize * map.chunkLength;
    let topChunk = chunkI * chunkSize;
    let leftChunk = chunkJ * chunkSize;
    if (leftChunk <= position.x && leftChunk + chunkSize > position.x) {
        if (topChunk + chunkSize > position.y) {
            if (topChunk <= position.y) {
                return 0;
            } else {
                return topChunk - position.y;
            }
        } else {
            return position.y - topChunk + chunkSize;
        }
    } else if (topChunk <= position.y && topChunk + chunkSize > position.y) {
        if (leftChunk + chunkSize > position.x) {
            if (leftChunk <= position.x) {
                return 0;
            } else {
                return leftChunk - position.x;
            }
        } else {
            return position.x - leftChunk + chunkSize;
        }
    } else {
        if (topChunk > position.y && leftChunk > position.x) {
            return calculateDistance(position, { x: leftChunk, y: topChunk });
        } else if (topChunk + chunkSize <= position.y && leftChunk > position.x) {
            return calculateDistance(position, { x: leftChunk, y: topChunk + chunkSize });
        } else if (topChunk > position.y && leftChunk + chunkSize <= position.x) {
            return calculateDistance(position, { x: leftChunk + chunkSize, y: topChunk });
        } else {
            return calculateDistance(position, { x: leftChunk + chunkSize, y: topChunk + chunkSize });
        }
    }
}

function getMapTile(pos: Position, map: GameMap, idCounter: IdCounter): MapTile {
    let chunkSize = map.tileSize * map.chunkLength;
    let chunkI = Math.floor(pos.y / chunkSize);
    let chunkJ = Math.floor(pos.x / chunkSize);
    let key = `${chunkI}_${chunkJ}`;
    let chunk = map.chunks[key];
    if (chunk === undefined) {
        chunk = createNewChunk(map, chunkI, chunkJ, idCounter);
    }

    if (chunk) {
        let i = Math.floor((pos.y / map.tileSize) % map.chunkLength);
        if (i < 0) i += map.chunkLength;
        let j = Math.floor((pos.x / map.tileSize) % map.chunkLength);
        if (j < 0) j += map.chunkLength;
        if (i >= 0 && j >= 0 && chunk.tiles.length > i && chunk.tiles[i].length > j) {
            return TILE_VALUES[chunk.tiles[i][j]];
        } else {
            console.log("invalid chunk", i, j, chunk);
        }
    }

    return TILE_VALUES[0];
}