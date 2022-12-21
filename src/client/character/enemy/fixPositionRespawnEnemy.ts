import { calculateDistance, getCameraPosition, getNextId } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { isPositionBlocking } from "../../map/map.js";
import { determineCharactersInDistance, determineClosestCharacter, determineEnemyHitsPlayer, determineEnemyMoveDirection, findCharacterById, getPlayerCharacters, moveCharacterTick } from "../character.js";
import { Character, createCharacter } from "../characterModel.js";
import { PathingCache } from "../pathing.js";

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

type CreatedEnemiesForChunk = {
    nextEnemyCreateTime: number,
    enemyCreateInterval: number,
    chunks: {
        [key: string]: boolean,
    }
}

export function createFixPositionRespawnEnemy(game: Game) {
    let performanceKey = "FixPositionRespawnEnemy";
    let createdEnemiesForChunk: CreatedEnemiesForChunk;
    if (game.performance[performanceKey] !== undefined) {
        createdEnemiesForChunk = game.performance[performanceKey];
    } else {
        createdEnemiesForChunk = {
            nextEnemyCreateTime: game.state.time,
            enemyCreateInterval: 250,
            chunks: {},
        }
        game.performance[performanceKey] = createdEnemiesForChunk;
        determineChunksWithAlreadCreatedEnemies(game, createdEnemiesForChunk);
    }
    if (createdEnemiesForChunk.nextEnemyCreateTime > game.state.time) return;
    createdEnemiesForChunk.nextEnemyCreateTime = game.state.time + createdEnemiesForChunk.enemyCreateInterval;

    let mapCenter = {x:0, y:0};
    let map = game.state.map;
    let chunkSize = map.tileSize * map.chunkLength;
    let minSpawnDistanceFromMapCenter = 400;

    let mapKeys = Object.keys(map.chunks);
    for (let mapIndex = 0; mapIndex < mapKeys.length; mapIndex++) {
        let key = mapKeys[mapIndex];
        if(createdEnemiesForChunk.chunks[key] === true) continue;
        createdEnemiesForChunk.chunks[key] = true;
        let topLeftMapKeyPos: Position = {
            x: Number.parseInt(key.split('_')[0]) * chunkSize,
            y: Number.parseInt(key.split('_')[1]) * chunkSize
        }
        let centerMapKeyPos: Position = {
            x: topLeftMapKeyPos.x + chunkSize / 2,
            y: topLeftMapKeyPos.y + chunkSize / 2
        }
        let distance = calculateDistance(mapCenter, centerMapKeyPos);
        if (minSpawnDistanceFromMapCenter < distance) {
            let chunk = map.chunks[key];
            for (let i = 0; i < chunk.length; i++) {
                for (let j = 0; j < chunk[i].length; j++) {
                    let enemyPos: Position = {
                        x: topLeftMapKeyPos.x + j * map.tileSize + map.tileSize / 2,
                        y: topLeftMapKeyPos.y + i * map.tileSize + map.tileSize / 2
                    }
                    distance = calculateDistance(mapCenter, enemyPos);
                    if (minSpawnDistanceFromMapCenter < distance) {
                        if (!isPositionBlocking(enemyPos, map)) {
                            let strenghFaktor = Math.max((distance - 100) / 100, 1);
                            let hp = 1 * strenghFaktor;
                            let moveSpeed = 1 + (Math.log10(strenghFaktor)/10);
                            let size = 5 + Math.log10(strenghFaktor);
                            let damage = 1 + Math.log10(strenghFaktor);
                            game.state.characters.push(createEnemy(game, enemyPos.x, enemyPos.y, size, moveSpeed, hp, damage));
                        }
                    }
                }
            }
        }
    }
}

export function tickFixPositionRespawnEnemyCharacter(enemy: FixPositionRespawnEnemyCharacter, game: Game, pathingCache: PathingCache) {
    if (enemy.isDead) {
        if (enemy.wasHitRecently && !enemy.isAggroed) {
            alertCloseEnemies(enemy, game);
            delete enemy.wasHitRecently;
        }
        respawnLogic(enemy, game);
    } else {
        if (!enemy.nextTickTime || game.state.time >= enemy.nextTickTime || enemy.wasHitRecently) {
            let playerCharacters = getPlayerCharacters(game.state.characters);
            let closest = determineClosestCharacter(enemy, playerCharacters);
            let aggroed = closest.minDistance <= enemy.autoAggroRange
                || (enemy.isAggroed && closest.minDistance <= enemy.maxAggroRange)
                || (enemy.wasHitRecently && closest.minDistance <= enemy.maxAggroRange);
            if (aggroed) {
                enemy.isAggroed = true;
                if (enemy.wasHitRecently) {
                    alertCloseEnemies(enemy, game);
                }
                determineEnemyMoveDirection(enemy, closest.minDistanceCharacter, game.state.map, pathingCache);
                determineEnemyHitsPlayer(enemy, closest.minDistanceCharacter);
            } else {
                let spawnDistance = calculateDistance(enemy, enemy.spawnPosition);
                enemy.isAggroed = false;
                if (spawnDistance > game.state.map.tileSize / 2) {
                    determineEnemyMoveDirection(enemy, enemy.spawnPosition, game.state.map, pathingCache);
                } else {
                    enemy.nextTickTime = game.state.time + closest.minDistance;
                    enemy.isMoving = false;
                }
            }
            moveCharacterTick(enemy, game.state.map);
            if (enemy.wasHitRecently) delete enemy.wasHitRecently;
        }
    }
}

function determineChunksWithAlreadCreatedEnemies(game: Game, createdEnemiesForChunk: CreatedEnemiesForChunk) {
    let mapKeys = Object.keys(game.state.map.chunks);
    let chunkSize = game.state.map.tileSize * game.state.map.chunkLength;
    let characters = game.state.characters;
    for (let mapIndex = 0; mapIndex < mapKeys.length; mapIndex++) {
        let key = mapKeys[mapIndex];
        for (let charIndex = 0; charIndex < characters.length; charIndex++) {
            if(characters[charIndex].type === "fixPositionRespawnEnemy"){
                let char = characters[charIndex] as FixPositionRespawnEnemyCharacter;
                let topLeftMapKeyPos: Position = {
                    x: Number.parseInt(key.split('_')[0]) * chunkSize,
                    y: Number.parseInt(key.split('_')[1]) * chunkSize
                }
                if(char.spawnPosition.x > topLeftMapKeyPos.x 
                    && char.spawnPosition.x < topLeftMapKeyPos.x + chunkSize
                    && char.spawnPosition.y > topLeftMapKeyPos.y
                    && char.spawnPosition.y < topLeftMapKeyPos.y + chunkSize
                ){
                    createdEnemiesForChunk.chunks[key] = true;
                    break;
                }
            }
        }
    }
}

function alertCloseEnemies(enemy: FixPositionRespawnEnemyCharacter, game: Game) {
    if (enemy.alertEnemyRange === undefined) return;
    let charactersInDistance = determineCharactersInDistance(enemy, game.state.characters, enemy.alertEnemyRange);

    for (let i = 0; i < charactersInDistance.length; i++) {
        if (charactersInDistance[i].type === enemy.type) {
            let fixPosEnemy: FixPositionRespawnEnemyCharacter = charactersInDistance[i] as FixPositionRespawnEnemyCharacter;
            if (!fixPosEnemy.isAggroed) {
                fixPosEnemy.isAggroed = true;
            }
        }
    }
}

function respawnLogic(enemy: FixPositionRespawnEnemyCharacter, game: Game) {
    if (!enemy.respawnOnTime) {
        enemy.respawnOnTime = game.state.time + enemy.respawnTime;
    } else if (enemy.respawnOnTime <= game.state.time) {
        let closest = determineClosestCharacterToEnemySpawn(enemy, getPlayerCharacters(game.state.characters));
        if (closest.minDistance > 500) {
            resetEnemy(enemy);
        }
    }
}

function determineClosestCharacterToEnemySpawn(character: FixPositionRespawnEnemyCharacter, characters: Character[]) {
    let minDistance: number = 0;
    let minDistanceCharacter: Character | null = null;

    for (let i = 0; i < characters.length; i++) {
        let distance = calculateDistance(character.spawnPosition, characters[i]);
        if (minDistanceCharacter === null || minDistance > distance) {
            minDistance = distance;
            minDistanceCharacter = characters[i];
        }
    }
    return { minDistanceCharacter, minDistance };
}

function resetEnemy(enemy: FixPositionRespawnEnemyCharacter) {
    enemy.hp = enemy.maxHp;
    enemy.isDead = false;
    enemy.x = enemy.spawnPosition.x;
    enemy.y = enemy.spawnPosition.y;
    delete enemy.respawnOnTime;
}

function createEnemy(
    game: Game,
    x: number,
    y: number,
    size: number,
    moveSpeed: number,
    hp: number,
    damage: number
): FixPositionRespawnEnemyCharacter {
    let enemy = createCharacter(game, x, y, size, "black", moveSpeed, hp, damage, "enemy", "fixPositionRespawnEnemy");
    return {
        ...enemy,
        autoAggroRange: 200,
        spawnPosition: { x, y },
        respawnTime: 30000,
        isAggroed: false,
        maxAggroRange: 400,
        alertEnemyRange: 100,
    };
}