import { calculateDistance } from "../game.js";
import { Position } from "../gameModel.js";
import { GameMap, isPositionBlocking } from "../map/map.js";

export function getNextWaypoint(sourcePos: Position, targetPos: Position, map: GameMap): Position | null {
    let openNodes: Position[] = [];
    let targetIJ: Position = calculatePosToTileIJ(targetPos, map);
    let startIJ: Position = calculatePosToTileIJ(sourcePos, map);
    let cameFrom: Map<string, Position> = new Map<string, Position>();
    let gScore: Map<string, number> = new Map<string, number>();
    gScore.set(`${startIJ.x}_${startIJ.y}`, 0);
    let fScore: Map<string, number> = new Map<string, number>();
    fScore.set(`${startIJ.x}_${startIJ.y}`, calculateDistance(startIJ, targetIJ));

    openNodes.push(startIJ);

    while (openNodes.length > 0) {
        let currentLowestValue = -1;
        let currentIndex = -1;
        for (let i = 0; i < openNodes.length; i++) {
            let currKey = `${openNodes[i].x}_${openNodes[i].y}`;
            if (currentIndex === -1 || fScore.get(currKey)! < currentLowestValue) {
                currentLowestValue = fScore.get(currKey)!;
                currentIndex = i;
            }
        }
        let currentNode = openNodes.splice(currentIndex, 1)[0]!;

        if (currentNode.x === targetIJ.x && currentNode.y === targetIJ.y) {
            let lastPosition = reconstruct_path(cameFrom, currentNode);
            if (lastPosition.x === targetIJ.x && lastPosition.y === targetIJ.y) {
                return targetPos;
            } else {
                return { x: lastPosition.x * map.tileSize + map.tileSize / 2, y: lastPosition.y * map.tileSize + map.tileSize / 2 };
            }
        }

        let neighborsIJ = getPathNeighborsIJ(currentNode, map);
        for (let i = 0; i < neighborsIJ.length; i++) {
            let currentNodKey: string = `${currentNode.x}_${currentNode.y}`;
            let neighborKey = `${neighborsIJ[i].x}_${neighborsIJ[i].y}`;
            let tentativeScore = gScore.get(currentNodKey)! + calculateDistance(neighborsIJ[i], currentNode);

            if (!gScore.has(neighborKey) || tentativeScore < gScore.get(neighborKey)!) {
                cameFrom.set(neighborKey, currentNode);
                gScore.set(neighborKey, tentativeScore);
                fScore.set(neighborKey, tentativeScore + calculateDistance(neighborsIJ[i], targetIJ));
                if (!openNodes.find((curr: Position) => curr.x === neighborsIJ[i].x && curr.y === neighborsIJ[i].y)) {
                    openNodes.push(neighborsIJ[i]);
                }
            }
        }
    }

    return null;
}

function getPathNeighborsIJ(posIJ: Position, map: GameMap): Position[] {
    let result: Position[] = [];

    let tempIJ = { x: posIJ.x, y: posIJ.y - 1 };
    if (!isPositionBlocking({ x: tempIJ.x * map.tileSize, y: tempIJ.y * map.tileSize }, map)) {
        result.push(tempIJ);
    }
    tempIJ = { x: posIJ.x, y: posIJ.y + 1 };
    if (!isPositionBlocking({ x: tempIJ.x * map.tileSize, y: tempIJ.y * map.tileSize }, map)) {
        result.push(tempIJ);
    }
    tempIJ = { x: posIJ.x - 1, y: posIJ.y };
    if (!isPositionBlocking({ x: tempIJ.x * map.tileSize, y: tempIJ.y * map.tileSize }, map)) {
        result.push(tempIJ);
    }
    tempIJ = { x: posIJ.x + 1, y: posIJ.y };
    if (!isPositionBlocking({ x: tempIJ.x * map.tileSize, y: tempIJ.y * map.tileSize }, map)) {
        result.push(tempIJ);
    }

    return result;
}

function reconstruct_path(cameFrom: Map<string, Position>, current: Position) {
    let second: Position = current;
    let last: Position = current;
    while (cameFrom.has(`${last.x}_${last.y}`)) {
        second = last;
        last = cameFrom.get(`${last.x}_${last.y}`)!;
    }
    return second
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
