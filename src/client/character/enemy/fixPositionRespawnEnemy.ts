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
    let mapCenter = {x:0, y:0};
    let minSpawnDistanceFromMapCenter = 400;

    let topLeftMapKeyPos: Position = {
        x: chunkJ * chunkSize,
        y: chunkI * chunkSize
    }
    let centerMapKeyPos: Position = {
        x: topLeftMapKeyPos.x + chunkSize / 2,
        y: topLeftMapKeyPos.y + chunkSize / 2
    }
    let distance = calculateDistance(mapCenter, centerMapKeyPos);
    if (minSpawnDistanceFromMapCenter < distance) {
        for (let i = 0; i < chunk.tiles.length; i++) {
            for (let j = 0; j < chunk.tiles[i].length; j++) {
                let enemyPos: Position = {
                    x: topLeftMapKeyPos.x + j * map.tileSize + map.tileSize / 2,
                    y: topLeftMapKeyPos.y + i * map.tileSize + map.tileSize / 2
                }
                distance = calculateDistance(mapCenter, enemyPos);
                if (minSpawnDistanceFromMapCenter < distance) {
                    if (!isPositionBlocking(enemyPos, map, idCounter)) {
                        let strenghFaktor = Math.max((distance - 100) / 100, 1);
                        let hp = 1 * strenghFaktor;
                        let moveSpeed = 1 + (Math.log10(strenghFaktor)/10);
                        let size = 5 + Math.log10(strenghFaktor);
                        let damage = 1 + Math.log10(strenghFaktor);
                        chunk.characters.push(createEnemy(idCounter, enemyPos.x, enemyPos.y, size, moveSpeed, hp, damage));
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
        if (closest.minDistance > 500) {
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

function createEnemy(
    idCounter: IdCounter,
    x: number,
    y: number,
    size: number,
    moveSpeed: number,
    hp: number,
    damage: number
): FixPositionRespawnEnemyCharacter {
    let enemy = createCharacter(getNextId(idCounter), x, y, size, "black", moveSpeed, hp, damage, "enemy", "fixPositionRespawnEnemy");
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