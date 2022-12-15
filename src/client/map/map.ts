import { Position } from "../gameModel.js"
import { createNewChunk } from "./mapGeneration.js";

type MapTiles = {
    [key: number]: MapTile,
}

type MapTile = {
    name: string,
    color?: string,
    imagePath?: string,
    imageRef?: HTMLImageElement,
    blocking: boolean,
}

export let TILE_VALUES: MapTiles = {
    0: { name: "grass", imagePath: "/images/grass.png", blocking: false },
    1: { name: "tree", imagePath: "/images/tree.png", blocking: true },
    2: { name: "rock", imagePath: "/images/rock.png", blocking: true },
}

export type GameMap = {
    seed?: number,
    tileSize: number,
    chunkLength: number,
    chunks: { [chunkId: string]: number[][] },
}

export function createMap(): GameMap {
    return {
        tileSize: 40,
        chunkLength: 8,
        chunks: {},
    }
}

export function isPositionBlocking(pos: Position, map: GameMap) {
    let tile = getMapTile(pos, map);
    if (!tile) return false;
    return tile.blocking;
}

export function findNearNonBlockingPosition(pos: Position, map: GameMap): Position {
    let currentPosition: Position = { x: pos.x, y: pos.y };
    let distance = 1;
    let counterX = -distance;
    let counterY = -distance;
    while (isPositionBlocking(currentPosition, map)) {
        currentPosition.x = pos.x + counterX * map.tileSize;
        currentPosition.y = pos.y + counterY * map.tileSize;
        if(Math.abs(counterY) === distance){
            counterX++;
        }else{
            if (counterX >= distance) {
                counterX = -distance;
                counterY++;
            }else{
                counterX = distance;
            }
        }
    }

    return currentPosition;
}

function getMapTile(pos: Position, map: GameMap): MapTile {
    let chunkSize = map.tileSize * map.chunkLength;
    let chunkI = Math.floor(pos.y / chunkSize);
    let chunkJ = Math.floor(pos.x / chunkSize);
    let chunk = map.chunks[`${chunkI}_${chunkJ}`];
    if(chunk === undefined){
        chunk = createNewChunk(map.chunkLength, chunkI, chunkJ, map.seed!);
    }

    if (chunk) {
        let i = Math.floor((pos.y / map.tileSize) % map.chunkLength);
        if (i < 0) i += map.chunkLength;
        let j = Math.floor((pos.x / map.tileSize) % map.chunkLength);
        if (j < 0) j += map.chunkLength;
        if (i >= 0 && j >= 0 && chunk.length > i && chunk[i].length > j) {
            return TILE_VALUES[chunk[i][j]];
        } else {
            console.log("invalid chunk", i, j, chunk);
        }
    }

    return TILE_VALUES[0];
}