import { calculateDistance } from "../../game.js";
import { Game } from "../../gameModel.js";
import { GameMap, positionToMapKey } from "../../map/map.js";
import { determineCharactersInDistance, determineClosestCharacter, determineEnemyHitsPlayer, determineEnemyMoveDirection, getPlayerCharacters, moveCharacterTick } from "../character.js";
import { Character } from "../characterModel.js";
import { PathingCache } from "../pathing.js";
import { FixPositionRespawnEnemyCharacter } from "./fixPositionRespawnEnemyModel.js";

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
                determineEnemyMoveDirection(enemy, closest.minDistanceCharacter, game.state.map, pathingCache, game.state.idCounter, game.state.time);
                determineEnemyHitsPlayer(enemy, closest.minDistanceCharacter, game);
            } else {
                let spawnDistance = calculateDistance(enemy, enemy.spawnPosition);
                enemy.isAggroed = false;
                if (spawnDistance > game.state.map.tileSize / 2) {
                    determineEnemyMoveDirection(enemy, enemy.spawnPosition, game.state.map, pathingCache, game.state.idCounter, game.state.time);
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
    let charactersInDistance = determineCharactersInDistance(enemy, game.state.map, game.state.players, game.state.bossStuff.bosses, enemy.alertEnemyRange);

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
    if (deathMapChunkKey !== spawnMapChunkKey) {
        map.chunks[deathMapChunkKey].characters = map.chunks[deathMapChunkKey].characters.filter(char => char !== enemy);
        map.chunks[spawnMapChunkKey].characters.push(enemy);
    }
    if(enemy.wasHitRecently) delete enemy.wasHitRecently;
    enemy.x = enemy.spawnPosition.x;
    enemy.y = enemy.spawnPosition.y;
    delete enemy.respawnOnTime;
}