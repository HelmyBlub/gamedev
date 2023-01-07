import { calculateDistance, getNextId } from "../../game.js";
import { Game, IdCounter, Position } from "../../gameModel.js";
import { GameMap, isPositionBlocking, MapChunk, positionToMapKey } from "../../map/map.js";
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

type EnemyTypes = {
    [key: string]: EnemyType
}

type EnemyType = {
    hpFactor: number,
    sizeFactor: number,
}

const ENEMY_TYPES: EnemyTypes = {
    "big": {hpFactor: 2, sizeFactor: 1.5},
    "default": {hpFactor: 1, sizeFactor: 1},
    "small": {hpFactor: 0.5, sizeFactor: 0.75},
}

export function createFixPositionRespawnEnemiesOnInit(game: Game){
    let map = game.state.map;
    let existingMapKeys = Object.keys(map.chunks);
    for(let i = 0; i< existingMapKeys.length; i++){
        let chunk = map.chunks[existingMapKeys[i]];
        if(chunk.characters.length === 0){
            let chunkI = parseInt(existingMapKeys[i].split("_")[0]);
            let chunkJ = parseInt(existingMapKeys[i].split("_")[1]);        
            createFixPositionRespawnEnemies(chunk, chunkI, chunkJ, map, game.state.idCounter);
        }
    }
}

export function createFixPositionRespawnEnemies(chunk: MapChunk, chunkI: number, chunkJ: number, map: GameMap, idCounter: IdCounter) {
    if(chunk.characters.length > 0){
        console.log("unexpected existence of characers in mapChunk", chunk, chunkI, chunkJ);
    }

    let chunkSize = map.tileSize * map.chunkLength;
    let mapCenter = {x:chunkSize/2, y:chunkSize/2};
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
    if(chunkI > 0 && Math.abs(chunkI) >= Math.abs(chunkJ)){
        enemyType = "big";
    }else if(chunkI < 0 && Math.abs(chunkI) >= Math.abs(chunkJ)){
        enemyType = "small";
    }else{
        enemyType = "default";
    }
    if (minSpawnDistanceFromMapCenter < chunkDistance + chunkSize) {
        for (let i = 0; i < chunk.tiles.length; i++) {
            for (let j = 0; j < chunk.tiles[i].length; j++) {
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

export function tickFixPositionRespawnEnemyCharacter(enemy: FixPositionRespawnEnemyCharacter, game: Game, pathingCache: PathingCache) {
    if (enemy.isDead) {
        if (enemy.wasHitRecently && !enemy.isAggroed) {
            alertCloseEnemies(enemy, game);
            delete enemy.wasHitRecently;
        }
        respawnLogic(enemy, game);
    } else {
        if (enemy.nextTickTime == undefined || game.state.time >= enemy.nextTickTime || enemy.wasHitRecently) {
            let playerCharacters = getPlayerCharacters(game.state.players);
            let closest = determineClosestCharacter(enemy, playerCharacters);
            let aggroed = closest.minDistance <= enemy.autoAggroRange
                || (enemy.isAggroed && closest.minDistance <= enemy.maxAggroRange)
                || (enemy.wasHitRecently && closest.minDistance <= enemy.maxAggroRange);
            if (aggroed) {
                enemy.isAggroed = true;
                if (enemy.wasHitRecently) {
                    alertCloseEnemies(enemy, game);
                }
                determineEnemyMoveDirection(enemy, closest.minDistanceCharacter, game.state.map, pathingCache, game.state.idCounter);
                determineEnemyHitsPlayer(enemy, closest.minDistanceCharacter);
            } else {
                let spawnDistance = calculateDistance(enemy, enemy.spawnPosition);
                enemy.isAggroed = false;
                if (spawnDistance > game.state.map.tileSize / 2) {
                    determineEnemyMoveDirection(enemy, enemy.spawnPosition, game.state.map, pathingCache, game.state.idCounter);
                } else {
                    enemy.nextTickTime = game.state.time + closest.minDistance;
                    enemy.isMoving = false;
                }
            }
            moveCharacterTick(enemy, game.state.map, game.state.idCounter, false);
            if (enemy.wasHitRecently) delete enemy.wasHitRecently;
        }
    }
}

function alertCloseEnemies(enemy: FixPositionRespawnEnemyCharacter, game: Game) {
    if (enemy.alertEnemyRange === undefined) return;
    let charactersInDistance = determineCharactersInDistance(enemy, game.state.map, enemy.alertEnemyRange);

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
        let closest = determineClosestCharacterToEnemySpawn(enemy, getPlayerCharacters(game.state.players));
        if (closest.minDistance > enemy.autoAggroRange + 100) {
            resetEnemy(enemy, game.state.map);
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

function resetEnemy(enemy: FixPositionRespawnEnemyCharacter, map: GameMap) {
    enemy.hp = enemy.maxHp;
    enemy.isDead = false;
    enemy.isAggroed = false;
    let deathMapChunkKey = positionToMapKey(enemy, map);
    let spawnMapChunkKey = positionToMapKey(enemy.spawnPosition, map);
    if(deathMapChunkKey !== spawnMapChunkKey){
        map.chunks[deathMapChunkKey].characters = map.chunks[deathMapChunkKey].characters.filter( char => char !== enemy);
        map.chunks[spawnMapChunkKey].characters.push(enemy);
    }
    enemy.x = enemy.spawnPosition.x;
    enemy.y = enemy.spawnPosition.y;
    delete enemy.respawnOnTime;
}

function createEnemyWithLevel(idCounter: IdCounter, enemyPos: Position, level: number, enemyType: EnemyType){
    if(enemyType === undefined){
        throw Error("enemy type unknwon" + enemyType);
    }
    let colors = ["black", "green", "blue", "red"];
    let hp = 5 * Math.pow(level, 3) * enemyType.hpFactor;
    let moveSpeed = Math.min(20, 1 + level/5);
    let size = Math.min(40, (10 + 5 * Math.floor(level/colors.length + 1)) * enemyType.sizeFactor);
    let damage = level;
    let color = colors[level%colors.length];
    let autoAggroRange = Math.min(750, 50 + level * 50); 
    let alertEnemyRange = Math.min(500, 50 + level * 25);
    let respawnTime = Math.max(1000, 30000 - level * 1000);

    return createEnemy(idCounter, enemyPos.x, enemyPos.y, size, moveSpeed, hp, damage, color, autoAggroRange, alertEnemyRange, respawnTime);
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
): FixPositionRespawnEnemyCharacter {
    let enemy = createCharacter(getNextId(idCounter), x, y, size, color, moveSpeed, hp, damage, "enemy", "fixPositionRespawnEnemy");
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