import { ABILITIES_FUNCTIONS } from "../../ability/ability.js";
import { calculateDistance } from "../../game.js";
import { Game } from "../../gameModel.js";
import { GameMap, positionToMapKey } from "../../map/map.js";
import { determineCharactersInDistance, determineClosestCharacter, calculateAndSetMoveDirectionToPositionWithPathing, getPlayerCharacters, moveMapCharacterTick, mapCharacterCheckForChunkChange } from "../character.js";
import { Character } from "../characterModel.js";
import { PathingCache } from "../pathing.js";
import { FixPositionRespawnEnemyCharacter } from "./fixPositionRespawnEnemyModel.js";

export function tickFixPositionRespawnEnemyCharacter(character: Character, game: Game, pathingCache: PathingCache | null) {
    if (pathingCache === null) {
        console.log("enemy needs pathing cache");
        return;
    }
    const enemy = character as FixPositionRespawnEnemyCharacter;
    if (enemy.isDead) {
        if (enemy.wasHitRecently && !enemy.isAggroed) {
            alertCloseEnemies(enemy, game);
            delete enemy.wasHitRecently;
        }
        respawnLogic(enemy, game);
    } else {
        if (enemy.nextTickTime == undefined || game.state.time >= enemy.nextTickTime || enemy.wasHitRecently) {
            const playerCharacters = getPlayerCharacters(game.state.players);
            const closest = determineClosestCharacter(enemy, playerCharacters, true, game.state.map);
            const aggroed = closest.minDistance <= enemy.autoAggroRange
                || (enemy.isAggroed && closest.minDistance <= enemy.maxAggroRange)
                || (enemy.wasHitRecently && closest.minDistance <= enemy.maxAggroRange);
            if (closest.minDistanceCharacter && aggroed) {
                enemy.isAggroed = true;
                if (enemy.wasHitRecently) {
                    alertCloseEnemies(enemy, game);
                }
                calculateAndSetMoveDirectionToPositionWithPathing(enemy, closest.minDistanceCharacter, game.state.map, pathingCache, game.state.idCounter, game.state.time, game);
                for (let ability of enemy.abilities) {
                    const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
                    if (abilityFunctions) {
                        if (abilityFunctions.tickBossAI) abilityFunctions.tickBossAI(enemy, ability, game);
                    }
                }            
            } else {
                const spawnDistance = calculateDistance(enemy, enemy.spawnPosition);
                enemy.isAggroed = false;
                if (spawnDistance > game.state.map.tileSize / 2) {
                    calculateAndSetMoveDirectionToPositionWithPathing(enemy, enemy.spawnPosition, game.state.map, pathingCache, game.state.idCounter, game.state.time, game);
                } else {
                    enemy.nextTickTime = game.state.time + closest.minDistance;
                    enemy.isMoving = false;
                }
            }
            moveMapCharacterTick(enemy, game.state.map, game.state.idCounter);
            if (enemy.wasHitRecently) delete enemy.wasHitRecently;
        }
    }
}

function alertCloseEnemies(enemy: FixPositionRespawnEnemyCharacter, game: Game) {
    if (enemy.alertEnemyRange === undefined) return;
    const charactersInDistance = determineCharactersInDistance(enemy, game.state.map, game.state.players, game.state.bossStuff.bosses, enemy.alertEnemyRange);

    for (let i = 0; i < charactersInDistance.length; i++) {
        if (charactersInDistance[i].type === enemy.type) {
            const fixPosEnemy: FixPositionRespawnEnemyCharacter = charactersInDistance[i] as FixPositionRespawnEnemyCharacter;
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
        const closest = determineClosestCharacterToEnemySpawn(enemy, getPlayerCharacters(game.state.players));
        if (closest.minDistance > enemy.autoAggroRange + 100) {
            resetEnemy(enemy, game.state.map);
        }
    }
}

function determineClosestCharacterToEnemySpawn(character: FixPositionRespawnEnemyCharacter, characters: Character[]) {
    let minDistance: number = 0;
    let minDistanceCharacter: Character | null = null;

    for (let i = 0; i < characters.length; i++) {
        const distance = calculateDistance(character.spawnPosition, characters[i]);
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
    if (enemy.wasHitRecently) delete enemy.wasHitRecently;
    mapCharacterCheckForChunkChange(enemy, map, enemy.spawnPosition.x, enemy.spawnPosition.y);
    enemy.x = enemy.spawnPosition.x;
    enemy.y = enemy.spawnPosition.y;
    if(enemy.pets){
        for(let pet of enemy.pets){
            pet.x = enemy.x;
            pet.y = enemy.y;
        }
    }
    delete enemy.respawnOnTime;
}