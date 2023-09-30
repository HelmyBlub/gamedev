import { IdCounter, Position } from "../../gameModel.js";
import { createMap, findNearNonBlockingPosition, GameMap } from "../../map/map.js";
import { nextRandom, RandomSeed } from "../../randomNumberGenerator.js";
import { calculatePosToTileIJ, getNextWaypoint, PathingCache, PathingCacheIJ, tileIjToPathingCacheKey } from "../pathing.js";

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
    let map: GameMap = createMap();
    let iterations = 3000;
    let numberEnemies = 100;
    let numberPlayers = 2;
    let randomSeed: RandomSeed = { seed: 0 };
    let width = 24 * map.tileSize;
    let height = 12 * map.tileSize;
    let pathingCache = {};
    let idCounter = { nextId: 0 };
    map.seed = 0;

    let sourcePositions = createRandomPositions(numberEnemies, randomSeed, width, height, map, idCounter);
    let targetPositions = createRandomPositions(numberPlayers, randomSeed, width, height, map, idCounter);

    let startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
        getNextWaypoint(sourcePositions[i % numberEnemies], targetPositions[i % numberPlayers], map, pathingCache, idCounter, 0);
    }
    let time = performance.now() - startTime;
    console.log("time", time / iterations, time);
}

function testPathingPerformanceCacheNotChangingResults(ctx: CanvasRenderingContext2D | undefined = undefined) {
    let map: GameMap = createMap();
    let iterations = 6000;
    let numberEnemies = 500;
    let numberPlayers = 1;
    let randomSeed: RandomSeed = { seed: 0 };
    let width = 24 * map.tileSize;
    let height = 12 * map.tileSize;
    let pathingCache: PathingCache = {};
    let idCounter = { nextId: 0 };
    let resultMap: Map<string, { pos: Position | null, pathingCacheIJ: PathingCacheIJ }> = new Map<string, { pos: Position | null, pathingCacheIJ: PathingCacheIJ }>();
    map.seed = 0;

    let sourcePositions = createRandomPositions(numberEnemies, randomSeed, width, height, map, idCounter);
    let targetPositions = createRandomPositions(numberPlayers, randomSeed, width, height, map, idCounter);

    let startTime = performance.now();
    let counter = 0;
    for (let i = 0; i < iterations; i++) {

        if (i % 234 === 0) pathingCache = {};
        let result: Position | null;
        let tempCache: PathingCache;
        let tempSourceTile = calculatePosToTileIJ(sourcePositions[i % numberEnemies], map);
        let tempTargtTile = calculatePosToTileIJ(targetPositions[i % numberPlayers], map);
        let key = `${tempSourceTile.x}_${tempSourceTile.y}|${tempTargtTile.x}_${tempTargtTile.y}`;
        if (i % 3 === 0) {
            tempCache = {};
            result = getNextWaypoint(sourcePositions[i % numberEnemies], targetPositions[i % numberPlayers], map, tempCache, idCounter, 0);
        } else {
            tempCache = pathingCache;
            result = getNextWaypoint(sourcePositions[i % numberEnemies], targetPositions[i % numberPlayers], map, pathingCache, idCounter, 0);
        }
        let resultFromMap = resultMap.get(key);
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
                        let key2 = tileIjToPathingCacheKey(tempTargtTile);
                        let tempPathingCachIJ: PathingCacheIJ = tempCache[key2];
                        paintPathingArrows(ctx, map, tempPathingCachIJ, resultFromMap.pathingCacheIJ, tempTargtTile);
                        debugger;
                        break;
                    }
                }
            }
        } else {
            let key2 = tileIjToPathingCacheKey(tempTargtTile);
            resultMap.set(key, { pos: result, pathingCacheIJ: tempCache[key2] });
        }
    }
    console.log(counter);
    let time = performance.now() - startTime;
}

export function paintPathingArrows(ctx: CanvasRenderingContext2D, map: GameMap, pathingCache1: PathingCacheIJ, pathingCache2: PathingCacheIJ | undefined, targetIJ: Position) {
    let arrowOffsetX = 100;
    let arrowOffsetY = 100;
    let arrowSize = 15;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 800, 800);

    let keys = pathingCache1.cameFromCache.keys();
    for (const key of keys) {
        let sourceTileIJ: Position = { x: parseInt(key.split("_")[0]), y: parseInt(key.split("_")[1]) };
        let targetTileIJ1 = pathingCache1.cameFromCache.get(key);
        canvas_arrow(
            ctx,
            sourceTileIJ.x * arrowSize + arrowOffsetX,
            sourceTileIJ.y * arrowSize + arrowOffsetY,
            targetTileIJ1!.x * arrowSize + arrowOffsetX,
            targetTileIJ1!.y * arrowSize + arrowOffsetY
        );
        if (pathingCache2) {
            let targetTileIJ2 = pathingCache2.cameFromCache.get(key);
            if (targetTileIJ2 !== undefined && (targetTileIJ1!.x !== targetTileIJ2!.x || targetTileIJ1!.y !== targetTileIJ2!.y)) {
                canvas_arrow(
                    ctx,
                    sourceTileIJ.x * arrowSize + arrowOffsetX,
                    sourceTileIJ.y * arrowSize + arrowOffsetY,
                    targetTileIJ2!.x * arrowSize + arrowOffsetX,
                    targetTileIJ2!.y * arrowSize + arrowOffsetY,
                    "blue"
                );
            }
        }
    }
    ctx.fillStyle = "blue";
    ctx.fillRect(targetIJ.x * arrowSize + arrowOffsetX, targetIJ.y * arrowSize + arrowOffsetY, arrowSize*0.5, arrowSize*0.5);
}

function canvas_arrow(ctx: CanvasRenderingContext2D, fromx: number, fromy: number, tox: number, toy: number, color: string = "black") {
    ctx.strokeStyle = color;
    ctx.beginPath();
    var headlen = 10; // length of head in pixels
    var dx = tox - fromx;
    var dy = toy - fromy;
    var angle = Math.atan2(dy, dx);
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
    ctx.closePath();
}

function testPathingNotEndInInfiniteLoop() {
    let idCounter = { nextId: 0 };
    let map: GameMap = createMap();
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
    let pathingCache = {};
    map.seed = 0;

    let sourcePositions: Position[] = [];
    sourcePositions.push({ x: 2 * map.tileSize, y: 2 * map.tileSize });
    sourcePositions.push({ x: 1 * map.tileSize, y: 2 * map.tileSize });

    let targetPosition: Position = { x: 5 * map.tileSize, y: 5 * map.tileSize };

    for (let i = 0; i < sourcePositions.length; i++) {
        getNextWaypoint(sourcePositions[i], targetPosition, map, pathingCache, idCounter, 0);
    }
}

function createRandomPositions(amount: number, randomSeed: RandomSeed, width: number, height: number, map: GameMap, idCounter: IdCounter): Position[] {
    let positions: Position[] = [];
    for (let i = 0; i < amount; i++) {
        let tempPos = { x: nextRandom(randomSeed) * width, y: nextRandom(randomSeed) * height };
        tempPos = findNearNonBlockingPosition(tempPos, map, idCounter);
        positions.push(tempPos);
    }
    return positions;
}