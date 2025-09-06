import { addExistingBuildingsToSpawnChunk } from "./buildings/building.js";
import { createFixPositionRespawnEnemies } from "../character/enemy/fixPositionRespawnEnemyModel.js";
import { takeTimeMeasure } from "../game.js";
import { Game, IdCounter, Position } from "../gameModel.js";
import { fixedRandom } from "../randomNumberGenerator.js";
import { GameMap, MapChunk, TILE_ID_FIREPIT, TILE_ID_GRASS, TILE_ID_ROCK, TILE_ID_TREE, chunkXYToMapKey } from "./map.js";
import { mapGenerationKingChunkStuff } from "./mapKingArea.js";
import { IMAGE_FIRE_ANIMATION, MAP_OBJECT_FIRE_ANIMATION } from "./mapObjectFireAnimation.js";
import { GAME_MAP_MODIFIER_FUNCTIONS, mapModifyIsChunkAffected } from "./modifiers/mapModifier.js";
import { areaSpawnOnDistanceCreateAndSetOnMap } from "./mapAreaSpawnOnDistance.js";

export const pastCharactersMapTilePositions = [
    { x: 3, y: 2, tileId: 5, lookDirection: Math.PI / 2 },
    { x: 4, y: 2, tileId: 5, lookDirection: Math.PI / 2 },
    { x: 5, y: 2, tileId: 5, lookDirection: Math.PI / 2 },
    { x: 6, y: 3, tileId: 6, lookDirection: Math.PI },
    { x: 6, y: 4, tileId: 6, lookDirection: Math.PI },
    { x: 6, y: 5, tileId: 6, lookDirection: Math.PI },
    { x: 5, y: 6, tileId: 5, lookDirection: Math.PI / 2 * 3 },
    { x: 4, y: 6, tileId: 5, lookDirection: Math.PI / 2 * 3 },
    { x: 3, y: 6, tileId: 5, lookDirection: Math.PI / 2 * 3 },
    { x: 2, y: 5, tileId: 6, lookDirection: 0 },
    { x: 2, y: 4, tileId: 6, lookDirection: 0 },
    { x: 2, y: 3, tileId: 6, lookDirection: 0 },
]
export function generateMissingChunks(map: GameMap, positions: Position[], idCounter: IdCounter, game: Game) {
    takeTimeMeasure(game.debug, "", "generateMissingChunks");

    const chunkSize = map.tileSize * map.chunkLength;
    const generationRadius = 1500;
    for (const position of positions) {
        const startX = (position.x - generationRadius);
        const startY = (position.y - generationRadius);
        const startChunkX = Math.floor(startX / chunkSize);
        const startChunkY = Math.floor(startY / chunkSize);

        for (let yIndex = 0; yIndex < Math.ceil(generationRadius / chunkSize * 2); yIndex++) {
            const chunkY = startChunkY + yIndex;
            for (let xIndex = 0; xIndex < Math.ceil(generationRadius / chunkSize * 2); xIndex++) {
                const chunkX = startChunkX + xIndex;
                let chunk = map.chunks[chunkXYToMapKey(chunkX, chunkY)];
                if (chunk === undefined) {
                    chunk = createNewChunk(map, chunkX, chunkY, idCounter, game);
                }
            }
        }
    }
    takeTimeMeasure(game.debug, "generateMissingChunks", "");
}

export function createNewChunk(map: GameMap, chunkX: number, chunkY: number, idCounter: IdCounter, game: Game): MapChunk {
    const newChunk = createNewChunkTiles(map, chunkX, chunkY, map.seed!, game);
    if (areaSpawnOnDistanceCreateAndSetOnMap(chunkX, chunkY, map, game)) return map.chunks[chunkXYToMapKey(chunkX, chunkY)];
    map.chunks[chunkXYToMapKey(chunkX, chunkY)] = newChunk;

    createFixPositionRespawnEnemies(newChunk, chunkX, chunkY, map, idCounter, game);
    for (let modifier of map.mapModifiers) {
        if (mapModifyIsChunkAffected(modifier, chunkX, chunkY, game)) {
            const modifierFunctions = GAME_MAP_MODIFIER_FUNCTIONS[modifier.type];
            if (modifierFunctions && modifierFunctions.onChunkCreateModify) {
                modifierFunctions.onChunkCreateModify(modifier, newChunk, chunkX, chunkY, game);
            }
        }
    }
    return newChunk;
}

export function createNewChunkTiles(map: GameMap, chunkX: number, chunkY: number, seed: number, game: Game): MapChunk {
    const tiles: number[][] = [];
    const mapChunk: MapChunk = { tiles: tiles, characters: [], objects: [] };
    const chunkLength = map.chunkLength;
    if (chunkY === 0 && chunkX === 0) {
        createSpawnChunk(mapChunk, chunkLength, game);
    } else {
        for (let tileX = 0; tileX < chunkLength; tileX++) {
            tiles.push([]);
            for (let tileY = 0; tileY < chunkLength; tileY++) {
                const px = (chunkX * chunkLength + tileX) / chunkLength;
                const py = (chunkY * chunkLength + tileY) / chunkLength;

                const isTree = perlin_get(px, py, seed);
                const isStone = perlin_get(px + 1024, py + 1024, seed);
                let randomTileId: number;
                if (isStone >= 0.35) {
                    randomTileId = TILE_ID_ROCK;
                } else if (isTree >= 0.25) {
                    randomTileId = TILE_ID_TREE;
                } else {
                    randomTileId = TILE_ID_GRASS;
                }
                tiles[tileX].push(randomTileId);
            }
        }
        mapGenerationKingChunkStuff(mapChunk, map, chunkX, chunkY);
    }
    return mapChunk;
}

function createSpawnChunk(mapChunk: MapChunk, chunkLength: number, game: Game) {
    const chunk = mapChunk.tiles;
    mapChunk.objects.push({
        x: 4,
        y: 4,
        type: MAP_OBJECT_FIRE_ANIMATION,
        image: IMAGE_FIRE_ANIMATION,
        interactable: true,
    });
    for (let i = 0; i < chunkLength; i++) {
        chunk.push([]);
        for (let j = 0; j < chunkLength; j++) {
            chunk[i].push(TILE_ID_GRASS);
        }
    }
    for (let iter of pastCharactersMapTilePositions) {
        chunk[iter.x][iter.y] = iter.tileId;
    }
    chunk[4][4] = TILE_ID_FIREPIT;
    addExistingBuildingsToSpawnChunk(mapChunk, game);
}

export function perlin_get(x: number, y: number, seed: number) {
    const x0 = Math.floor(x);
    const x1 = x0 + 1;
    const y0 = Math.floor(y);
    const y1 = y0 + 1;

    const dotProdX0Y0 = dot_prod_grid(x, y, x0, y0, seed);
    const dotProdX1Y0 = dot_prod_grid(x, y, x1, y0, seed);
    const dotProdX0Y1 = dot_prod_grid(x, y, x0, y1, seed);
    const dotProdX1Y1 = dot_prod_grid(x, y, x1, y1, seed);

    const inter1 = interp(x - x0, dotProdX0Y0, dotProdX1Y0);
    const inter2 = interp(x - x0, dotProdX0Y1, dotProdX1Y1);
    const result = interp(y - y0, inter1, inter2);

    return result;
}

function dot_prod_grid(x: number, y: number, vx: number, vy: number, seed: number) {
    const d_vect = { x: x - vx, y: y - vy };
    const random = fixedRandom(vx, vy, seed) * 2 * Math.PI;
    const vector = { x: Math.cos(random), y: Math.sin(random) };

    return d_vect.x * vector.x + d_vect.y * vector.y;
}

function smootherstep(x: number) {
    return 6 * x ** 5 - 15 * x ** 4 + 10 * x ** 3;
}

function interp(x: number, a: number, b: number) {
    return a + smootherstep(x) * (b - a);
}