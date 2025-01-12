import { tickMapCharacters } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { calculateDistance } from "../game.js";
import { Game, IdCounter, Position } from "../gameModel.js"
import { createNewChunk } from "./mapGeneration.js";
import { GameMapGodArea } from "./mapGodArea.js";
import { GameMapKingArea } from "./mapKingArea.js";
import { MapTileObject, tickMapChunkObjects } from "./mapObjects.js";
import { MapPaintLayer } from "./mapPaint.js";
import { GameMapModifier } from "./modifiers/mapModifier.js";

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
    slide?: boolean,
}

export type MapChunk = {
    tiles: number[][],
    objects: MapTileObject[],
    characters: Character[],
    isKingAreaChunk?: boolean,
    isGodAreaChunk?: boolean,
    mapModifiers?: string[],
}

export const TILE_VALUES: MapTiles = {
}

export const TILE_ID_GRASS = 0;
export const TILE_ID_TREE = 1;
export const TILE_ID_ROCK = 2;
export const TILE_ID_PATH1_HORIZONTAL = 3;
export const TILE_ID_PATH2_VERTICAL = 4;
export const TILE_ID_LOG_HORIZONTAL = 5;
export const TILE_ID_LOG_VERTICAL = 6;
export const TILE_ID_FIREPIT = 7;
export const TILE_ID_ICE = 8;

export type GameMap = {
    seed?: number,
    tileSize: number,
    chunkLength: number,
    activeChunkKeys: string[],
    activeCollisionCheckChunkKeys: string[],
    activeChunkRange: number,
    chunks: { [key: string]: MapChunk },
    mapModifiers: GameMapModifier[],
    kingArea?: GameMapKingArea,
    godArea?: GameMapGodArea,
}

export function onDomLoadMapTiles() {
    TILE_VALUES[TILE_ID_GRASS] = { name: "grass", imagePath: "/images/grass.png", blocking: false, layer: "Layer1" };
    TILE_VALUES[TILE_ID_TREE] = { name: "tree", imagePath: "/images/tree.png", blocking: true, layer: "Layer2" };
    TILE_VALUES[TILE_ID_ROCK] = { name: "rock", imagePath: "/images/rock.png", blocking: true, layer: "Layer2" };
    TILE_VALUES[TILE_ID_PATH1_HORIZONTAL] = { name: "path1", imagePath: "/images/path1.png", blocking: false, layer: "Layer1" };
    TILE_VALUES[TILE_ID_PATH2_VERTICAL] = { name: "path2", imagePath: "/images/path2.png", blocking: false, layer: "Layer1" };
    TILE_VALUES[TILE_ID_LOG_HORIZONTAL] = { name: "logHorizontal", imagePath: "/images/log_Horizontal.png", blocking: false, layer: "Layer2" };
    TILE_VALUES[TILE_ID_LOG_VERTICAL] = { name: "logVertical", imagePath: "/images/log_Vertical.png", blocking: false, layer: "Layer2" };
    TILE_VALUES[TILE_ID_FIREPIT] = { name: "firepit", imagePath: "/images/firepit.png", blocking: false, layer: "Layer2" };
    TILE_VALUES[TILE_ID_ICE] = { name: "ice", color: "lightblue", blocking: false, slide: true, layer: "Layer1" };
}

export function createMap(): GameMap {
    const map: GameMap = {
        tileSize: 40,
        chunkLength: 8,
        activeChunkKeys: [],
        activeCollisionCheckChunkKeys: [],
        activeChunkRange: 1000,
        chunks: {},
        mapModifiers: [],
    }
    initKingArea(map, 20000);
    return map;
}

export function tickActiveMapChunks(game: Game) {
    const map = game.state.map;
    for (let i = 0; i < map.activeChunkKeys.length; i++) {
        const chunk = map.chunks[map.activeChunkKeys[i]];
        tickMapChunkObjects(chunk, game);
    }
    tickMapCharacters(map, game);
}

export function addEnemyToMap(map: GameMap, character: Character) {
    const key = positionToMapKey(character, map);
    map.chunks[key].characters.push(character);
    character.mapChunkKey = key;
}

export function isPositionBlocking(pos: Position, map: GameMap, idCounter: IdCounter, game: Game) {
    const tile = getMapTile(pos, map, idCounter, game);
    if (!tile) return false;
    return tile.blocking;
}

export function findNearNonBlockingPosition(pos: Position, map: GameMap, idCounter: IdCounter, game: Game): Position {
    const currentPosition: Position = { x: pos.x, y: pos.y };
    let distance = 1;
    let counterX = -distance;
    let counterY = -distance;
    while (isPositionBlocking(currentPosition, map, idCounter, game)) {
        currentPosition.x = pos.x + counterX * map.tileSize;
        currentPosition.y = pos.y + counterY * map.tileSize;
        if (counterX < distance) {
            counterX++;
        } else {
            if (counterY < distance) {
                counterX = -distance;
                counterY++;
            } else {
                distance++;
                counterX = -distance;
                counterY = -distance;
            }
        }
    }

    return currentPosition;
}

export function changeTileIdOfMapChunk(chunkX: number, chunkY: number, tileX: number, tileY: number, newTileId: number, game: Game) {
    const chunkKey = chunkXYToMapKey(chunkX, chunkY);
    game.state.map.chunks[chunkKey].tiles[tileX][tileY] = newTileId;
    deletePaintCacheForMapChunk(chunkX, chunkY, game);
    game.performance.pathingCache = {};
}

export function deletePaintCacheForMapChunk(chunkX: number, chunkY: number, game: Game) {
    const chunkKey = chunkXYToMapKey(chunkX, chunkY);
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

export function moveByDirectionAndDistance(position: Position, moveDirection: number, distance: number, checkColision: boolean, map: GameMap | undefined = undefined, idCounter: IdCounter | undefined = undefined, game: Game | undefined = undefined) {
    const newPos = calculateMovePosition(position, moveDirection, distance, checkColision, map, idCounter, game);
    position.x = newPos.x;
    position.y = newPos.y;
}

export function calculateBounceAngle(position: Position, moveDirection: number, game: Game): number {
    const tileSize = game.state.map.tileSize;
    const xStep = Math.cos(moveDirection);
    const yStep = Math.sin(moveDirection);
    let numberSteps = 0;
    let wallAngle = 0;

    let wallDistanceX = position.x % tileSize;
    if (wallDistanceX < 0) wallDistanceX += tileSize;
    if (xStep > 0) wallDistanceX = Math.abs(wallDistanceX - tileSize);
    let wallDistanceY = position.y % tileSize;
    if (wallDistanceY < 0) wallDistanceY += tileSize;
    if (yStep > 0) wallDistanceY = Math.abs(wallDistanceY - tileSize);
    let tempPos = { x: position.x, y: position.y };

    if (Math.abs(wallDistanceX / xStep) > Math.abs(wallDistanceY / yStep)) {
        if (yStep > 0) {
            tempPos.y += tileSize;
        } else {
            tempPos.y -= tileSize;
        }
        numberSteps = Math.abs(wallDistanceY / yStep) + 0.001;
        wallAngle = 0;
    } else {
        if (xStep > 0) {
            tempPos.x += tileSize;
        } else {
            tempPos.x -= tileSize;
        }
        numberSteps = Math.abs(wallDistanceX / xStep) + 0.001;
        wallAngle = Math.PI / 2;
    }

    if (isPositionBlocking(tempPos, game.state.map, game.state.idCounter, game)) {
        const angleDiff = moveDirection - wallAngle;
        return wallAngle - angleDiff;
    } else {
        tempPos = {
            x: position.x + xStep * numberSteps,
            y: position.y + yStep * numberSteps,
        }
        return calculateBounceAngle(tempPos, moveDirection, game);
    }
}

export function isMoveFromToBlocking(fromPosition: Position, toPosition: Position, map: GameMap, game: Game): boolean {
    const blocking = isPositionBlocking(toPosition, map, game.state.idCounter, game);
    if (blocking) return true;
    const blockingBothSides = isPositionBlocking({ x: fromPosition.x, y: toPosition.y }, map, game.state.idCounter, game!) && isPositionBlocking({ x: toPosition.x, y: fromPosition.y }, map, game.state.idCounter, game!);
    return blockingBothSides;
}

export function calculateMovePosition(position: Position, moveDirection: number, distance: number, checkColision: boolean, map: GameMap | undefined = undefined, idCounter: IdCounter | undefined = undefined, game: Game | undefined = undefined): Position {
    if (checkColision) {
        if (!map || !idCounter || !game) throw new Error("collision check requires map, idCounter and game");
        let currentPosition: Position = {
            x: position.x,
            y: position.y,
        }
        let distancePerStep = distance;
        let steps = 1;
        if (distance > map.tileSize) {
            steps = Math.ceil(distance / map.tileSize);
            distancePerStep = distance / steps;
        }
        for (let step = 0; step < steps; step++) {
            currentPosition = moveStepWithCollision(currentPosition, moveDirection, distancePerStep, map, idCounter, game);
        }
        return currentPosition;
    } else {
        const x = position.x + Math.cos(moveDirection) * distance;
        const y = position.y + Math.sin(moveDirection) * distance;
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
    if (isNaN(lineEnd.x) || isNaN(lineEnd.y)) return;
    let currentTileXY = positionToGameMapTileXY(map, lineStart);
    const endTileXY = positionToGameMapTileXY(map, lineEnd);
    if (currentTileXY.x !== endTileXY.x || currentTileXY.y !== endTileXY.y) {
        const xDiff = lineEnd.x - lineStart.x;
        const yDiff = lineEnd.y - lineStart.y;
        const currentPos = { x: lineStart.x, y: lineStart.y };
        let lastDistance = calculateDistance(currentPos, lineEnd);
        let counter = 1;
        let maxCounter = 200;
        do {
            counter++;
            if (counter > maxCounter) {
                console.log("endless loop in here?");
                return;
            }
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
            const newDistance = calculateDistance(currentPos, lineEnd);
            if (newDistance > lastDistance) return undefined;
            lastDistance = newDistance;

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

export function calculateDistanceToMapChunk(chunkX: number, chunkY: number, position: Position, map: GameMap): number {
    const chunkSize = map.tileSize * map.chunkLength;
    const cellCenterX = chunkX * chunkSize + chunkSize / 2;
    const cellCenterY = chunkY * chunkSize + chunkSize / 2;
    const dx = Math.max(Math.abs(position.x - cellCenterX) - chunkSize / 2, 0);
    const dy = Math.max(Math.abs(position.y - cellCenterY) - chunkSize / 2, 0);
    return Math.sqrt(dx * dx + dy * dy);
}

export function mousePositionToMapPosition(game: Game, cameraPosition: Position): Position {
    const width = game.canvasElement!.width;
    const height = game.canvasElement!.height;
    return {
        x: (game.mouseRelativeCanvasPosition.x - width / 2) / game.UI.zoom.factor + cameraPosition.x,
        y: (game.mouseRelativeCanvasPosition.y - height / 2) / game.UI.zoom.factor + cameraPosition.y
    }
}

export function getMapTileId(pos: Position, map: GameMap, idCounter: IdCounter, game: Game): number | undefined {
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
            return chunk.tiles[x][y];
        } else {
            console.log("invalid chunk", x, y, chunk);
        }
    }

    return undefined;
}


export function getMapTile(pos: Position, map: GameMap, idCounter: IdCounter, game: Game): MapTile {
    const tileId = getMapTileId(pos, map, idCounter, game);
    if (tileId !== undefined) {
        return TILE_VALUES[tileId];
    }
    //shoud not happen
    return TILE_VALUES[0];
}

export function initKingArea(map: GameMap, bossAreaDistance: number) {
    map.kingArea = {
        size: 3,
        numberChunksUntil: Math.floor(bossAreaDistance / (map.tileSize * map.chunkLength)),
    }
}

export function initGodArea(map: GameMap, distance: number) {
    map.godArea = {
        size: 5,
        autoSpawnOnDistance: distance,
        pathChunkGenerationLength: 3,
    }
}

export function calculatePosToChunkTileXY(pos: Position, map: GameMap): Position {
    const chunkSize = map.tileSize * map.chunkLength;
    let tileY = Math.floor((pos.y / map.tileSize) % map.chunkLength);
    if (tileY < 0) tileY += map.chunkLength;
    let tileX = Math.floor((pos.x / map.tileSize) % map.chunkLength);
    if (tileX < 0) tileX += map.chunkLength;

    return {
        x: tileX,
        y: tileY,
    };
}

function moveStepWithCollision(position: Position, moveDirection: number, distance: number, map: GameMap, idCounter: IdCounter, game: Game): Position {
    const x = position.x + Math.cos(moveDirection) * distance;
    const y = position.y + Math.sin(moveDirection) * distance;
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
}
