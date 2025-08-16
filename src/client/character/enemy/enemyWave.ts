import { transformFixPositionRespawnEnemyToWaveEnemy } from "../../gameModeBaseDefense.js";
import { Game, Position } from "../../gameModel.js";
import { GameMap } from "../../map/map.js";
import { calculateAndSetMoveDirectionToPositionWithPathing, determineClosestCharacter, getPlayerCharacters, moveCharacterTick, setCharacterPosition } from "../character.js";
import { Character, CHARACTER_TYPE_FUNCTIONS } from "../characterModel.js";
import { PathingCache } from "../pathing.js";
import { createFixPosEnemyWithLevel, ENEMY_TYPES } from "./fixPositionRespawnEnemyModel.js";

export type EnemyWaveCharacter = Character & {
    spawnPosition: Position,
    respawnTime: number,
    enemyTypeKey: string,
    testPorperty: number,
    positionReseted?: boolean,
}

export const CHARACTER_TYPE_ENEMY_WAVE = "WaveEnemy";

export function addEnemyWave() {
    CHARACTER_TYPE_FUNCTIONS[CHARACTER_TYPE_ENEMY_WAVE] = {
        tickFunction: tickEnemy,
    }
}

function tickEnemy(character: Character, game: Game, pathingCache: PathingCache | null) {
    if (pathingCache === null) {
        console.log("enemy needs pathing cache");
        return;
    }
    const enemy = character as EnemyWaveCharacter;
    if (enemy.state === "dead") {
        respawnLogic(enemy, game);
        return;
    }
    game.state.gameModeData!.enemyAliveTickCount++;
    const playerCharacters = getPlayerCharacters(game.state.players, true);
    const closest = determineClosestCharacter(enemy, playerCharacters, true, game.state.map);
    calculateAndSetMoveDirectionToPositionWithPathing(enemy, closest.minDistanceCharacter, game.state.map, pathingCache, game.state.idCounter, game.state.time, game);
    if (!enemy.isMoving) {

    }
    moveCharacterTick(enemy, game.state.map, game.state.idCounter, game);
}

function respawnLogic(enemy: EnemyWaveCharacter, game: Game) {
    if (!enemy.positionReseted) {
        resetPosition(enemy, game.state.map);
        enemy.positionReseted = true;
    } else if (game.state.gameModeData!.currentWave >= enemy.level!.level) {
        game.state.gameModeData!.enemyAliveTickCount++;
        upgradeEnemy(enemy, game);
        enemy.positionReseted = undefined;
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