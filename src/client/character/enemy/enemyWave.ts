import { Game, Position } from "../../gameModel.js";
import { determineMapKeysInDistance, GameMap, mapKeyToChunkXY } from "../../map/map.js";
import { calculateAndSetMoveDirectionToPositionWithPathing, determineClosestCharacter, getPlayerCharacters, moveCharacterTick, setCharacterPosition } from "../character.js";
import { Character, CHARACTER_TYPE_FUNCTIONS } from "../characterModel.js";
import { chunkGraphRectangleSetup, PathingCache } from "../pathing.js";
import { CHARACTER_TYPE_ENEMY_FIX_RESPAWN_POSITION, createFixPosEnemyWithLevel, ENEMY_TYPES, FixPositionRespawnEnemyCharacter } from "./fixPositionRespawnEnemyModel.js";

export type EnemyWaveCharacter = Character & {
    spawnPosition: Position,
    respawnOnTime?: number,
    respawnTime: number,
    enemyTypeKey: string,
    testPorperty: number,
}

export const CHARACTER_TYPE_ENEMY_WAVE = "WaveEnemy";
export const GAME_MODE_WAVE_DEFENSE = "WaveDefense";

export function addEnemyWave() {
    CHARACTER_TYPE_FUNCTIONS[CHARACTER_TYPE_ENEMY_WAVE] = {
        tickFunction: tickEnemy,
    }
}

export function startBaseDefenseMode(game: Game) {
    if (game.state.timeFirstKill != undefined) return;
    game.state.gameMode = GAME_MODE_WAVE_DEFENSE;
    game.state.timeFirstKill = game.state.time;
    determineActiveChunksForDefenseMode(game.state.map, game);
    transformFixPositionRespawnEnemiesToWaveEnemies(game);
}

function determineActiveChunksForDefenseMode(map: GameMap, game: Game) {
    const keySet: Set<string> = new Set();
    const nearMapKeys = determineMapKeysInDistance({ x: 0, y: 0 }, map, map.activeChunkRange, false);
    for (let mapKey of nearMapKeys) {
        keySet.add(mapKey);
        if (!game.performance.chunkGraphRectangles[mapKey]) {
            chunkGraphRectangleSetup(mapKeyToChunkXY(mapKey), game);
        }
    }
    map.activeChunkKeys = [...keySet];
}


function tickEnemy(character: Character, game: Game, pathingCache: PathingCache | null) {
    if (pathingCache === null) {
        console.log("enemy needs pathing cache");
        return;
    }
    const enemy = character as EnemyWaveCharacter;
    if (enemy.state === "dead") respawnLogic(enemy, game);

    const playerCharacters = getPlayerCharacters(game.state.players, true);
    const closest = determineClosestCharacter(enemy, playerCharacters, true, game.state.map);
    calculateAndSetMoveDirectionToPositionWithPathing(enemy, closest.minDistanceCharacter, game.state.map, pathingCache, game.state.idCounter, game.state.time, game);
    moveCharacterTick(enemy, game.state.map, game.state.idCounter, game);
}

function transformFixPositionRespawnEnemiesToWaveEnemies(game: Game) {
    for (let chunkKey of game.state.map.activeChunkKeys) {
        const chunk = game.state.map.chunks[chunkKey];
        for (let enemy of chunk.characters) {
            if (enemy.type === CHARACTER_TYPE_ENEMY_FIX_RESPAWN_POSITION) {
                transformFixPositionRespawnEnemyToWaveEnemy(enemy as FixPositionRespawnEnemyCharacter);
            }
        }
    }
}

function transformFixPositionRespawnEnemyToWaveEnemy(fixPositionEnemy: FixPositionRespawnEnemyCharacter) {
    delete fixPositionEnemy.alertEnemyRange;
    delete (fixPositionEnemy as any).autoAggroRange;
    delete (fixPositionEnemy as any).maxAggroRange;
    delete (fixPositionEnemy as any).isAggroed;
    delete fixPositionEnemy.nextTickTime;
    fixPositionEnemy.respawnTime = 10000;
    (fixPositionEnemy as any as EnemyWaveCharacter).testPorperty = 1;
    fixPositionEnemy.type = CHARACTER_TYPE_ENEMY_WAVE;
}

function respawnLogic(enemy: EnemyWaveCharacter, game: Game) {
    if (!enemy.respawnOnTime) {
        enemy.respawnOnTime = game.state.time + enemy.respawnTime;
        resetPosition(enemy, game.state.map);
    } else if (enemy.respawnOnTime <= game.state.time) {
        upgradeEnemy(enemy, game);
        enemy.respawnOnTime = undefined;
    }
}

function upgradeEnemy(enemy: EnemyWaveCharacter, game: Game) {
    const upgradedEnemy = createFixPosEnemyWithLevel(game.state.idCounter, { x: enemy.x, y: enemy.y }, enemy.level!.level + 1, ENEMY_TYPES[enemy.enemyTypeKey], enemy.enemyTypeKey, game);
    transformFixPositionRespawnEnemyToWaveEnemy(upgradedEnemy);
    enemy.maxHp = upgradedEnemy.maxHp;
    enemy.hp = upgradedEnemy.maxHp;
    enemy.state = "alive";
    enemy.abilities = upgradedEnemy.abilities;
    enemy.pets = upgradedEnemy.pets;
    enemy.level = upgradedEnemy.level;
    enemy.experienceWorth = upgradedEnemy.experienceWorth;
    enemy.width = upgradedEnemy.width;
    enemy.height = upgradedEnemy.height;
    enemy.paint = upgradedEnemy.paint;
    enemy.baseMoveSpeed = upgradedEnemy.baseMoveSpeed;
}

function resetPosition(enemy: EnemyWaveCharacter, map: GameMap) {
    setCharacterPosition(enemy, enemy.spawnPosition, map);
    if (enemy.pets) {
        for (let pet of enemy.pets) {
            pet.x = enemy.x;
            pet.y = enemy.y;
        }
    }
}