import { createFixPositionRespawnEnemies } from "../character/enemy/fixPositionRespawnEnemy.js";
import { IdCounter } from "../gameModel.js";
import { GameMap, MapChunk } from "./map.js";

export function createNewChunk(map: GameMap, chunkI: number, chunkJ: number, idCounter: IdCounter): MapChunk{
    let newChunk = { tiles:createNewChunkTiles(map.chunkLength, chunkI, chunkJ, map.seed!), characters: []};
    map.chunks[`${chunkI}_${chunkJ}`] = newChunk;
    createFixPositionRespawnEnemies(newChunk, chunkI, chunkJ, map, idCounter);
    return newChunk;
}

export function createNewChunkTiles(chunkLength: number, chunkI: number, chunkJ: number, seed: number): number[][] {
    let chunk: number[][] = [];
    for (let i = 0; i < chunkLength; i++) {
        chunk.push([]);
        for (let j = 0; j < chunkLength; j++) {
            let px = (chunkI * chunkLength + i) / chunkLength;
            let py = (chunkJ * chunkLength + j) / chunkLength;

            let isTree = perlin_get(px, py, seed);
            let isStone = perlin_get(px + 1024, py + 1024, seed);
            let randomTileId: number;
            if (isStone >= 0.35) {
                randomTileId = 2;
            } else if (isTree >= 0.25) {
                randomTileId = 1;
            } else {
                randomTileId = 0;
            }
            chunk[i].push(randomTileId);
        }
    }

    return chunk;
}

export function fixedRandom(x: number, y: number, seed: number) {
    return (Math.sin((x * 112.01716 + y * 718.233 + seed * 1234.1234) * 437057.545323) * 1000000) & 255;
}

function perlin_get(x: number, y: number, seed: number) {
    let x0 = Math.floor(x);
    let x1 = x0 + 1;
    let y0 = Math.floor(y);
    let y1 = y0 + 1;

    let dotProdX0Y0 = dot_prod_grid(x, y, x0, y0, seed);
    let dotProdX1Y0 = dot_prod_grid(x, y, x1, y0, seed);
    let dotProdX0Y1 = dot_prod_grid(x, y, x0, y1, seed);
    let dotProdX1Y1 = dot_prod_grid(x, y, x1, y1, seed);

    let inter1 = interp(x - x0, dotProdX0Y0, dotProdX1Y0);
    let inter2 = interp(x - x0, dotProdX0Y1, dotProdX1Y1);
    let result = interp(y - y0, inter1, inter2);

    return result;
}

function dot_prod_grid(x: number, y: number, vx: number, vy: number, seed: number) {
    let d_vect = { x: x - vx, y: y - vy };
    let random = fixedRandom(vx, vy, seed) / 256 * 2 * Math.PI;
    let vector = { x: Math.cos(random), y: Math.sin(random) };

    return d_vect.x * vector.x + d_vect.y * vector.y;
}

function smootherstep(x: number) {
    return 6 * x ** 5 - 15 * x ** 4 + 10 * x ** 3;
}

function interp(x: number, a: number, b: number) {
    return a + smootherstep(x) * (b - a);
}