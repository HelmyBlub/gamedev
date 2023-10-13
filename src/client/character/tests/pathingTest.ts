import { IdCounter, Position } from "../../gameModel.js";
import { createMap, findNearNonBlockingPosition, GameMap } from "../../map/map.js";
import { nextRandom, RandomSeed } from "../../randomNumberGenerator.js";
import { calculatePosToTotalTileXY, getNextWaypoint, PathingCache, PathingCacheXY, tileXyToPathingCacheKey } from "../pathing.js";

export function testPathing(ctx: CanvasRenderingContext2D | undefined = undefined) {
    console.log("started test");
    testPathingNotEndInInfiniteLoop();
    testPathingPerformance();
    testPathingPerformanceCacheNotChangingResults(ctx);
    console.log("finished test");
}

// time 0.33556666666672874 1006.7000000001863
// time 0.2317333333332402 695.1999999997206, with diagonal routing
// time 0.2614000000000621 784.2000000001863, reversed routing
// time 0.2620333333335196 786.1000000005588, reversed + removed one map
// time 0.0005 1.5 with caching
// time 0.0023666666665424904 7.099999999627471 after putting cache into a type and as function parameter
function testPathingPerformance() {
    const map: GameMap = createMap();
    const iterations = 3000;
    const numberEnemies = 100;
    const numberPlayers = 2;
    const randomSeed: RandomSeed = { seed: 0 };
    const width = 24 * map.tileSize;
    const height = 12 * map.tileSize;
    const pathingCache = {};
    const idCounter = { nextId: 0 };
    map.seed = 0;

    const sourcePositions = createRandomPositions(numberEnemies, randomSeed, width, height, map, idCounter);
    const targetPositions = createRandomPositions(numberPlayers, randomSeed, width, height, map, idCounter);

    const startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
        getNextWaypoint(sourcePositions[i % numberEnemies], targetPositions[i % numberPlayers], map, pathingCache, idCounter, 0);
    }
    const time = performance.now() - startTime;
    console.log("time", time / iterations, time);
}

function testPathingPerformanceCacheNotChangingResults(ctx: CanvasRenderingContext2D | undefined = undefined) {
    const map: GameMap = createMap();
    const iterations = 6000;
    const numberEnemies = 500;
    const numberPlayers = 1;
    const randomSeed: RandomSeed = { seed: 0 };
    const width = 24 * map.tileSize;
    const height = 12 * map.tileSize;
    let pathingCache: PathingCache = {};
    const idCounter = { nextId: 0 };
    const resultMap: Map<string, { pos: Position | null, pathingCacheXY: PathingCacheXY }> = new Map<string, { pos: Position | null, pathingCacheXY: PathingCacheXY }>();
    map.seed = 0;

    const sourcePositions = createRandomPositions(numberEnemies, randomSeed, width, height, map, idCounter);
    const targetPositions = createRandomPositions(numberPlayers, randomSeed, width, height, map, idCounter);

    const startTime = performance.now();
    let counter = 0;
    for (let i = 0; i < iterations; i++) {

        if (i % 234 === 0) pathingCache = {};
        let result: Position | null;
        let tempCache: PathingCache;
        const tempSourceTile = calculatePosToTotalTileXY(sourcePositions[i % numberEnemies], map);
        const tempTargtTile = calculatePosToTotalTileXY(targetPositions[i % numberPlayers], map);
        let key = `${tempSourceTile.x}_${tempSourceTile.y}|${tempTargtTile.x}_${tempTargtTile.y}`;
        if (i % 3 === 0) {
            tempCache = {};
            result = getNextWaypoint(sourcePositions[i % numberEnemies], targetPositions[i % numberPlayers], map, tempCache, idCounter, 0);
        } else {
            tempCache = pathingCache;
            result = getNextWaypoint(sourcePositions[i % numberEnemies], targetPositions[i % numberPlayers], map, pathingCache, idCounter, 0);
        }
        const resultFromMap = resultMap.get(key);
        if (resultFromMap !== undefined) {
            if (resultFromMap === null) {
                if (result !== null) {
                    console.log("oh no", result, resultFromMap);
                }
            } else if (result !== null) {
                counter++;
                if (result.x !== resultFromMap.pos!.x || result.y !== resultFromMap.pos!.y) {
                    console.log("oh no", i, key, result, resultFromMap, sourcePositions[i % numberEnemies], targetPositions[i % numberPlayers], pathingCache);
                    if (ctx) {
                        const key2 = tileXyToPathingCacheKey(tempTargtTile);
                        const tempPathingCachXY: PathingCacheXY = tempCache[key2];
                        paintPathingArrows(ctx, map, tempPathingCachXY, resultFromMap.pathingCacheXY, tempTargtTile);
                        debugger;
                        break;
                    }
                }
            }
        } else {
            const key2 = tileXyToPathingCacheKey(tempTargtTile);
            resultMap.set(key, { pos: result, pathingCacheXY: tempCache[key2] });
        }
    }
    console.log(counter);
}

export function paintPathingArrows(ctx: CanvasRenderingContext2D, map: GameMap, pathingCache1: PathingCacheXY, pathingCache2: PathingCacheXY | undefined, targetXY: Position) {
    const arrowOffsetX = 100;
    const arrowOffsetY = 100;
    const arrowSize = 15;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 800, 800);

    const keys = pathingCache1.cameFromCache.keys();
    for (const key of keys) {
        const sourceTileXY: Position = { x: parseInt(key.split("_")[0]), y: parseInt(key.split("_")[1]) };
        const targetTileXY1 = pathingCache1.cameFromCache.get(key);
        canvas_arrow(
            ctx,
            sourceTileXY.x * arrowSize + arrowOffsetX,
            sourceTileXY.y * arrowSize + arrowOffsetY,
            targetTileXY1!.x * arrowSize + arrowOffsetX,
            targetTileXY1!.y * arrowSize + arrowOffsetY
        );
        if (pathingCache2) {
            const targetTileXY2 = pathingCache2.cameFromCache.get(key);
            if (targetTileXY2 !== undefined && (targetTileXY1!.x !== targetTileXY2!.x || targetTileXY1!.y !== targetTileXY2!.y)) {
                canvas_arrow(
                    ctx,
                    sourceTileXY.x * arrowSize + arrowOffsetX,
                    sourceTileXY.y * arrowSize + arrowOffsetY,
                    targetTileXY2!.x * arrowSize + arrowOffsetX,
                    targetTileXY2!.y * arrowSize + arrowOffsetY,
                    "blue"
                );
            }
        }
    }
    ctx.fillStyle = "blue";
    ctx.fillRect(targetXY.x * arrowSize + arrowOffsetX, targetXY.y * arrowSize + arrowOffsetY, arrowSize * 0.5, arrowSize * 0.5);
}

function canvas_arrow(ctx: CanvasRenderingContext2D, fromx: number, fromy: number, tox: number, toy: number, color: string = "black") {
    ctx.strokeStyle = color;
    ctx.beginPath();
    const headlen = 10; // length of head in pixels
    const dx = tox - fromx;
    const dy = toy - fromy;
    const angle = Math.atan2(dy, dx);
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
    ctx.closePath();
}

function testPathingNotEndInInfiniteLoop() {
    const idCounter = { nextId: 0 };
    const map: GameMap = createMap();
    map.chunks["0_0"] = { tiles: [], characters: [], objects: [] };
    map.chunks["0_0"].tiles = [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [1, 1, 0, 0, 0, 0, 0, 0],
        [1, 0, 0, 0, 0, 0, 0, 0],
        [1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0]
    ];
    const pathingCache = {};
    map.seed = 0;

    const sourcePositions: Position[] = [];
    sourcePositions.push({ x: 2 * map.tileSize, y: 2 * map.tileSize });
    sourcePositions.push({ x: 1 * map.tileSize, y: 2 * map.tileSize });

    const targetPosition: Position = { x: 5 * map.tileSize, y: 5 * map.tileSize };

    for (let i = 0; i < sourcePositions.length; i++) {
        getNextWaypoint(sourcePositions[i], targetPosition, map, pathingCache, idCounter, 0);
    }
}

function createRandomPositions(amount: number, randomSeed: RandomSeed, width: number, height: number, map: GameMap, idCounter: IdCounter): Position[] {
    const positions: Position[] = [];
    for (let i = 0; i < amount; i++) {
        let tempPos = { x: nextRandom(randomSeed) * width, y: nextRandom(randomSeed) * height };
        tempPos = findNearNonBlockingPosition(tempPos, map, idCounter);
        positions.push(tempPos);
    }
    return positions;
}