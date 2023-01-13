import { calculateDistance } from "../game.js";
import { IdCounter, Position } from "../gameModel.js";
import { GameMap, isPositionBlocking } from "../map/map.js";

export type PathingCache = {
    cameFromCache: Map<string, Map<string, Position>>,
    openNodesCache: Map<string, Position[]>,
    alreadyTraveledDistanceCache: Map<string, Map<string, number>>,
}

export function createPathingCache(): PathingCache{
    return {
        cameFromCache: new Map<string, Map<string, Position>>(),
        openNodesCache: new Map<string, Position[]>(),
        alreadyTraveledDistanceCache: new Map<string, Map<string, number>>()
    }
}

export function getNextWaypoint(
    sourcePos: Position,
    targetPos: Position,
    map: GameMap,
    pathingCache: PathingCache | null = null,
    idCounter: IdCounter
): Position | null {
    if(isPositionBlocking(sourcePos, map, idCounter)){
        throw new Error("can't find way to a blocking position");
    }
    let targetIJ: Position = calculatePosToTileIJ(sourcePos, map);
    let startIJ: Position = calculatePosToTileIJ(targetPos, map);
    if (startIJ.x === targetIJ.x && startIJ.y === targetIJ.y) {
        return targetPos;
    }

    let openNodes: Position[] = [];
    let cameFrom: Map<string, Position> = new Map<string, Position>();
    let alreadyTraveledDistance: Map<string, number> = new Map<string, number>();
    alreadyTraveledDistance.set(`${startIJ.x}_${startIJ.y}`, 0);

    let startKey = `${startIJ.x}_${startIJ.y}`;
    let targetKey = `${targetIJ.x}_${targetIJ.y}`;
    if (pathingCache !== null){
        if (pathingCache.openNodesCache.has(startKey)) {
            openNodes = pathingCache.openNodesCache.get(startKey)!;
            cameFrom = pathingCache.cameFromCache.get(startKey)!;
            alreadyTraveledDistance = pathingCache.alreadyTraveledDistanceCache.get(startKey)!;
            if (cameFrom.has(targetKey)) {
                let lastPosition = cameFrom.get(targetKey)!;
                return { x: lastPosition.x * map.tileSize + map.tileSize / 2, y: lastPosition.y * map.tileSize + map.tileSize / 2 };
            }
        } else {
            pathingCache.openNodesCache.set(startKey, openNodes);
            pathingCache.cameFromCache.set(startKey, cameFrom);
            pathingCache.alreadyTraveledDistanceCache.set(startKey, alreadyTraveledDistance);
            openNodes.push(startIJ);
        }
    }else{
        openNodes.push(startIJ);
    }

    let counter = 0;
    let maxCounter = calculateDistance(startIJ, targetIJ) * 10;
    while (openNodes.length > 0) {
        counter++;
        if(counter > maxCounter) return null;

        let currentLowestValue = -1;
        let currentIndex = -1;
        for (let i = 0; i < openNodes.length; i++) {
            let currKey = `${openNodes[i].x}_${openNodes[i].y}`;
            let bestEstimatedTotalDistance = alreadyTraveledDistance.get(currKey)! + calculateDistance(openNodes[i], targetIJ);
            if (currentIndex === -1 || bestEstimatedTotalDistance < currentLowestValue) {
                currentLowestValue = bestEstimatedTotalDistance;
                currentIndex = i;
            }
        }
        let currentNode = openNodes.splice(currentIndex, 1)[0]!;

        if (currentNode.x === targetIJ.x && currentNode.y === targetIJ.y) {
            let lastPosition = cameFrom.get(`${targetIJ.x}_${targetIJ.y}`)!;
            if(pathingCache !== null) openNodes.push(currentNode);
            return { x: lastPosition.x * map.tileSize + map.tileSize / 2, y: lastPosition.y * map.tileSize + map.tileSize / 2 };
        }

        let neighborsIJ = getPathNeighborsIJ(currentNode, map, idCounter);
        for (let i = 0; i < neighborsIJ.length; i++) {
            let currentNodKey: string = `${currentNode.x}_${currentNode.y}`;
            let neighborKey = `${neighborsIJ[i].x}_${neighborsIJ[i].y}`;
            let tentativeScore = alreadyTraveledDistance.get(currentNodKey)! + calculateDistance(neighborsIJ[i], currentNode);

            if (!alreadyTraveledDistance.has(neighborKey) || tentativeScore < alreadyTraveledDistance.get(neighborKey)!) {
                cameFrom.set(neighborKey, currentNode);
                alreadyTraveledDistance.set(neighborKey, tentativeScore);
                if (!openNodes.find((curr: Position) => curr.x === neighborsIJ[i].x && curr.y === neighborsIJ[i].y)) {
                    openNodes.push(neighborsIJ[i]);
                }
            }
        }
    }

    return null;
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

function calculatePosToTileIJ(pos: Position, map: GameMap): Position {
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
