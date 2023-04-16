import { Character } from "../character/characterModel.js";
import { IdCounter, Position } from "../gameModel.js"
import { createNewChunk } from "./mapGeneration.js";
import { MapPaintLayer } from "./mapPaint.js";

type MapTiles = {
    [key: number]: MapTile,
}

type MapTile = {
    name: string,
    color?: string,
    imagePath?: string,
    imageRef?: HTMLImageElement,
    blocking: boolean,
    layer: MapPaintLayer,
}

export type MapChunk = {
    tiles: number[][],
    characters: Character[],
}

export let TILE_VALUES: MapTiles = {
    0: { name: "grass", imagePath: "/images/grass.png", blocking: false, layer: "Layer1" },
    1: { name: "tree", imagePath: "/images/tree.png", blocking: true, layer: "Layer2" },
    2: { name: "rock", imagePath: "/images/rock.png", blocking: true, layer: "Layer2" },
}

export type GameMap = {
    seed?: number,
    tileSize: number,
    chunkLength: number,
    activeChunkKeys: string[],
    activeChunkRange: number,
    chunks: { [key: string]: MapChunk },
}

export function createMap(): GameMap {
    return {
        tileSize: 40,
        chunkLength: 8,
        activeChunkKeys: [],
        activeChunkRange: 1000,
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

export function mapKeyToChunkIJ(mapKey: string) {
    let chunkI = parseInt(mapKey.split("_")[0]);
    let chunkJ = parseInt(mapKey.split("_")[1]);
    return { chunkI, chunkJ };
}

export function determineMapKeysInDistance(position: Position, map: GameMap, maxDistance: number, addNotCreatedChunkKeys: boolean = true, addNonActiveChunkKeys: boolean = true): string[] {
    let chunkSize = map.tileSize * map.chunkLength;
    let maxChunks = Math.ceil(maxDistance / chunkSize);
    let result: string[] = [];
    for (let i = - maxChunks; i <= maxChunks; i++) {
        for (let j = - maxChunks; j <= maxChunks; j++) {
            let chunkI = Math.floor(position.y / chunkSize) + i;
            let chunkJ = Math.floor(position.x / chunkSize) + j;
            if (!addNotCreatedChunkKeys && map.chunks[`${chunkI}_${chunkJ}`] === undefined) continue;
            if (!addNonActiveChunkKeys && !map.activeChunkKeys.includes(`${chunkI}_${chunkJ}`)) continue;
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

export function moveByDirectionAndDistance(position: Position, moveDirection: number, distance: number, checkColision: boolean, map: GameMap | undefined = undefined, idCounter: IdCounter | undefined = undefined) {
    let x = position.x + Math.cos(moveDirection) * distance;
    let y = position.y + Math.sin(moveDirection) * distance;
    let blocking = checkColision;
    if (checkColision) {
        if (!map || !idCounter) throw new Error("collision check requires map and idCounter");
        blocking = isPositionBlocking({ x, y }, map, idCounter);
    }
    if (!blocking) {
        position.x = x;
        position.y = y;
    }
}

export function getChunksTouchingLine(map: GameMap, lineStart: Position, lineEnd: Position): MapChunk[] {
    //TODO does not consider line width. 
    const chunkKeys: string[] = [];
    let chuckSize = map.tileSize * map.chunkLength;
    let x0 = Math.floor(lineStart.x / chuckSize);
    let y0 = Math.floor(lineStart.y / chuckSize);
    let x1 = Math.floor(lineEnd.x / chuckSize);
    let y1 = Math.floor(lineEnd.y / chuckSize);

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;

    while (true) {
        const key = `${y}_${x}`;
        chunkKeys.push(key);

        if (x === x1 && y === y1) {
            break;
        }

        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x += sx;
        }
        if (e2 < dx) {
            err += dx;
            y += sy;
        }
    }

    let chunks: MapChunk[] = [];
    for (let chunkKey of chunkKeys) {
        if (map.chunks[chunkKey] !== undefined && map.activeChunkKeys.includes(chunkKey)) {
            chunks.push(map.chunks[chunkKey]);
        }
    }
    return chunks;
}

export function getMapMidlePosition(map: GameMap) {
    let offset = map.tileSize * map.chunkLength / 2;
    return { x: offset, y: offset };
}

export function getTileIdForTileName(tileName: string): number {
    let keys: any = Object.keys(TILE_VALUES);
    for (let key of keys) {
        if (TILE_VALUES[key].name === tileName) {
            return key;
        }
    }
    throw new Error("TileName not found");
}

export function calculateDistanceToMapChunk(chunkI: number, chunkJ: number, position: Position, map: GameMap): number {
    let chunkSize = map.tileSize * map.chunkLength;
    const cellCenterX = chunkJ * chunkSize + chunkSize / 2;
    const cellCenterY = chunkI * chunkSize + chunkSize / 2;
    const dx = Math.max(Math.abs(position.x - cellCenterX) - chunkSize / 2, 0);
    const dy = Math.max(Math.abs(position.y - cellCenterY) - chunkSize / 2, 0);
    return Math.sqrt(dx * dx + dy * dy);
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