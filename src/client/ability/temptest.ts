import { Position } from "../gameModel.js"
import { createMap, getChunksTouchingLine } from "../map/map.js";

export function testTemp(){
    let map = createMap();
    let lineStart: Position = {x: 61.659379566433984, y: 307.76702730475927}
    let lineEnd: Position = {x: 0.6593795664339837, y: 320.76702730475927}

    getChunksTouchingLine(map, lineStart, lineEnd);
}