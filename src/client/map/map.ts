import { Character } from "../character/characterModel.js";
import { Game, IdCounter, Position } from "../gameModel.js"
import { createNewChunk } from "./mapGeneration.js";
import { MapTileObject } from "./mapObjects.js";
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
    objects: MapTileObject[],
    characters: Character[],
    isEndBossAreaChunk?: boolean,
}

export const TILE_VALUES: MapTiles = {
    0: { name: "grass", imagePath: "/images/grass.png", blocking: false, layer: "Layer1" },
    1: { name: "tree", imagePath: "/images/tree.png", blocking: true, layer: "Layer2" },
    2: { name: "rock", imagePath: "/images/rock.png", blocking: true, layer: "Layer2" },
    3: { name: "path1", imagePath: "/images/path1.png", blocking: false, layer: "Layer1" },
    4: { name: "path2", imagePath: "/images/path2.png", blocking: false, layer: "Layer1" },
    5: { name: "logHorizontal", imagePath: "/images/log_Horizontal.png", blocking: false, layer: "Layer2" },
    6: { name: "logVertical", imagePath: "/images/log_Vertical.png", blocking: false, layer: "Layer2" },
    7: { name: "firepit", imagePath: "/images/firepit.png", blocking: false, layer: "Layer2" },
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

export function createMap(bossAreaDistance: number = 20000): GameMap {
    const map: GameMap = {
        tileSize: 40,
        chunkLength: 8,
        activeChunkKeys: [],
        activeChunkRange: 1000,
        chunks: {},
    }
    initBossArea(map, bossAreaDistance);
    return map;
}

export function addEnemyToMap(map: GameMap, character: Character) {
    const key = positionToMapKey(character, map);
    map.chunks[key].characters.push(character);
}

export function isPositionBlocking(pos: Position, map: GameMap, idCounter: IdCounter, game: Game) {
    const tile = getMapTile(pos, map, idCounter, game);
    if (!tile) return false;
    return tile.blocking;
}

export function findNearNonBlockingPosition(pos: Position, map: GameMap, idCounter: IdCounter, game: Game): Position {
    const currentPosition: Position = { x: pos.x, y: pos.y };
    const distance = 1;
    let counterX = -distance;
    let counterY = -distance;
    while (isPositionBlocking(currentPosition, map, idCounter, game)) {
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

export function changeTileIdOfMapChunk(chunkX: number, chunkY: number, tileX: number, tileY: number, newTileId: number, game: Game) {
    const chunkKey = chunkXYToMapKey(chunkX, chunkY);
    game.state.map.chunks[chunkKey].tiles[tileX][tileY] = newTileId;
    const mapPaintCache = game.performance.mapChunkPaintCache;
    if (mapPaintCache) {
        const paintCacheKey1 = chunkKey + "_Layer1";
        if (mapPaintCache[paintCacheKey1]) {
            delete mapPaintCache[paintCacheKey1];
        }
        const paintCacheKey2 = chunkKey + "_Layer2";
        if (mapPaintCache[paintCacheKey2]) {
            delete mapPaintCache[paintCacheKey2];
        }
    }
}

export function positionToMapKey(pos: Position, map: GameMap): string {
    const chunkXY = positionToChunkXY(pos, map);
    return chunkXYToMapKey(chunkXY.x, chunkXY.y);
}

export function mapKeyAndTileXYToPosition(mapKey: string, tileX: number, tileY: number, map: GameMap): Position {
    const chunkSize = map.tileSize * map.chunkLength;
    const chunkXY = mapKeyToChunkXY(mapKey);
    return {
        x: chunkXY.chunkX * chunkSize + tileX * map.tileSize + map.tileSize / 2,
        y: chunkXY.chunkY * chunkSize + tileY * map.tileSize + map.tileSize / 2,
    }
}

export function positionToChunkXY(pos: Position, map: GameMap): Position {
    const chunkSize = map.tileSize * map.chunkLength;
    return { x: Math.floor(pos.x / chunkSize), y: Math.floor(pos.y / chunkSize) };
}

export function chunkXYToMapKey(chunkX: number, chunkY: number) {
    return `${chunkX}_${chunkY}`;
}

export function mapKeyToChunkXY(mapKey: string) {
    const chunkX = parseInt(mapKey.split("_")[0]);
    const chunkY = parseInt(mapKey.split("_")[1]);
    return { chunkX, chunkY };
}

export function determineMapKeysInDistance(position: Position, map: GameMap, maxDistance: number, addNotCreatedChunkKeys: boolean = true, addNonActiveChunkKeys: boolean = true): string[] {
    const chunkSize = map.tileSize * map.chunkLength;
    const maxChunks = Math.ceil(maxDistance / chunkSize);
    const result: string[] = [];
    for (let i = - maxChunks; i <= maxChunks; i++) {
        for (let j = - maxChunks; j <= maxChunks; j++) {
            const chunkX = Math.floor(position.x / chunkSize) + j;
            const chunkY = Math.floor(position.y / chunkSize) + i;
            const mapKey = chunkXYToMapKey(chunkX, chunkY);
            if (!addNotCreatedChunkKeys && map.chunks[mapKey] === undefined) continue;
            if (!addNonActiveChunkKeys && !map.activeChunkKeys.includes(mapKey)) continue;
            const distance = calculateDistanceToMapChunk(chunkX, chunkY, position, map);
            if (distance <= maxDistance) {
                result.push(mapKey);
            }
        }
    }
    return result;
}

export function removeAllMapCharacters(map: GameMap) {
    const key = Object.keys(map.chunks);
    for (let i = 0; i < key.length; i++) {
        map.chunks[key[i]].characters = [];
    }
}

export function moveByDirectionAndDistance(position: Position, moveDirection: number, distance: number, checkColision: boolean, map: GameMap | undefined = undefined, idCounter: IdCounter | undefined = undefined) {
    const newPos = calculateMovePosition(position, moveDirection, distance, checkColision, map, idCounter);
    position.x = newPos.x;
    position.y = newPos.y;
}

export function calculateBounceAngle(bouncePosition: Position, startingAngle: number, map: GameMap): number {
    const tileSize = map.tileSize;
    let wallX = Math.abs(bouncePosition.x % tileSize);
    if (wallX > tileSize / 2) wallX = Math.abs(wallX - tileSize);
    let wallY = Math.abs(bouncePosition.y % tileSize);
    if (wallY > tileSize / 2) wallY = Math.abs(wallY - tileSize);

    const wallAngle = wallX - wallY > 0 ? 0 : Math.PI / 2;
    const angleDiff = startingAngle - wallAngle;
    return wallAngle - angleDiff;
}

export function calculateMovePosition(position: Position, moveDirection: number, distance: number, checkColision: boolean, map: GameMap | undefined = undefined, idCounter: IdCounter | undefined = undefined, game: Game | undefined = undefined): Position {
    const x = position.x + Math.cos(moveDirection) * distance;
    const y = position.y + Math.sin(moveDirection) * distance;
    if (checkColision) {
        if (!map || !idCounter) throw new Error("collision check requires map and idCounter");
        const blocking = isPositionBlocking({ x, y }, map, idCounter, game!);
        if (!blocking) {
            const blockingBothSides = isPositionBlocking({ x: position.x, y }, map, idCounter, game!) && isPositionBlocking({ x, y: position.y }, map, idCounter, game!);
            if (!blockingBothSides) {
                return { x, y };
            }
        } else {
            const xTile = Math.floor(position.x / map.tileSize);
            const newXTile = Math.floor(x / map.tileSize);
            if (xTile !== newXTile) {
                if (!isPositionBlocking({ x: position.x, y }, map, idCounter, game!)) {
                    return { x: position.x, y };
                }
            }
            const yTile = Math.floor(position.y / map.tileSize);
            const newYTile = Math.floor(y / map.tileSize);
            if (yTile !== newYTile) {
                if (!isPositionBlocking({ x, y: position.y }, map, idCounter, game!)) {
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
        const xDiff = lineEnd.x - lineStart.x;
        const yDiff = lineEnd.y - lineStart.y;
        const currentPos = { ...lineStart };
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

    const chunks: MapChunk[] = [];
    for (let chunkKey of chunkKeys) {
        if (map.chunks[chunkKey] !== undefined && map.activeChunkKeys.includes(chunkKey)) {
            chunks.push(map.chunks[chunkKey]);
        }
    }
    return chunks;
}

export function positionToGameMapTileXY(map: GameMap, position: Position): Position {
    return {
        x: Math.floor(position.x / map.tileSize),
        y: Math.floor(position.y / map.tileSize),
    }
}

export function getFirstBlockingGameMapTilePositionTouchingLine(map: GameMap, lineStart: Position, lineEnd: Position, game: Game): Position | undefined {
    const tileSize = map.tileSize;
    let currentTileXY = positionToGameMapTileXY(map, lineStart);
    const endTileXY = positionToGameMapTileXY(map, lineEnd);
    if (currentTileXY.x !== endTileXY.x || currentTileXY.y !== endTileXY.y) {
        const xDiff = lineEnd.x - lineStart.x;
        const yDiff = lineEnd.y - lineStart.y;
        const currentPos = { x: lineStart.x, y: lineStart.y };
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
            const currentTile = getMapTile(currentPos, map, game.state.idCounter, game);
            currentTileXY = positionToGameMapTileXY(map, currentPos);
            if (currentTile.blocking) {
                return currentPos;
            }
        } while (currentTileXY.x !== endTileXY.x || currentTileXY.y !== endTileXY.y);
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

    const chunks: MapChunk[] = [];
    for (let chunkKey of chunkKeys) {
        if (map.chunks[chunkKey] !== undefined && map.activeChunkKeys.includes(chunkKey)) {
            chunks.push(map.chunks[chunkKey]);
        }
    }
    return chunks;
}

export function getMapMidlePosition(map: GameMap) {
    const offset = map.tileSize * map.chunkLength / 2;
    return { x: offset, y: offset };
}

export function getTileIdForTileName(tileName: string): number {
    const keys: any = Object.keys(TILE_VALUES);
    for (let key of keys) {
        if (TILE_VALUES[key].name === tileName) {
            return key;
        }
    }
    throw new Error("TileName not found");
}

export function calculateDistanceToMapChunk(chunkX: number, chunkY: number, position: Position, map: GameMap): number {
    const chunkSize = map.tileSize * map.chunkLength;
    const cellCenterX = chunkX * chunkSize + chunkSize / 2;
    const cellCenterY = chunkY * chunkSize + chunkSize / 2;
    const dx = Math.max(Math.abs(position.x - cellCenterX) - chunkSize / 2, 0);
    const dy = Math.max(Math.abs(position.y - cellCenterY) - chunkSize / 2, 0);
    return Math.sqrt(dx * dx + dy * dy);
}

export function getMapTile(pos: Position, map: GameMap, idCounter: IdCounter, game: Game): MapTile {
    const chunkSize = map.tileSize * map.chunkLength;
    const chunkX = Math.floor(pos.x / chunkSize);
    const chunkY = Math.floor(pos.y / chunkSize);
    const key = positionToMapKey(pos, map);
    let chunk = map.chunks[key];
    if (chunk === undefined) {
        chunk = createNewChunk(map, chunkX, chunkY, idCounter, game);
    }

    if (chunk) {
        let y = Math.floor((pos.y / map.tileSize) % map.chunkLength);
        if (y < 0) y += map.chunkLength;
        let x = Math.floor((pos.x / map.tileSize) % map.chunkLength);
        if (x < 0) x += map.chunkLength;
        if (y >= 0 && x >= 0 && chunk.tiles.length > x && chunk.tiles[x].length > y) {
            return TILE_VALUES[chunk.tiles[x][y]];
        } else {
            console.log("invalid chunk", x, y, chunk);
        }
    }

    return TILE_VALUES[0];
}

function initBossArea(map: GameMap, bossAreaDistance: number) {
    map.endBossArea = {
        size: 3,
        numberChunksUntil: Math.floor(bossAreaDistance / (map.tileSize * map.chunkLength)),
    }
}
