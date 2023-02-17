import { calculateDistance, getNextId } from "../../game.js"
import { Game, IdCounter, Position } from "../../gameModel.js"
import { MapChunk, GameMap, isPositionBlocking, mapKeyToChunkIJ } from "../../map/map.js"
import { fixedRandom } from "../../randomNumberGenerator.js"
import { Character, createCharacter } from "../characterModel.js"

export type FixPositionRespawnEnemyCharacter = Character & {
    alertEnemyRange?: number,
    autoAggroRange: number,
    maxAggroRange: number,
    isAggroed: boolean,
    spawnPosition: Position,
    nextTickTime?: number,
    respawnOnTime?: number,
    respawnTime: number,
}

type EnemyTypes = {
    [key: string]: EnemyType
}

type EnemyType = {
    hpFactor: number,
    sizeFactor: number,
    spawnAmountFactor: number,
    xpFactor: number,
}

const ENEMY_TYPES: EnemyTypes = {
    "big": { hpFactor: 2, sizeFactor: 1.5, spawnAmountFactor: 0.25, xpFactor: 2 },
    "default": { hpFactor: 1, sizeFactor: 1, spawnAmountFactor: 0.5, xpFactor: 1 },
    "small": { hpFactor: 0.5, sizeFactor: 0.75, spawnAmountFactor: 1, xpFactor: 0.5 },
}

export function createEnemyWithLevel(idCounter: IdCounter, enemyPos: Position, level: number, enemyType: EnemyType) {
    if (enemyType === undefined) {
        throw Error("enemy type unknwon" + enemyType);
    }
    let colors = ["black", "green", "blue", "red"];
    let hp = 5 * Math.pow(level, 3) * enemyType.hpFactor;
    let moveSpeed = Math.min(20, 1 + level / 5);
    let size = Math.min(40, (10 + 5 * Math.floor(level / colors.length + 1)) * enemyType.sizeFactor);
    let damage = level;
    let color = colors[level % colors.length];
    let autoAggroRange = Math.min(750, 50 + level * 50);
    let alertEnemyRange = Math.min(500, 50 + level * 25);
    let respawnTime = Math.max(1000, 30000 - level * 1000);
    let experienceWorth = 1 * enemyType.xpFactor * Math.pow(level, 2);

    return createEnemy(idCounter, enemyPos.x, enemyPos.y, size, moveSpeed, hp, damage, color, autoAggroRange, alertEnemyRange, respawnTime, experienceWorth);
}

export function createFixPositionRespawnEnemiesOnInit(game: Game) {
    let map = game.state.map;
    let existingMapKeys = Object.keys(map.chunks);
    for (let i = 0; i < existingMapKeys.length; i++) {
        let chunk = map.chunks[existingMapKeys[i]];
        if (chunk.characters.length === 0) {
            let chunkIJ = mapKeyToChunkIJ(existingMapKeys[i]);
            createFixPositionRespawnEnemies(chunk, chunkIJ.chunkI, chunkIJ.chunkJ, map, game.state.idCounter);
        }
    }
}

export function createFixPositionRespawnEnemies(chunk: MapChunk, chunkI: number, chunkJ: number, map: GameMap, idCounter: IdCounter) {
    if (chunk.characters.length > 0) {
        console.log("unexpected existence of characers in mapChunk", chunk, chunkI, chunkJ);
    }

    let chunkSize = map.tileSize * map.chunkLength;
    let mapCenter = { x: chunkSize / 2, y: chunkSize / 2 };
    let minSpawnDistanceFromMapCenter = 500;

    let topLeftMapKeyPos: Position = {
        x: chunkJ * chunkSize,
        y: chunkI * chunkSize
    }
    let centerMapKeyPos: Position = {
        x: topLeftMapKeyPos.x + chunkSize / 2,
        y: topLeftMapKeyPos.y + chunkSize / 2
    }
    let chunkDistance = calculateDistance(mapCenter, centerMapKeyPos);
    let enemyType: string;
    if (chunkI > 0 && Math.abs(chunkI) >= Math.abs(chunkJ)) {
        enemyType = "big";
    } else if (chunkI < 0 && Math.abs(chunkI) >= Math.abs(chunkJ)) {
        enemyType = "small";
    } else {
        enemyType = "default";
    }
    if (minSpawnDistanceFromMapCenter < chunkDistance + chunkSize) {
        for (let i = 0; i < chunk.tiles.length; i++) {
            for (let j = 0; j < chunk.tiles[i].length; j++) {
                let spawnEnemy = fixedRandom(i + chunkI * chunk.tiles.length, j + chunkJ * chunk.tiles[i].length, map.seed!) / 256;
                if (spawnEnemy <= ENEMY_TYPES[enemyType].spawnAmountFactor) {
                    let enemyPos: Position = {
                        x: topLeftMapKeyPos.x + j * map.tileSize + map.tileSize / 2,
                        y: topLeftMapKeyPos.y + i * map.tileSize + map.tileSize / 2
                    }
                    let distance = calculateDistance(mapCenter, enemyPos);
                    if (minSpawnDistanceFromMapCenter < distance) {
                        if (!isPositionBlocking(enemyPos, map, idCounter)) {
                            let level = Math.max(Math.floor((distance - minSpawnDistanceFromMapCenter) / 1000), 0) + 1;
                            chunk.characters.push(createEnemyWithLevel(idCounter, enemyPos, level, ENEMY_TYPES[enemyType]));
                        }
                    }
                }
            }
        }
    }
}

function createEnemy(
    idCounter: IdCounter,
    x: number,
    y: number,
    size: number,
    moveSpeed: number,
    hp: number,
    damage: number,
    color: string,
    autoAggroRange: number,
    alertEnemyRange: number,
    respawnTime: number,
    experienceWorth: number,
): FixPositionRespawnEnemyCharacter {
    let enemy = createCharacter(getNextId(idCounter), x, y, size, size, color, moveSpeed, hp, damage, "enemy", "fixPositionRespawnEnemy", experienceWorth);
    return {
        ...enemy,
        autoAggroRange: autoAggroRange,
        spawnPosition: { x, y },
        respawnTime: respawnTime,
        isAggroed: false,
        maxAggroRange: Math.max(200, autoAggroRange * 1.5),
        alertEnemyRange: alertEnemyRange,
    };
}