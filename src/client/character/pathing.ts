import { calculateDistance, takeTimeMeasure } from "../game.js";
import { Game, IdCounter, Position } from "../gameModel.js";
import { GameMap, isPositionBlocking } from "../map/map.js";

export type PathingCacheXY = {
    cameFromCache: Map<string, Position | null>,
    openNodesCache: Position[],
    alreadyTraveledDistanceCache: Map<string, number>,
    timeLastUsed: number,
}

export type PathingCache = {
    [tileXyKey: string]: PathingCacheXY,
}

export function createPathingCacheXY(timeLastUsed: number): PathingCacheXY {
    return {
        cameFromCache: new Map<string, Position | null>(),
        openNodesCache: [],
        alreadyTraveledDistanceCache: new Map<string, number>(),
        timeLastUsed: timeLastUsed
    }
}

export function tileXyToPathingCacheKey(tileXY: Position) {
    return tileXY.x + "_" + tileXY.y;
}

export function getPathingCache(game: Game) {
    let pathingCache = {};
    if (game.performance.pathingCache !== undefined) {
        pathingCache = game.performance.pathingCache;
    } else {
        game.performance.pathingCache = pathingCache;
    }
    return pathingCache;
}

export function getNextWaypoint(
    sourcePos: Position,
    targetPos: Position,
    map: GameMap,
    pathingCache: PathingCache | null = null,
    idCounter: IdCounter,
    time: number,
    game: Game,
): Position | null {
    if (isPositionBlocking(sourcePos, map, idCounter, game)) {
        console.log("can't find way to a blocking position");
        return null;
    }
    const targetXY: Position = calculatePosToTotalTileXY(sourcePos, map);
    const startXY: Position = calculatePosToTotalTileXY(targetPos, map);
    const maxTileDistance = 50;
    const tileDistance = calculateDistance(startXY, targetXY);
    if (tileDistance > maxTileDistance) {
        console.log("pathing to big distance too far aways");
        return null;
    }
    if (startXY.x === targetXY.x && startXY.y === targetXY.y) {
        return targetPos;
    }

    let openNodes: Position[] = [];
    let cameFrom: Map<string, Position | null> = new Map<string, Position | null>();

    const targetKey = `${targetXY.x}_${targetXY.y}`;
    let pathingCacheXY: PathingCacheXY | undefined;
    if (pathingCache !== null) {
        const pathingKey = tileXyToPathingCacheKey(startXY);
        pathingCacheXY = pathingCache[pathingKey];
        if (pathingCacheXY === undefined) {
            pathingCacheXY = createPathingCacheXY(time);
            pathingCache[pathingKey] = pathingCacheXY;
        } else {
            pathingCacheXY.timeLastUsed = time;
        }
        if (pathingCacheXY.openNodesCache.length > 0) {
            openNodes = pathingCacheXY.openNodesCache;
            cameFrom = pathingCacheXY.cameFromCache;
            if (cameFrom.has(targetKey)) {
                const nextWaypoint = cameFrom.get(targetKey)!;
                if (nextWaypoint !== null) {
                    return { x: nextWaypoint.x * map.tileSize + map.tileSize / 2, y: nextWaypoint.y * map.tileSize + map.tileSize / 2 };
                } else {
                    return null;
                }
            }
        } else {
            pathingCacheXY.openNodesCache = openNodes;
            pathingCacheXY.cameFromCache = cameFrom;
            openNodes.push(startXY);
        }
    } else {
        openNodes.push(startXY);
    }

    let counter = 0;
    const maxCounter = calculateDistance(startXY, targetXY) * 300;
    while (openNodes.length > 0) {
        counter++;
        if (counter > maxCounter || isNaN(maxCounter)) {
            console.log("stoped pathfinding, can cause multiplayer sync loss");
            cameFrom.set(targetKey, null);
            return null
        };

        const currentNode = openNodes.splice(0, 1)[0]!;

        if (currentNode.x === targetXY.x && currentNode.y === targetXY.y) {
            const lastPosition = cameFrom.get(`${targetXY.x}_${targetXY.y}`)!;
            if (pathingCacheXY) openNodes.unshift(currentNode);
            return { x: lastPosition.x * map.tileSize + map.tileSize / 2, y: lastPosition.y * map.tileSize + map.tileSize / 2 };
        }

        const neighborsXY = getPathNeighborsXY(currentNode, map, idCounter, game);
        for (let i = 0; i < neighborsXY.length; i++) {
            const neighborKey = `${neighborsXY[i].x}_${neighborsXY[i].y}`;
            if (!cameFrom.has(neighborKey)) {
                cameFrom.set(neighborKey, currentNode);
                if (!openNodes.find((curr: Position) => curr.x === neighborsXY[i].x && curr.y === neighborsXY[i].y)) {
                    openNodes.push(neighborsXY[i]);
                }
            }
        }
    }

    return null;
}

export function garbageCollectPathingCache(pathingCache: PathingCache | undefined, currentTime: number, game: Game) {
    takeTimeMeasure(game.debug, "", "garbageCollectPathingCache");
    if (pathingCache === undefined) return;
    const keys = Object.keys(pathingCache);
    for (let i = keys.length - 1; i >= 0; i--) {
        if (pathingCache[keys[i]].timeLastUsed < currentTime - 5000) {
            delete pathingCache[keys[i]];
        }
    }
    takeTimeMeasure(game.debug, "garbageCollectPathingCache", "");
}

export function calculatePosToTotalTileXY(pos: Position, map: GameMap): Position {
    const chunkSize = map.tileSize * map.chunkLength;
    const startChunkY = Math.floor(pos.y / chunkSize);
    const startChunkX = Math.floor(pos.x / chunkSize);
    let tileY = Math.floor((pos.y / map.tileSize) % map.chunkLength);
    if (tileY < 0) tileY += map.chunkLength;
    let tileX = Math.floor((pos.x / map.tileSize) % map.chunkLength);
    if (tileX < 0) tileX += map.chunkLength;

    return {
        x: startChunkX * map.chunkLength + tileX,
        y: startChunkY * map.chunkLength + tileY,
    };
}

function getPathNeighborsXY(pos: Position, map: GameMap, idCounter: IdCounter, game: Game): Position[] {
    const result: Position[] = [];
    let top, bottom, left, right: boolean = false;

    let tempXY = { x: pos.x, y: pos.y - 1 };
    if (!isPositionBlocking({ x: tempXY.x * map.tileSize, y: tempXY.y * map.tileSize }, map, idCounter, game)) {
        top = true;
        result.push(tempXY);
    }
    tempXY = { x: pos.x, y: pos.y + 1 };
    if (!isPositionBlocking({ x: tempXY.x * map.tileSize, y: tempXY.y * map.tileSize }, map, idCounter, game)) {
        bottom = true;
        result.push(tempXY);
    }
    tempXY = { x: pos.x - 1, y: pos.y };
    if (!isPositionBlocking({ x: tempXY.x * map.tileSize, y: tempXY.y * map.tileSize }, map, idCounter, game)) {
        left = true;
        result.push(tempXY);
    }
    tempXY = { x: pos.x + 1, y: pos.y };
    if (!isPositionBlocking({ x: tempXY.x * map.tileSize, y: tempXY.y * map.tileSize }, map, idCounter, game)) {
        right = true;
        result.push(tempXY);
    }
    if (top && right) {
        tempXY = { x: pos.x + 1, y: pos.y - 1 };
        if (!isPositionBlocking({ x: tempXY.x * map.tileSize, y: tempXY.y * map.tileSize }, map, idCounter, game)) {
            result.push(tempXY);
        }
    }
    if (right && bottom) {
        tempXY = { x: pos.x + 1, y: pos.y + 1 };
        if (!isPositionBlocking({ x: tempXY.x * map.tileSize, y: tempXY.y * map.tileSize }, map, idCounter, game)) {
            result.push(tempXY);
        }
    }
    if (bottom && left) {
        tempXY = { x: pos.x - 1, y: pos.y + 1 };
        if (!isPositionBlocking({ x: tempXY.x * map.tileSize, y: tempXY.y * map.tileSize }, map, idCounter, game)) {
            result.push(tempXY);
        }
    }
    if (left && top) {
        tempXY = { x: pos.x - 1, y: pos.y - 1 };
        if (!isPositionBlocking({ x: tempXY.x * map.tileSize, y: tempXY.y * map.tileSize }, map, idCounter, game)) {
            result.push(tempXY);
        }
    }

    return result;
}
