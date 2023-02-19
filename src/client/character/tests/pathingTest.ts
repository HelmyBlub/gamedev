import { IdCounter, Position } from "../../gameModel.js";
import { createMap, findNearNonBlockingPosition, GameMap } from "../../map/map.js";
import { nextRandom, RandomSeed } from "../../randomNumberGenerator.js";
import { getNextWaypoint } from "../pathing.js";

export function testPathing() {
    console.log("started test");
    testPathingNotEndInInfiniteLoop();
    testPathingPerformance();
    testPathingPerformanceCacheNotChangingResults();
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
        getNextWaypoint(sourcePositions[i % numberEnemies], targetPositions[i % numberPlayers], map, pathingCache, idCounter);
    }
    let time = performance.now() - startTime;
    console.log("time", time / iterations, time);
}

function testPathingPerformanceCacheNotChangingResults() {
    let map: GameMap = createMap();
    let iterations = 3000;
    let numberEnemies = 100;
    let numberPlayers = 2;
    let randomSeed: RandomSeed = { seed: 0 };
    let width = 24 * map.tileSize;
    let height = 12 * map.tileSize;
    let pathingCache = {};
    let idCounter = { nextId: 0 };
    let resultMap: Map<string, Position | null> = new Map<string, Position | null>();
    map.seed = 0;

    let sourcePositions = createRandomPositions(numberEnemies, randomSeed, width, height, map, idCounter);
    let targetPositions = createRandomPositions(numberPlayers, randomSeed, width, height, map, idCounter);

    let startTime = performance.now();
    for (let i = 0; i < iterations; i++) {

        let result;
        if(i % 3 === 0){
            result = getNextWaypoint(sourcePositions[i % numberEnemies], targetPositions[i % numberPlayers], map, null, idCounter);
        }else{
            result = getNextWaypoint(sourcePositions[i % numberEnemies], targetPositions[i % numberPlayers], map, pathingCache, idCounter);
        }
        let key = (i % numberEnemies) + "_" + i % numberPlayers;
        let resultFromMap = resultMap.get(key);
        if(resultFromMap !== undefined){
            if(resultFromMap === null){
                if(result !== null){
                    console.log("oh no", result, resultFromMap);
                }
            }else if(result !== null){
                if(result.x !== resultFromMap.x || result.y !== resultFromMap.y){
                    console.log("oh no", result, resultFromMap, sourcePositions[i % numberEnemies], targetPositions[i % numberPlayers], pathingCache);
                }
            }
        }else{
            resultMap.set(key, result);
        }
    }
    let time = performance.now() - startTime;
}

function testPathingNotEndInInfiniteLoop() {
    let idCounter = { nextId: 0 };
    let map: GameMap = createMap();
    map.chunks["0_0"] = {tiles:[], characters:[]};
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
        getNextWaypoint(sourcePositions[i], targetPosition, map, pathingCache, idCounter);
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