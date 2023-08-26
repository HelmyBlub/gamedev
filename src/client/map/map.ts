import { Character } from "../character/characterModel.js";
import { Game, IdCounter, Position } from "../gameModel.js"
import { createNewChunk } from "./mapGeneration.js";
import { MapPaintLayer } from "./mapPaint.js";

export type MapTiles = {
    [key: number]: MapTile,
}

export type MapTile = {
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
    isEndBossAreaChunk?: boolean,
}

export let TILE_VALUES: MapTiles = {
    0: { name: "grass", imagePath: "/images/grass.png", blocking: false, layer: "Layer1" },
    1: { name: "tree", imagePath: "/images/tree.png", blocking: true, layer: "Layer2" },
    2: { name: "rock", imagePath: "/images/rock.png", blocking: true, layer: "Layer2" },
    3: { name: "path1", imagePath: "/images/path1.png", blocking: false, layer: "Layer1" },
    4: { name: "path2", imagePath: "/images/path2.png", blocking: false, layer: "Layer1" },
}

export type GameMap = {
    seed?: number,
    tileSize: number,
    chunkLength: number,
    activeChunkKeys: string[],
    activeChunkRange: number,
    chunks: { [key: string]: MapChunk },
    endBossArea?: GameMapEndBossArea,
}

export type GameMapEndBossArea = {
    size: number,
    numberChunksUntil: number,
}

export function createMap(): GameMap {
    const map: GameMap = {
        tileSize: 40,
        chunkLength: 8,
        activeChunkKeys: [],
        activeChunkRange: 1000,
        chunks: {},
    }
    //initBossArea(map);
    return map;
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

export function changeTileIdOfMapChunk(chunkI: number, chunkJ: number, tileI: number, tileJ: number, newTileId: number, game: Game){
    const chunkKey = chunkIJToMapKey(chunkI, chunkJ);
    game.state.map.chunks[chunkKey].tiles[tileI][tileJ] = newTileId;
    const mapPaintCache = game.performance.mapChunkPaintCache;
    if(mapPaintCache){
        let paintCacheKey1 = chunkKey + "_Layer1";
        if(mapPaintCache[paintCacheKey1]){
            delete mapPaintCache[paintCacheKey1];
        }
        let paintCacheKey2 = chunkKey + "_Layer2";
        if(mapPaintCache[paintCacheKey2]){
            delete mapPaintCache[paintCacheKey2];
        }
    }
}

export function positionToMapKey(pos: Position, map: GameMap): string {
    let chunkSize = map.tileSize * map.chunkLength;
    const chunkIJ = positionToChunkIJ(pos, map);
    return chunkIJToMapKey(chunkIJ.i, chunkIJ.j);
}

export function positionToChunkIJ(pos: Position, map: GameMap){
    let chunkSize = map.tileSize * map.chunkLength;
    return {i: Math.floor(pos.y / chunkSize), j: Math.floor(pos.x / chunkSize)};
}

export function chunkIJToMapKey(chunkI: number, chunkJ:number){
    return `${chunkI}_${chunkJ}`;
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
    let newPos = calculateMovePosition(position, moveDirection, distance, checkColision, map, idCounter);
    position.x = newPos.x;
    position.y = newPos.y;
}

export function calculateBounceAngle(bouncePosition: Position, startingAngle: number, map: GameMap): number {
    let tileSize = map.tileSize;
    let wallX = Math.abs(bouncePosition.x % tileSize);
    if (wallX > tileSize / 2) wallX = Math.abs(wallX - tileSize);
    let wallY = Math.abs(bouncePosition.y % tileSize);
    if (wallY > tileSize / 2) wallY = Math.abs(wallY - tileSize);

    const wallAngle = wallX - wallY > 0 ? 0 : Math.PI / 2;
    const angleDiff = startingAngle - wallAngle;
    return wallAngle - angleDiff;
}

export function calculateMovePosition(position: Position, moveDirection: number, distance: number, checkColision: boolean, map: GameMap | undefined = undefined, idCounter: IdCounter | undefined = undefined): Position {
    let x = position.x + Math.cos(moveDirection) * distance;
    let y = position.y + Math.sin(moveDirection) * distance;
    if (checkColision) {
        if (!map || !idCounter) throw new Error("collision check requires map and idCounter");
        let blocking = isPositionBlocking({ x, y }, map, idCounter);
        if (!blocking) {
            let blockingBothSides = isPositionBlocking({ x: position.x, y }, map, idCounter) && isPositionBlocking({ x, y: position.y }, map, idCounter);
            if (!blockingBothSides) {
                return { x, y };
            }
        } else {
            let xTile = Math.floor(position.x / map.tileSize);
            let newXTile = Math.floor(x / map.tileSize);
            if (xTile !== newXTile) {
                if (!isPositionBlocking({ x: position.x, y }, map, idCounter)) {
                    return { x: position.x, y };
                }
            }
            let yTile = Math.floor(position.y / map.tileSize);
            let newYTile = Math.floor(y / map.tileSize);
            if (yTile !== newYTile) {
                if (!isPositionBlocking({ x, y: position.y }, map, idCounter)) {
                    return { x, y: position.y };
                }
            }
        }
        return { x: position.x, y: position.y };
    } else {
        return { x, y };
    }
}

export function getChunksTouchingLine(map: GameMap, lineStart: Position, lineEnd: Position, width: number = 20): MapChunk[] {
    const chunkSize = map.chunkLength * map.tileSize;
    if (width / 2 > chunkSize) width = chunkSize * 2;
    const chunkKeys: Set<string> = new Set<string>();
    const firstKey = positionToMapKey(lineStart, map);
    chunkKeys.add(firstKey);
    const endKey = positionToMapKey(lineEnd, map);
    if (firstKey !== endKey) {
        let xDiff = lineEnd.x - lineStart.x;
        let yDiff = lineEnd.y - lineStart.y;
        let currentPos = { ...lineStart };
        let currentKey: string;
        do {
            let nextYBorder: number | undefined;
            let nextXBorder: number | undefined;
            let nextYBorderX: number | undefined;
            let nextXBorderY: number | undefined;
            if (yDiff !== 0) {
                if (yDiff > 0) {
                    nextYBorder = Math.ceil(currentPos.y / chunkSize) * chunkSize + 0.01;
                } else {
                    nextYBorder = Math.floor(currentPos.y / chunkSize) * chunkSize - 0.01;
                }
            }
            if (xDiff !== 0) {
                if (xDiff > 0) {
                    nextXBorder = Math.ceil(currentPos.x / chunkSize) * chunkSize + 0.01;
                } else {
                    nextXBorder = Math.floor(currentPos.x / chunkSize) * chunkSize - 0.01;
                }
            }
            if (nextYBorder !== undefined) {
                nextYBorderX = (nextYBorder - currentPos.y) * (xDiff / yDiff) + currentPos.x;
            }
            if (nextXBorder !== undefined) {
                nextXBorderY = (nextXBorder - currentPos.x) * (yDiff / xDiff) + currentPos.y;
            }
            if (nextYBorderX !== undefined && nextXBorderY !== undefined) {
                if (nextXBorder! > nextYBorderX) {
                    if (xDiff > 0) {
                        currentPos.x = nextYBorderX;
                        currentPos.y = nextYBorder!;
                    } else {
                        currentPos.x = nextXBorder!;
                        currentPos.y = nextXBorderY;
                    }
                } else {
                    if (xDiff > 0) {
                        currentPos.x = nextXBorder!;
                        currentPos.y = nextXBorderY;
                    } else {
                        currentPos.x = nextYBorderX;
                        currentPos.y = nextYBorder!;
                    }
                }
            } else if (nextYBorderX !== undefined) {
                currentPos.y = nextYBorder!;
            } else if (nextXBorderY !== undefined) {
                currentPos.x = nextXBorder!;
            } else {
                console.log("should not happen?");
            }
            currentKey = positionToMapKey(currentPos, map);
            chunkKeys.add(currentKey);
            let tempKey = positionToMapKey({ x: currentPos.x - width / 2, y: currentPos.y }, map);
            chunkKeys.add(tempKey);
            tempKey = positionToMapKey({ x: currentPos.x + width / 2, y: currentPos.y }, map);
            chunkKeys.add(tempKey);
            tempKey = positionToMapKey({ x: currentPos.x, y: currentPos.y + width / 2 }, map);
            chunkKeys.add(tempKey);
            tempKey = positionToMapKey({ x: currentPos.x, y: currentPos.y - width / 2 }, map);
            chunkKeys.add(tempKey);
        } while (currentKey !== endKey);
    }

    let chunks: MapChunk[] = [];
    for (let chunkKey of chunkKeys) {
        if (map.chunks[chunkKey] !== undefined && map.activeChunkKeys.includes(chunkKey)) {
            chunks.push(map.chunks[chunkKey]);
        }
    }
    return chunks;
}

export function positionToGameMapTileIJ(map: GameMap, position: Position): { i: number, j: number } {
    return {
        i: Math.floor(position.x / map.tileSize),
        j: Math.floor(position.y / map.tileSize),
    }
}

export function getFirstBlockingGameMapTilePositionTouchingLine(map: GameMap, lineStart: Position, lineEnd: Position, game: Game): Position | undefined {
    let tileSize = map.tileSize;
    let currentTileIJ = positionToGameMapTileIJ(map, lineStart);
    let endTileIJ = positionToGameMapTileIJ(map, lineEnd);
    if (currentTileIJ.i !== endTileIJ.i || currentTileIJ.j !== endTileIJ.j) {
        let xDiff = lineEnd.x - lineStart.x;
        let yDiff = lineEnd.y - lineStart.y;
        let currentPos = { x: lineStart.x, y: lineStart.y };
        do {
            let nextYBorder: number | undefined;
            let nextXBorder: number | undefined;
            let nextYBorderX: number | undefined;
            let nextXBorderY: number | undefined;
            if (yDiff !== 0) {
                if (yDiff > 0) {
                    nextYBorder = Math.ceil(currentPos.y / tileSize) * tileSize + 0.01;
                } else {
                    nextYBorder = Math.floor(currentPos.y / tileSize) * tileSize - 0.01;
                }
            }
            if (xDiff !== 0) {
                if (xDiff > 0) {
                    nextXBorder = Math.ceil(currentPos.x / tileSize) * tileSize + 0.01;
                } else {
                    nextXBorder = Math.floor(currentPos.x / tileSize) * tileSize - 0.01;
                }
            }
            if (nextYBorder !== undefined) {
                nextYBorderX = (nextYBorder - currentPos.y) * (xDiff / yDiff) + currentPos.x;
            }
            if (nextXBorder !== undefined) {
                nextXBorderY = (nextXBorder - currentPos.x) * (yDiff / xDiff) + currentPos.y;
            }
            if (nextYBorderX !== undefined && nextXBorderY !== undefined) {
                if (nextXBorder! > nextYBorderX) {
                    if (xDiff > 0) {
                        currentPos.x = nextYBorderX;
                        currentPos.y = nextYBorder!;
                    } else {
                        currentPos.x = nextXBorder!;
                        currentPos.y = nextXBorderY;
                    }
                } else {
                    if (xDiff > 0) {
                        currentPos.x = nextXBorder!;
                        currentPos.y = nextXBorderY;
                    } else {
                        currentPos.x = nextYBorderX;
                        currentPos.y = nextYBorder!;
                    }
                }
            } else if (nextYBorderX !== undefined) {
                currentPos.y = nextYBorder!;
            } else if (nextXBorderY !== undefined) {
                currentPos.x = nextXBorder!;
            } else {
                console.log("should not happen?");
            }
            const currentTile = getMapTile(currentPos, map, game.state.idCounter);
            currentTileIJ = positionToGameMapTileIJ(map, currentPos);
            if (currentTile.blocking) {
                return currentPos;
            }
        } while (currentTileIJ.i !== endTileIJ.i || currentTileIJ.j !== endTileIJ.j);
    }

    return undefined;
}

export function getChunksTouchingLine2(map: GameMap, lineStart: Position, lineEnd: Position): MapChunk[] {
    const chunkKeys: string[] = [];
    const chuckSize = map.tileSize * map.chunkLength;
    const startX = Math.floor(lineStart.x / chuckSize);
    const startY = Math.floor(lineStart.y / chuckSize);
    const endX = Math.floor(lineEnd.x / chuckSize);
    const endY = Math.floor(lineEnd.y / chuckSize);
    const sx = startX < endX ? 1 : -1;
    const sy = startY < endY ? 1 : -1;
    const dx = Math.abs(lineEnd.x / chuckSize - startX);
    const dy = Math.abs(lineEnd.y / chuckSize - startY);

    let err = dx - dy;
    let x = startX;
    let y = startY;

    while (true) {
        const key = `${y}_${x}`;
        chunkKeys.push(key);

        if (x === endX && y === endY) {
            break;
        }

        const e2 = 2 * err;
        if (e2 > dy) {
            err -= dy;
            x += sx;
        } else if (e2 <= dx) {
            err += dx;
            y += sy;
        } else {
            debugger;
            console.log(lineStart, lineEnd);
            throw new Error("would cause infinite loop, but should not be able to happen?");
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

export function getMapTile(pos: Position, map: GameMap, idCounter: IdCounter): MapTile {
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

function initBossArea(map: GameMap){
    const bossAreaDistance = 1000;
    map.endBossArea = {
        size: 3,
        numberChunksUntil: Math.floor(bossAreaDistance / (map.tileSize * map.chunkLength)),
    }
}
