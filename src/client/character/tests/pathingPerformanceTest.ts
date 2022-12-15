import { createMap, findNearNonBlockingPosition, GameMap } from "../../map/map.js";
import { getNextWaypoint } from "../pathing.js";


// time on 15.12.2022: 3427.29ms, 4000 iterations
export function testPathingPerformance() {
    let map: GameMap = createMap();
    map.seed = 0;

    let sourcePosition = { x: 1 * map.tileSize, y: 1 * map.tileSize};
    let targetPosition = { x: 12 * map.tileSize, y: 6 * map.tileSize};
    sourcePosition = findNearNonBlockingPosition(sourcePosition, map);
    targetPosition = findNearNonBlockingPosition(targetPosition, map);

    let startTime = performance.now();
    for(let i = 0; i < 4000; i++){
        getNextWaypoint(sourcePosition, targetPosition, map);
    }
    let time = performance.now() - startTime;
    console.log("time", time);
}