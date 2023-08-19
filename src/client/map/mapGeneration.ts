import { createFixPositionRespawnEnemies } from "../character/enemy/fixPositionRespawnEnemyModel.js";
import { takeTimeMeasure } from "../game.js";
import { Game, IdCounter, Position } from "../gameModel.js";
import { fixedRandom } from "../randomNumberGenerator.js";
import { GameMap, MapChunk } from "./map.js";

export function generateMissingChunks(map: GameMap, positions: Position[], idCounter: IdCounter, game: Game) {
    takeTimeMeasure(game.debug, "", "generateMissingChunks");

    let chunkSize = map.tileSize * map.chunkLength;
    let generationRadius = 1500;

    for (const position of positions) {
        let startX = (position.x - generationRadius);
        let startY = (position.y - generationRadius);
        let startChunkI = Math.floor(startY / chunkSize);
        let startChunkJ = Math.floor(startX / chunkSize);

        for (let i = 0; i < Math.ceil(generationRadius / chunkSize * 2); i++) {
            let chunkI = startChunkI + i;
            for (let j = 0; j < Math.ceil(generationRadius / chunkSize * 2); j++) {
                let chunkJ = startChunkJ + j;
                let chunk = map.chunks[`${chunkI}_${chunkJ}`];
                if (chunk === undefined) {
                    chunk = createNewChunk(map, chunkI, chunkJ, idCounter);
                    map.chunks[`${chunkI}_${chunkJ}`] = chunk;
                }
            }
        }
    }
    takeTimeMeasure(game.debug, "generateMissingChunks", "");
}

export function createNewChunk(map: GameMap, chunkI: number, chunkJ: number, idCounter: IdCounter): MapChunk {
    let newChunk = { tiles: createNewChunkTiles(map, chunkI, chunkJ, map.seed!), characters: [] };
    map.chunks[`${chunkI}_${chunkJ}`] = newChunk;
    createFixPositionRespawnEnemies(newChunk, chunkI, chunkJ, map, idCounter);
    return newChunk;
}

export function createNewChunkTiles(map: GameMap, chunkI: number, chunkJ: number, seed: number): number[][] {
    let chunk: number[][] = [];
    const chunkLength = map.chunkLength;
    if(chunkI === 0 && chunkJ === 0){
        for (let i = 0; i < chunkLength; i++) {
            chunk.push([]);
            for (let j = 0; j < chunkLength; j++) {
                chunk[i].push(0);
            }
        }
    }else{
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
        // endBossChunkStuff(chunk, map, chunkI, chunkJ);
    }
    return chunk;
}

function endBossChunkStuff(chunk: number[][], map: GameMap, chunkI: number, chunkJ: number){
    const chunkLength = map.chunkLength;
    const pathEnd = 1000;
    const pathChunkEnd = Math.floor(pathEnd / (chunkLength * map.tileSize));
    endBossPathForChunkTiles(chunk, chunkLength, chunkI, chunkJ, pathChunkEnd);
    endBossChunkArea(chunk, chunkLength, chunkI, chunkJ, pathChunkEnd);
}

function endBossChunkArea(chunk: number[][], chunkLength: number, chunkI: number, chunkJ: number, pathChunkEnd: number){
    const endBossAreaSize = 2;
    const isBossAreaChunk1 = Math.abs(chunkJ) >= pathChunkEnd
        && Math.abs(chunkJ) < pathChunkEnd + endBossAreaSize
        && Math.abs(chunkI) <= Math.floor(endBossAreaSize / 2);
    const isBossAreaChunk2 = Math.abs(chunkI) >= pathChunkEnd
        && Math.abs(chunkI) < pathChunkEnd + endBossAreaSize
        && Math.abs(chunkJ) <= Math.floor(endBossAreaSize / 2);
    let hasJStartWall;
    let hasJEndWall;
    let hasIStartWall;
    let hasIEndWall;
    let areaEntryPointJ: number | undefined = undefined;
    let areaEntryPointI: number | undefined = undefined;
    let areaEntryPathTileId = 0;
    if(isBossAreaChunk1 || isBossAreaChunk2){
        if(isBossAreaChunk1){
            hasJStartWall = chunkJ === pathChunkEnd || -chunkJ === pathChunkEnd + endBossAreaSize - 1;
            hasJEndWall = chunkJ === pathChunkEnd + endBossAreaSize - 1 || -chunkJ === pathChunkEnd;
            hasIStartWall = -chunkI === Math.floor(endBossAreaSize / 2);
            hasIEndWall = chunkI === Math.floor(endBossAreaSize / 2);
            if(chunkI === 0){
                if(-chunkJ === pathChunkEnd){
                    areaEntryPointJ = chunkLength - 1; 
                    areaEntryPointI = Math.floor(chunkLength / 2);
                }else if(chunkJ === pathChunkEnd){
                    areaEntryPointJ = 0; 
                    areaEntryPointI = Math.floor(chunkLength / 2);
                }
                areaEntryPathTileId = 3;
            }
        }else{
            hasIStartWall = chunkI === pathChunkEnd || -chunkI === pathChunkEnd + endBossAreaSize - 1;
            hasIEndWall = chunkI === pathChunkEnd + endBossAreaSize - 1 || -chunkI === pathChunkEnd;
            hasJStartWall = -chunkJ === Math.floor(endBossAreaSize / 2);
            hasJEndWall = chunkJ === Math.floor(endBossAreaSize / 2);
            if(chunkJ === 0){
                if(-chunkI === pathChunkEnd){
                    areaEntryPointI = chunkLength - 1; 
                    areaEntryPointJ = Math.floor(chunkLength / 2);
                }else if(chunkI === pathChunkEnd){
                    areaEntryPointI = 0; 
                    areaEntryPointJ = Math.floor(chunkLength / 2);
                }
            }
            areaEntryPathTileId = 4;
        }
        for (let i = 0; i < chunkLength; i++) {
            for (let j = 0; j < chunkLength; j++) {
                chunk[i][j] = 0;
                if(hasJStartWall && j === 0
                    || hasJEndWall && j === chunkLength - 1
                    || hasIStartWall && i === 0
                    || hasIEndWall && i === chunkLength - 1
                ){
                    chunk[i][j] = 1;
                }
            }
        }
        if(areaEntryPointI !== undefined && areaEntryPointJ !== undefined) chunk[areaEntryPointI][areaEntryPointJ] = areaEntryPathTileId;
    }
}

function endBossPathForChunkTiles(chunk: number[][], chunkLength: number, chunkI: number, chunkJ: number, pathChunkEnd: number){
    const pathChunkStart = 0;
    if(chunkI === 0 && Math.abs(chunkJ) > pathChunkStart && Math.abs(chunkJ) < pathChunkEnd){
        for(let i = 0; i < chunkLength; i++){
            chunk[Math.floor(chunkLength / 2)][i] = 3;
        }
    }
    if(chunkJ === 0 && Math.abs(chunkI) > pathChunkStart && Math.abs(chunkI) < pathChunkEnd){
        for(let i = 0; i < chunkLength; i++){
            chunk[i][Math.floor(chunkLength / 2)] = 4;
        }
    }
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