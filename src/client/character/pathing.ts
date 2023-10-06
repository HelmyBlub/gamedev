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

export function getPathingCache(game: Game){
    let pathingCache = {};
    if(game.performance.pathingCache !== undefined){
        pathingCache = game.performance.pathingCache;
    }else{
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
): Position | null {
    if (isPositionBlocking(sourcePos, map, idCounter)) {
        console.log("can't find way to a blocking position");
        return null;
    }
    let targetXY: Position = calculatePosToTileXY(sourcePos, map);
    let startXY: Position = calculatePosToTileXY(targetPos, map);
    if (startXY.x === targetXY.x && startXY.y === targetXY.y) {
        return targetPos;
    }

    let openNodes: Position[] = [];
    let cameFrom: Map<string, Position | null> = new Map<string, Position | null>();

    let targetKey = `${targetXY.x}_${targetXY.y}`;
    let pathingCacheXY: PathingCacheXY | undefined;
    if (pathingCache !== null) {
        let pathingKey = tileXyToPathingCacheKey(startXY);
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
                let nextWaypoint = cameFrom.get(targetKey)!;
                if(nextWaypoint !== null){
                    return { x: nextWaypoint.x * map.tileSize + map.tileSize / 2, y: nextWaypoint.y * map.tileSize + map.tileSize / 2 };
                }else{
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
    let maxCounter = calculateDistance(startXY, targetXY) * 300;
    while (openNodes.length > 0) {
        counter++;
        if (counter > maxCounter) {
            console.log("stoped pathfinding, can cause multiplayer sync loss");
            cameFrom.set(targetKey, null);
            return null
        };

        let currentIndex = 0;
        let currentNode = openNodes.splice(currentIndex, 1)[0]!;

        if (currentNode.x === targetXY.x && currentNode.y === targetXY.y) {
            let lastPosition = cameFrom.get(`${targetXY.x}_${targetXY.y}`)!;
            if (pathingCacheXY) openNodes.unshift(currentNode);
            return { x: lastPosition.x * map.tileSize + map.tileSize / 2, y: lastPosition.y * map.tileSize + map.tileSize / 2 };
        }

        let neighborsXY = getPathNeighborsXY(currentNode, map, idCounter);
        for (let i = 0; i < neighborsXY.length; i++) {
            let neighborKey = `${neighborsXY[i].x}_${neighborsXY[i].y}`;
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
    if(pathingCache === undefined) return;
    let keys = Object.keys(pathingCache);
    for (let i = keys.length - 1; i >= 0; i--) {
        if(pathingCache[keys[i]].timeLastUsed < currentTime - 5000){
            delete pathingCache[keys[i]];
        }
    }
    takeTimeMeasure(game.debug, "garbageCollectPathingCache", "");
}

function getPathNeighborsXY(pos: Position, map: GameMap, idCounter: IdCounter): Position[] {
    let result: Position[] = [];
    let top, bottom, left, right: boolean = false;

    let tempXY = { x: pos.x, y: pos.y - 1 };
    if (!isPositionBlocking({ x: tempXY.x * map.tileSize, y: tempXY.y * map.tileSize }, map, idCounter)) {
        top = true;
        result.push(tempXY);
    }
    tempXY = { x: pos.x, y: pos.y + 1 };
    if (!isPositionBlocking({ x: tempXY.x * map.tileSize, y: tempXY.y * map.tileSize }, map, idCounter)) {
        bottom = true;
        result.push(tempXY);
    }
    tempXY = { x: pos.x - 1, y: pos.y };
    if (!isPositionBlocking({ x: tempXY.x * map.tileSize, y: tempXY.y * map.tileSize }, map, idCounter)) {
        left = true;
        result.push(tempXY);
    }
    tempXY = { x: pos.x + 1, y: pos.y };
    if (!isPositionBlocking({ x: tempXY.x * map.tileSize, y: tempXY.y * map.tileSize }, map, idCounter)) {
        right = true;
        result.push(tempXY);
    }
    if (top && right) {
        tempXY = { x: pos.x + 1, y: pos.y - 1 };
        if (!isPositionBlocking({ x: tempXY.x * map.tileSize, y: tempXY.y * map.tileSize }, map, idCounter)) {
            result.push(tempXY);
        }
    }
    if (right && bottom) {
        tempXY = { x: pos.x + 1, y: pos.y + 1 };
        if (!isPositionBlocking({ x: tempXY.x * map.tileSize, y: tempXY.y * map.tileSize }, map, idCounter)) {
            result.push(tempXY);
        }
    }
    if (bottom && left) {
        tempXY = { x: pos.x - 1, y: pos.y + 1 };
        if (!isPositionBlocking({ x: tempXY.x * map.tileSize, y: tempXY.y * map.tileSize }, map, idCounter)) {
            result.push(tempXY);
        }
    }
    if (left && top) {
        tempXY = { x: pos.x - 1, y: pos.y - 1 };
        if (!isPositionBlocking({ x: tempXY.x * map.tileSize, y: tempXY.y * map.tileSize }, map, idCounter)) {
            result.push(tempXY);
        }
    }

    return result;
}

export function calculatePosToTileXY(pos: Position, map: GameMap): Position {
    let chunkSize = map.tileSize * map.chunkLength;
    let startChunkY = Math.floor(pos.y / chunkSize);
    let startChunkX = Math.floor(pos.x / chunkSize);
    let tileY = Math.floor((pos.y / map.tileSize) % map.chunkLength);
    if (tileY < 0) tileY += map.chunkLength;
    let tileX = Math.floor((pos.x / map.tileSize) % map.chunkLength);
    if (tileX < 0) tileX += map.chunkLength;

    return {
        x: startChunkX * map.chunkLength + tileX,
        y: startChunkY * map.chunkLength + tileY,
    };
}
