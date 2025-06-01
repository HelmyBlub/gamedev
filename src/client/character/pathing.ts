import { calculateDistance, takeTimeMeasure } from "../game.js";
import { Game, IdCounter, Position } from "../gameModel.js";
import { chunkXYToMapKey, GameMap, isPositionBlocking, MapChunk, positionToGameMapTileXY, TILE_VALUES } from "../map/map.js";

export type PathingCacheXY = {
    cameFromCache: Map<string, Position | null>,
    openNodesCache: Position[],
    alreadyTraveledDistanceCache: Map<string, number>,
    timeLastUsed: number,
}

export type PathingCache = {
    [tileXyKey: string]: PathingCacheXY,
}

export type GraphRectangle = {
    topLeftTileXY: Position,
    width: number,
    height: number,
    connections: GraphRectangle[],
}

export function chunkGraphRectangleSetup(chunkXY: Position, game: Game) {
    const chunkKey = chunkXYToMapKey(chunkXY.x, chunkXY.y);
    const chunk = game.state.map.chunks[chunkKey];
    const result: GraphRectangle[] = [];
    const chunkLength = chunk.tiles.length;
    const usedTiles: boolean[][] = Array.from({ length: chunkLength }, () => Array(chunkLength).fill(false));
    for (let x = 0; x < chunkLength; x++) {
        for (let y = 0; y < chunkLength; y++) {
            if (usedTiles[x][y] === false && !TILE_VALUES[chunk.tiles[x][y]].blocking) {
                let width = 1;
                let height = 1;
                while (x + width < chunkLength && usedTiles[x + width][y] === false && !TILE_VALUES[chunk.tiles[x + width][y]].blocking) {
                    width++;
                }

                yWhile: while (y + height < chunkLength) {
                    for (let tempX = x; tempX < x + width; tempX++) {
                        if (usedTiles[tempX][y + height] === true || TILE_VALUES[chunk.tiles[tempX][y + height]].blocking) {
                            break yWhile;
                        }
                    }
                    height++;
                }
                const newRectanlge: GraphRectangle = { topLeftTileXY: { x: x + chunkXY.x * chunkLength, y: y + chunkXY.y * chunkLength }, connections: [], height, width };
                for (let newX = x; newX < x + width; newX++) {
                    for (let newY = y; newY < y + height; newY++) {
                        usedTiles[newX][newY] = true;
                    }
                }
                result.push(newRectanlge);
            }
        }
    }
    // connect rectangles in chunk
    for (let rec1Index = 0; rec1Index < result.length; rec1Index++) {
        for (let rec2Index = rec1Index + 1; rec2Index < result.length; rec2Index++) {
            const rec1 = result[rec1Index];
            const rec2 = result[rec2Index];
            if (areGraphRectanglesTouching(rec1, rec2)) {
                rec1.connections.push(rec2);
                rec2.connections.push(rec1);
            }
        }
    }
    //check adjacent chunks
    const adjacentChunkKeys = [
        chunkXYToMapKey(chunkXY.x - 1, chunkXY.y),
        chunkXYToMapKey(chunkXY.x + 1, chunkXY.y),
        chunkXYToMapKey(chunkXY.x, chunkXY.y - 1),
        chunkXYToMapKey(chunkXY.x, chunkXY.y + 1),
    ];
    for (let adjacentKey of adjacentChunkKeys) {
        const adjacentChunkGraphRectanlges = game.performance.chunkGraphRectangles[adjacentKey];
        if (!adjacentChunkGraphRectanlges) continue;
        for (let rec1Index = 0; rec1Index < result.length; rec1Index++) {
            for (let rec2Index = 0; rec2Index < adjacentChunkGraphRectanlges.length; rec2Index++) {
                const rec1 = result[rec1Index];
                const rec2 = adjacentChunkGraphRectanlges[rec2Index];
                if (areGraphRectanglesTouching(rec1, rec2)) {
                    rec1.connections.push(rec2);
                    rec2.connections.push(rec1);
                }
            }
        }
    }
    // clean up old
    const oldGraphRec = game.performance.chunkGraphRectangles[chunkKey];
    if (oldGraphRec) {
        for (let adjacentKey of adjacentChunkKeys) {
            const adjacentChunkGraphRectanlges = game.performance.chunkGraphRectangles[adjacentKey];
            if (!adjacentChunkGraphRectanlges) continue;
            for (let rec1Index = 0; rec1Index < adjacentChunkGraphRectanlges.length; rec1Index++) {
                for (let rec2Index = 0; rec2Index < oldGraphRec.length; rec2Index++) {
                    const rec1 = adjacentChunkGraphRectanlges[rec1Index];
                    const rec2 = oldGraphRec[rec2Index];
                    if (areGraphRectanglesTouching(rec1, rec2)) {
                        conLoop: for (let connIndex1 = 0; connIndex1 < rec1.connections.length; connIndex1++) {
                            for (let connIndex2 = 0; connIndex2 < rec2.connections.length; connIndex2++) {
                                if (rec1.connections[connIndex1] === rec2.connections[connIndex2]) {
                                    rec1.connections.splice(connIndex1, 1);
                                    break conLoop;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    game.performance.chunkGraphRectangles[chunkKey] = result;
    return result;
}

function areGraphRectanglesTouching(rec1: GraphRectangle, rec2: GraphRectangle): boolean {
    if (rec1.topLeftTileXY.x <= rec2.topLeftTileXY.x + rec2.width && rec1.topLeftTileXY.x + rec1.width >= rec2.topLeftTileXY.x
        && rec1.topLeftTileXY.y <= rec2.topLeftTileXY.y + rec2.height && rec1.topLeftTileXY.y + rec1.height >= rec2.topLeftTileXY.y
    ) {
        if ((rec1.topLeftTileXY.x < rec2.topLeftTileXY.x + rec2.width && rec1.topLeftTileXY.x + rec1.width > rec2.topLeftTileXY.x)
            !== (rec1.topLeftTileXY.y < rec2.topLeftTileXY.y + rec2.height && rec1.topLeftTileXY.y + rec1.height > rec2.topLeftTileXY.y)
        ) {
            return true;
        }
    }
    return false;
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
    if (isPositionBlocking(sourcePos, map, idCounter, game) || isPositionBlocking(targetPos, map, idCounter, game)) {
        console.log("can't find way to a blocking position");
        return null;
    }
    const targetXY: Position = positionToGameMapTileXY(map, sourcePos);
    const startXY: Position = positionToGameMapTileXY(map, targetPos);
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
