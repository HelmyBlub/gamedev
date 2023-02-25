import { calculateDistance, takeTimeMeasure } from "../game.js";
import { Game, IdCounter, Position } from "../gameModel.js";
import { GameMap, isPositionBlocking } from "../map/map.js";

export type PathingCacheIJ = {
    cameFromCache: Map<string, Position | null>,
    openNodesCache: Position[],
    alreadyTraveledDistanceCache: Map<string, number>,
    timeLastUsed: number,
}

export type PathingCache = {
    [tileIjKey: string]: PathingCacheIJ,
}

export function createPathingCacheIJ(timeLastUsed: number): PathingCacheIJ {
    return {
        cameFromCache: new Map<string, Position | null>(),
        openNodesCache: [],
        alreadyTraveledDistanceCache: new Map<string, number>(),
        timeLastUsed: timeLastUsed
    }
}

export function tileIjToPathingCacheKey(tileIJ: Position) {
    return tileIJ.x + "_" + tileIJ.y;
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
        throw new Error("can't find way to a blocking position");
    }
    let targetIJ: Position = calculatePosToTileIJ(sourcePos, map);
    let startIJ: Position = calculatePosToTileIJ(targetPos, map);
    if (startIJ.x === targetIJ.x && startIJ.y === targetIJ.y) {
        return targetPos;
    }

    let openNodes: Position[] = [];
    let cameFrom: Map<string, Position | null> = new Map<string, Position | null>();

    let targetKey = `${targetIJ.x}_${targetIJ.y}`;
    let pathingCacheIJ: PathingCacheIJ | undefined;
    if (pathingCache !== null) {
        let pathingKey = tileIjToPathingCacheKey(startIJ);
        pathingCacheIJ = pathingCache[pathingKey];
        if (pathingCacheIJ === undefined) {
            pathingCacheIJ = createPathingCacheIJ(time);
            pathingCache[pathingKey] = pathingCacheIJ;
        } else {
            pathingCacheIJ.timeLastUsed = time;
        }
        if (pathingCacheIJ.openNodesCache.length > 0) {
            openNodes = pathingCacheIJ.openNodesCache;
            cameFrom = pathingCacheIJ.cameFromCache;
            if (cameFrom.has(targetKey)) {
                let nextWaypoint = cameFrom.get(targetKey)!;
                if(nextWaypoint !== null){
                    return { x: nextWaypoint.x * map.tileSize + map.tileSize / 2, y: nextWaypoint.y * map.tileSize + map.tileSize / 2 };
                }else{
                    return null;
                }
            }
        } else {
            pathingCacheIJ.openNodesCache = openNodes;
            pathingCacheIJ.cameFromCache = cameFrom;
            openNodes.push(startIJ);
        }
    } else {
        openNodes.push(startIJ);
    }

    let counter = 0;
    let maxCounter = calculateDistance(startIJ, targetIJ) * 300;
    while (openNodes.length > 0) {
        counter++;
        if (counter > maxCounter) {
            console.log("stoped pathfinding, can cause multiplayer sync loss");
            cameFrom.set(targetKey, null);
            return null
        };

        let currentIndex = 0;
        let currentNode = openNodes.splice(currentIndex, 1)[0]!;

        if (currentNode.x === targetIJ.x && currentNode.y === targetIJ.y) {
            let lastPosition = cameFrom.get(`${targetIJ.x}_${targetIJ.y}`)!;
            if (pathingCacheIJ) openNodes.unshift(currentNode);
            return { x: lastPosition.x * map.tileSize + map.tileSize / 2, y: lastPosition.y * map.tileSize + map.tileSize / 2 };
        }

        let neighborsIJ = getPathNeighborsIJ(currentNode, map, idCounter);
        for (let i = 0; i < neighborsIJ.length; i++) {
            let neighborKey = `${neighborsIJ[i].x}_${neighborsIJ[i].y}`;
            if (!cameFrom.has(neighborKey)) {
                cameFrom.set(neighborKey, currentNode);
                if (!openNodes.find((curr: Position) => curr.x === neighborsIJ[i].x && curr.y === neighborsIJ[i].y)) {
                    openNodes.push(neighborsIJ[i]);
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

function getPathNeighborsIJ(posIJ: Position, map: GameMap, idCounter: IdCounter): Position[] {
    let result: Position[] = [];
    let top, bottom, left, right: boolean = false;

    let tempIJ = { x: posIJ.x, y: posIJ.y - 1 };
    if (!isPositionBlocking({ x: tempIJ.x * map.tileSize, y: tempIJ.y * map.tileSize }, map, idCounter)) {
        top = true;
        result.push(tempIJ);
    }
    tempIJ = { x: posIJ.x, y: posIJ.y + 1 };
    if (!isPositionBlocking({ x: tempIJ.x * map.tileSize, y: tempIJ.y * map.tileSize }, map, idCounter)) {
        bottom = true;
        result.push(tempIJ);
    }
    tempIJ = { x: posIJ.x - 1, y: posIJ.y };
    if (!isPositionBlocking({ x: tempIJ.x * map.tileSize, y: tempIJ.y * map.tileSize }, map, idCounter)) {
        left = true;
        result.push(tempIJ);
    }
    tempIJ = { x: posIJ.x + 1, y: posIJ.y };
    if (!isPositionBlocking({ x: tempIJ.x * map.tileSize, y: tempIJ.y * map.tileSize }, map, idCounter)) {
        right = true;
        result.push(tempIJ);
    }
    if (top && right) {
        tempIJ = { x: posIJ.x + 1, y: posIJ.y - 1 };
        if (!isPositionBlocking({ x: tempIJ.x * map.tileSize, y: tempIJ.y * map.tileSize }, map, idCounter)) {
            result.push(tempIJ);
        }
    }
    if (right && bottom) {
        tempIJ = { x: posIJ.x + 1, y: posIJ.y + 1 };
        if (!isPositionBlocking({ x: tempIJ.x * map.tileSize, y: tempIJ.y * map.tileSize }, map, idCounter)) {
            result.push(tempIJ);
        }
    }
    if (bottom && left) {
        tempIJ = { x: posIJ.x - 1, y: posIJ.y + 1 };
        if (!isPositionBlocking({ x: tempIJ.x * map.tileSize, y: tempIJ.y * map.tileSize }, map, idCounter)) {
            result.push(tempIJ);
        }
    }
    if (left && top) {
        tempIJ = { x: posIJ.x - 1, y: posIJ.y - 1 };
        if (!isPositionBlocking({ x: tempIJ.x * map.tileSize, y: tempIJ.y * map.tileSize }, map, idCounter)) {
            result.push(tempIJ);
        }
    }

    return result;
}

export function calculatePosToTileIJ(pos: Position, map: GameMap): Position {
    let chunkSize = map.tileSize * map.chunkLength;
    let startChunkI = Math.floor(pos.y / chunkSize);
    let startChunkJ = Math.floor(pos.x / chunkSize);
    let tileI = Math.floor((pos.y / map.tileSize) % map.chunkLength);
    if (tileI < 0) tileI += map.chunkLength;
    let tileJ = Math.floor((pos.x / map.tileSize) % map.chunkLength);
    if (tileJ < 0) tileJ += map.chunkLength;

    return {
        x: startChunkJ * map.chunkLength + tileJ,
        y: startChunkI * map.chunkLength + tileI,
    };
}
