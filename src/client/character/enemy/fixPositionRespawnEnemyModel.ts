import { createAbilityMelee } from "../../ability/abilityMelee.js"
import { calculateDistance, getNextId } from "../../game.js"
import { FACTION_ENEMY, Game, IdCounter, Position } from "../../gameModel.js"
import { MapChunk, GameMap, isPositionBlocking, mapKeyToChunkXY } from "../../map/map.js"
import { fixedRandom } from "../../randomNumberGenerator.js"
import { Character, IMAGE_SLIME, createCharacter } from "../characterModel.js"

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
    damageFactor: number,
}

const ENEMY_TYPES: EnemyTypes = {
    "big": { hpFactor: 2, sizeFactor: 1.5, spawnAmountFactor: 0.25, xpFactor: 2, damageFactor: 2 },
    "default": { hpFactor: 1, sizeFactor: 1, spawnAmountFactor: 0.5, xpFactor: 1, damageFactor: 1 },
    "small": { hpFactor: 0.5, sizeFactor: 0.75, spawnAmountFactor: 1, xpFactor: 0.5, damageFactor: 0.5 },
}

export function createEnemyWithLevel(idCounter: IdCounter, enemyPos: Position, level: number, enemyType: EnemyType) {
    if (enemyType === undefined) {
        throw Error("enemy type unknwon" + enemyType);
    }
    const colors = ["black", "green", "blue", "red"];
    const hp = 5 * Math.pow(level, 3) * enemyType.hpFactor;
    const moveSpeed = Math.min(20, 1 + level / 5);
    const size = Math.min(40, (10 + 5 * Math.floor(level / colors.length + 1)) * enemyType.sizeFactor);
    const color = colors[level % colors.length];
    const autoAggroRange = Math.min(750, 50 + level * 50);
    const alertEnemyRange = Math.min(500, 50 + level * 25);
    const respawnTime = Math.max(1000, 30000 - level * 1000);
    const experienceWorth = 1 * enemyType.xpFactor * Math.pow(level, 2);
    const meleeDamage = (2 + level * 2) * enemyType.damageFactor;

    const enemy = createEnemy(idCounter, enemyPos.x, enemyPos.y, size, moveSpeed, hp, color, autoAggroRange, alertEnemyRange, respawnTime, experienceWorth);
    enemy.abilities.push(createAbilityMelee(idCounter, undefined, meleeDamage));
    return enemy;
}

export function createFixPositionRespawnEnemiesOnInit(game: Game) {
    const map = game.state.map;
    const existingMapKeys = Object.keys(map.chunks);
    for (let i = 0; i < existingMapKeys.length; i++) {
        const chunk = map.chunks[existingMapKeys[i]];
        if (chunk.characters.length === 0) {
            const chunkXY = mapKeyToChunkXY(existingMapKeys[i]);
            createFixPositionRespawnEnemies(chunk, chunkXY.chunkX, chunkXY.chunkY, map, game.state.idCounter);
        }
    }
}

export function createFixPositionRespawnEnemies(chunk: MapChunk, chunkX: number, chunkY: number, map: GameMap, idCounter: IdCounter) {
    if (chunk.characters.length > 0) {
        console.log("unexpected existence of characers in mapChunk", chunk, chunkX, chunkY);
    }
    if (chunk.isEndBossAreaChunk) return;
    const chunkSize = map.tileSize * map.chunkLength;
    const mapCenter = { x: chunkSize / 2, y: chunkSize / 2 };
    const minSpawnDistanceFromMapCenter = 500;

    const topLeftMapKeyPos: Position = {
        x: chunkX * chunkSize,
        y: chunkY * chunkSize
    }
    const centerMapKeyPos: Position = {
        x: topLeftMapKeyPos.x + chunkSize / 2,
        y: topLeftMapKeyPos.y + chunkSize / 2
    }
    const chunkDistance = calculateDistance(mapCenter, centerMapKeyPos);
    let enemyType: string;
    if (chunkY > 0 && Math.abs(chunkY) >= Math.abs(chunkX)) {
        enemyType = "big";
    } else if (chunkY < 0 && Math.abs(chunkY) >= Math.abs(chunkX)) {
        enemyType = "small";
    } else {
        enemyType = "default";
    }
    if (minSpawnDistanceFromMapCenter < chunkDistance + chunkSize) {
        for (let x = 0; x < chunk.tiles.length; x++) {
            for (let y = 0; y < chunk.tiles[x].length; y++) {
                const spawnEnemy = fixedRandom(x + chunkX * chunk.tiles.length, y + chunkY * chunk.tiles[x].length, map.seed!) / 256;
                if (spawnEnemy <= ENEMY_TYPES[enemyType].spawnAmountFactor) {
                    const enemyPos: Position = {
                        x: topLeftMapKeyPos.x + x * map.tileSize + map.tileSize / 2,
                        y: topLeftMapKeyPos.y + y * map.tileSize + map.tileSize / 2
                    }
                    const distance = calculateDistance(mapCenter, enemyPos);
                    if (minSpawnDistanceFromMapCenter < distance) {
                        if (!isPositionBlocking(enemyPos, map, idCounter)) {
                            const level = Math.max(Math.floor((distance - minSpawnDistanceFromMapCenter) / 1000), 0) + 1;
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
    color: string,
    autoAggroRange: number,
    alertEnemyRange: number,
    respawnTime: number,
    experienceWorth: number,
): FixPositionRespawnEnemyCharacter {
    const enemy = createCharacter(getNextId(idCounter), x, y, size, size, color, moveSpeed, hp, FACTION_ENEMY, "fixPositionRespawnEnemy", experienceWorth);
    enemy.paint.image = IMAGE_SLIME;
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