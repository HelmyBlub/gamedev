import { calculateDistance, takeTimeMeasure } from "../game.js";
import { Game, IdCounter, Position } from "../gameModel.js";
import { ChunkXY, chunkXYToMapKey, GameMap, isPositionBlocking, positionToChunkXY, TILE_VALUES, tileXYToChunkXY } from "../map/map.js";

export type PathingCacheXY = {
    cameFromCache: Map<string, GraphRectangle | null>,
    openNodesCache: GraphRectangle[],
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

export function chunkGraphRectangleSetup(chunkXY: ChunkXY, game: Game) {
    const chunkKey = chunkXYToMapKey(chunkXY.chunkX, chunkXY.chunkY);
    const chunk = game.state.map.chunks[chunkKey];
    if (chunk === undefined) return;
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
                const newRectanlge: GraphRectangle = { topLeftTileXY: { x: x + chunkXY.chunkX * chunkLength, y: y + chunkXY.chunkY * chunkLength }, connections: [], height, width };
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
        chunkXYToMapKey(chunkXY.chunkX - 1, chunkXY.chunkY),
        chunkXYToMapKey(chunkXY.chunkX + 1, chunkXY.chunkY),
        chunkXYToMapKey(chunkXY.chunkX, chunkXY.chunkY - 1),
        chunkXYToMapKey(chunkXY.chunkX, chunkXY.chunkY + 1),
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
        cameFromCache: new Map<string, GraphRectangle | null>(),
        openNodesCache: [],
        timeLastUsed: timeLastUsed
    }
}

export function positionToPathingCacheKey(pos: Position) {
    return pos.x + "_" + pos.y;
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
    pathingCache: PathingCache | null = null,
    time: number,
    game: Game,
): Position | null {
    const targetGraphRectangle = getGraphRectangleForPosition(sourcePos, game);
    const startGraphRectangle = getGraphRectangleForPosition(targetPos, game);
    if (!targetGraphRectangle || !startGraphRectangle) {
        console.log("can't find way to a blocking position");
        return null;
    }
    const maxDistance = 50 * game.state.map.tileSize;
    const straightDistance = calculateDistance(sourcePos, targetPos);
    if (straightDistance > maxDistance) {
        console.log("pathing to big distance too far away");
        return null;
    }
    if (targetGraphRectangle === startGraphRectangle) {
        return targetPos;
    }

    let openNodes: GraphRectangle[] = [];
    let cameFrom: Map<string, GraphRectangle | null> = new Map<string, GraphRectangle | null>();

    const targetKey = positionToPathingCacheKey(targetGraphRectangle.topLeftTileXY);
    let pathingCacheXY: PathingCacheXY | undefined;
    if (pathingCache !== null) {
        const pathingKey = positionToPathingCacheKey(startGraphRectangle.topLeftTileXY);
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
                    return getMovePositionBetweenTwoGraphRectangles(sourcePos, targetGraphRectangle, nextWaypoint, game.state.map.tileSize);
                } else {
                    return null;
                }
            }
        } else {
            pathingCacheXY.openNodesCache = openNodes;
            pathingCacheXY.cameFromCache = cameFrom;
            openNodes.push(startGraphRectangle);
        }
    } else {
        openNodes.push(startGraphRectangle);
    }

    let counter = 0;
    const maxCounter = straightDistance * 300;
    while (openNodes.length > 0) {
        counter++;
        if (counter > maxCounter || isNaN(maxCounter)) {
            console.log("stoped pathfinding, can cause multiplayer sync loss");
            cameFrom.set(targetKey, null);
            return null
        };

        const currentNode = openNodes.splice(0, 1)[0]!;

        if (currentNode === targetGraphRectangle) {
            const lastGraphRectangle = cameFrom.get(targetKey)!;
            if (pathingCacheXY) openNodes.unshift(currentNode);
            return getMovePositionBetweenTwoGraphRectangles(sourcePos, targetGraphRectangle, lastGraphRectangle, game.state.map.tileSize);
        }

        checkIfNeighourPathingExistsAndCreateIfNot(currentNode.topLeftTileXY, game);
        const neighborsGraphs = currentNode.connections;
        for (let i = 0; i < neighborsGraphs.length; i++) {
            const neighborKey = positionToPathingCacheKey(neighborsGraphs[i].topLeftTileXY);
            if (!cameFrom.has(neighborKey)) {
                cameFrom.set(neighborKey, currentNode);
                if (!openNodes.find((curr: GraphRectangle) => curr === neighborsGraphs[i])) {
                    openNodes.push(neighborsGraphs[i]);
                }
            }
        }
    }

    return null;
}

function checkIfNeighourPathingExistsAndCreateIfNot(tileXY: Position, game: Game) {
    if (!game.performance.incompleteChunkGraphRectangles) return;
    const chunkXY = tileXYToChunkXY(tileXY, game.state.map);

    const chunkNeighbors: ChunkXY[] = [
        { chunkX: chunkXY.chunkX - 1, chunkY: chunkXY.chunkY },
        { chunkX: chunkXY.chunkX + 1, chunkY: chunkXY.chunkY },
        { chunkX: chunkXY.chunkX, chunkY: chunkXY.chunkY - 1 },
        { chunkX: chunkXY.chunkX, chunkY: chunkXY.chunkY + 1 },
    ];

    for (let neighbor of chunkNeighbors) {
        const key = chunkXYToMapKey(neighbor.chunkX, neighbor.chunkY);
        if (game.performance.chunkGraphRectangles[key] == undefined) {
            chunkGraphRectangleSetup(neighbor, game);
        }
    }
}

function getMovePositionBetweenTwoGraphRectangles(entityPos: Position, rec1: GraphRectangle, rec2: GraphRectangle, tileSize: number): Position {
    if (rec1.topLeftTileXY.x < rec2.topLeftTileXY.x + rec2.width && rec1.topLeftTileXY.x + rec1.width > rec2.topLeftTileXY.x) {
        let posY = rec1.topLeftTileXY.y === rec2.topLeftTileXY.y + rec2.height ? rec1.topLeftTileXY.y * tileSize : rec2.topLeftTileXY.y * tileSize;
        if (rec1.topLeftTileXY.y < rec2.topLeftTileXY.y) posY += 0.1; else posY -= 0.1;

        const leftX = Math.max(rec1.topLeftTileXY.x, rec2.topLeftTileXY.x) * tileSize;
        const rightX = Math.min(rec1.topLeftTileXY.x + rec1.width, rec2.topLeftTileXY.x + rec2.width) * tileSize;
        if (entityPos.x < leftX + tileSize / 4) {
            return { x: leftX + tileSize / 4, y: posY };
        } else if (entityPos.x > rightX - tileSize / 4) {
            return { x: rightX - tileSize / 4, y: posY };
        } else {
            return { x: entityPos.x, y: posY };
        }
    } else {
        let posX = rec1.topLeftTileXY.x === rec2.topLeftTileXY.x + rec2.width ? rec1.topLeftTileXY.x * tileSize : rec2.topLeftTileXY.x * tileSize;
        if (rec1.topLeftTileXY.x < rec2.topLeftTileXY.x) posX += 0.1; else posX -= 0.1;
        const topY = Math.max(rec1.topLeftTileXY.y, rec2.topLeftTileXY.y) * tileSize;
        const bottomY = Math.min(rec1.topLeftTileXY.y + rec1.height, rec2.topLeftTileXY.y + rec2.height) * tileSize;
        if (entityPos.y < topY + tileSize / 4) {
            return { x: posX, y: topY + tileSize / 4 };
        } else if (entityPos.y > bottomY - tileSize / 4) {
            return { x: posX, y: bottomY - tileSize / 4 };
        } else {
            return { x: posX, y: entityPos.y };
        }
    }
}

function getGraphRectangleForPosition(position: Position, game: Game): GraphRectangle | undefined {
    const tileSize = game.state.map.tileSize;
    const posChunkXY = positionToChunkXY(position, game.state.map);
    const posChunkKey = chunkXYToMapKey(posChunkXY.chunkX, posChunkXY.chunkY);
    let posChunkRectangles = game.performance.chunkGraphRectangles[posChunkKey];
    if (game.performance.incompleteChunkGraphRectangles && posChunkRectangles == undefined) {
        const graphRectangles = chunkGraphRectangleSetup(posChunkXY, game);
        if (graphRectangles) posChunkRectangles = graphRectangles; else return undefined;
    }
    for (let rectangle of posChunkRectangles) {
        if (rectangle.topLeftTileXY.x * tileSize <= position.x && (rectangle.topLeftTileXY.x + rectangle.width) * tileSize > position.x
            && rectangle.topLeftTileXY.y * tileSize <= position.y && (rectangle.topLeftTileXY.y + rectangle.height) * tileSize > position.y
        ) {
            return rectangle;
        }
    }
    return undefined;
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
