import { Character } from "../character/characterModel.js";
import { Game, IdCounter, Position } from "../gameModel.js"
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