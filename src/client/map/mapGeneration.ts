import { createFixPositionRespawnEnemies } from "../character/enemy/fixPositionRespawnEnemyModel.js";
import { takeTimeMeasure } from "../game.js";
import { Game, IdCounter, Position } from "../gameModel.js";
import { fixedRandom } from "../randomNumberGenerator.js";
import { GameMap, GameMapEndBossArea, MapChunk } from "./map.js";

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
    let newChunk = createNewChunkTiles(map, chunkI, chunkJ, map.seed!);
    map.chunks[`${chunkI}_${chunkJ}`] = newChunk;
    createFixPositionRespawnEnemies(newChunk, chunkI, chunkJ, map, idCounter);
    return newChunk;
}

export function createNewChunkTiles(map: GameMap, chunkI: number, chunkJ: number, seed: number): MapChunk {
    const chunk: number[][] = [];
    const mapChunk: MapChunk = { tiles: chunk, characters: [] };
    const chunkLength = map.chunkLength;
    if (chunkI === 0 && chunkJ === 0) {
        for (let i = 0; i < chunkLength; i++) {
            chunk.push([]);
            for (let j = 0; j < chunkLength; j++) {
                chunk[i].push(0);
            }
        }
    } else {
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
        endBossChunkStuff(mapChunk, map, chunkI, chunkJ);
    }
    return mapChunk;
}

function endBossChunkStuff(mapChunk: MapChunk, map: GameMap, chunkI: number, chunkJ: number) {
    if (!map.endBossArea) return;
    const chunkLength = map.chunkLength;
    endBossChunkArea(mapChunk, chunkLength, chunkI, chunkJ, map.endBossArea);
    endBossPathForChunkTiles(mapChunk.tiles, chunkLength, chunkI, chunkJ, map.endBossArea.numberChunksUntil);
}

function getTopLeftCornerChunkIJOfBossAreas(bossArea: GameMapEndBossArea): { i: number, j: number }[] {
    let result: { i: number, j: number }[] = [];
    result.push({
        i: bossArea.numberChunksUntil,
        j: - Math.floor(bossArea.size / 2),
    });
    result.push({
        i: - Math.floor(bossArea.size / 2),
        j: bossArea.numberChunksUntil,
    });
    result.push({
        i: - bossArea.numberChunksUntil - bossArea.size + 1,
        j: - Math.floor(bossArea.size / 2),
    });
    result.push({
        i: - Math.floor(bossArea.size / 2),
        j: - bossArea.numberChunksUntil - bossArea.size + 1,
    });
    return result;
}

function endBossChunkArea(mapChunk: MapChunk, chunkLength: number, chunkI: number, chunkJ: number, area: GameMapEndBossArea) {
    const tiles = mapChunk.tiles;
    let areaCorners = getTopLeftCornerChunkIJOfBossAreas(area);
    for (let corner of areaCorners) {
        if (corner.i <= chunkI && corner.i + area.size > chunkI
            && corner.j <= chunkJ && corner.j + area.size > chunkJ) {
                
            mapChunk.isEndBossAreaChunk = true;
            let hasJStartWall = corner.j === chunkJ;
            let hasJEndWall = corner.j + area.size - 1 === chunkJ;
            let hasIStartWall = corner.i === chunkI;
            let hasIEndWall = corner.i + area.size - 1 === chunkI;

            for (let i = 0; i < chunkLength; i++) {
                for (let j = 0; j < chunkLength; j++) {
                    tiles[i][j] = 0;
                    if (hasJStartWall && j === 0
                        || hasJEndWall && j === chunkLength - 1
                        || hasIStartWall && i === 0
                        || hasIEndWall && i === chunkLength - 1
                    ) {
                        tiles[i][j] = 1;
                    }
                }
            }
            return;
        }
    }
}

function endBossPathForChunkTiles(chunk: number[][], chunkLength: number, chunkI: number, chunkJ: number, pathChunkEnd: number) {
    const pathChunkStart = 0;
    if (chunkI === 0 && Math.abs(chunkJ) > pathChunkStart && Math.abs(chunkJ) <= pathChunkEnd) {
        if (Math.abs(chunkJ) < pathChunkEnd) {
            for (let i = 0; i < chunkLength; i++) {
                chunk[Math.floor(chunkLength / 2)][i] = 3;
            }
        } else {
            if (chunkJ > 0) {
                chunk[Math.floor(chunkLength / 2)][0] = 3;
            } else {
                chunk[Math.floor(chunkLength / 2)][chunkLength - 1] = 3;
            }
        }
    }
    if (chunkJ === 0 && Math.abs(chunkI) > pathChunkStart && Math.abs(chunkI) <= pathChunkEnd) {
        if (Math.abs(chunkI) < pathChunkEnd) {
            for (let i = 0; i < chunkLength; i++) {
                chunk[i][Math.floor(chunkLength / 2)] = 4;
            }
        } else {
            if (chunkI > 0) {
                chunk[0][Math.floor(chunkLength / 2)] = 4;
            } else {
                chunk[chunkLength - 1][Math.floor(chunkLength / 2)] = 4;
            }
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