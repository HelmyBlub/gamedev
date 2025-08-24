import { ABILITIES_FUNCTIONS } from "../../ability/ability.js";
import { calculateDirection, calculateDistance } from "../../game.js";
import { transformFixPositionRespawnEnemyToWaveEnemy } from "../../gameModeBaseDefense.js";
import { Game, Position } from "../../gameModel.js";
import { calculateMovePosition, GameMap, getMapMidlePosition, isPositionBlocking } from "../../map/map.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { calculateAndSetMoveDirectionToPositionWithPathing, determineClosestCharacter, getPlayerCharacters, moveCharacterTick, setCharacterPosition } from "../character.js";
import { Character, CHARACTER_TYPE_FUNCTIONS } from "../characterModel.js";
import { getNextWaypoint, PathingCache } from "../pathing.js";
import { createFixPosEnemyWithLevel, ENEMY_TYPES } from "./fixPositionRespawnEnemyModel.js";

export type EnemyWaveCharacter = Character & {
    spawnPosition: Position,
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
    for (let ability of enemy.abilities) {
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions) {
            if (abilityFunctions.tickAI) abilityFunctions.tickAI(enemy, ability, game);
        }
    }

    const playerCharacters = getPlayerCharacters(game.state.players, true);
    const closest = determineClosestCharacter(enemy, playerCharacters, true, game.state.map);
    calculateAndSetMoveDirectionToPositionWithPathing(enemy, closest.minDistanceCharacter, game.state.map, pathingCache, game.state.idCounter, game.state.time, game);
    moveCharacterTick(enemy, game.state.map, game.state.idCounter, game);
}

function respawnLogic(enemy: EnemyWaveCharacter, game: Game) {
    if (!enemy.positionReseted) {
        resetPosition(enemy, game.state.map, game);
        enemy.positionReseted = true;
    } else if (game.state.gameModeData!.currentWave >= enemy.level!.level) {
        game.state.gameModeData!.enemyAliveTickCount++;
        upgradeEnemy(enemy, game);
        enemy.positionReseted = undefined;
    }
}

function upgradeEnemy(enemy: EnemyWaveCharacter, game: Game) {
    const upgradedEnemy = createFixPosEnemyWithLevel(game.state.idCounter, { x: enemy.x, y: enemy.y }, game.state.gameModeData!.currentWave + 1, ENEMY_TYPES[enemy.enemyTypeKey], enemy.enemyTypeKey, game);
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

function resetPosition(enemy: EnemyWaveCharacter, map: GameMap, game: Game) {
    if (enemy.level!.level <= 1) {
        setSpawnToOutside(enemy, map, game);
    }
    setCharacterPosition(enemy, enemy.spawnPosition, map);
    if (enemy.pets) {
        for (let pet of enemy.pets) {
            pet.x = enemy.x;
            pet.y = enemy.y;
        }
    }
}

function setSpawnToOutside(enemy: EnemyWaveCharacter, map: GameMap, game: Game) {
    const desiredDistance = 1000;
    const randomisedDesiredDistance = desiredDistance * (1 - (nextRandom(game.state.randomSeed) * 0.3 - 0.15));
    const mapMiddle = getMapMidlePosition(map);
    const distance = calculateDistance(enemy.spawnPosition, mapMiddle);
    const moveFactor = randomisedDesiredDistance / distance;
    let positionOffset: Position = { x: (enemy.spawnPosition.x - mapMiddle.x) * moveFactor, y: (enemy.spawnPosition.y - mapMiddle.y) * moveFactor };
    let newPosition: Position = { x: mapMiddle.x + positionOffset.x, y: mapMiddle.y + positionOffset.y };
    let count = 0;
    const maxCount = 100;
    while (!isValidSpawnPosition(newPosition, game)) {
        const random = nextRandom(game.state.randomSeed) * Math.PI * 2;
        positionOffset.x = randomisedDesiredDistance * Math.sin(random);
        positionOffset.y = randomisedDesiredDistance * Math.cos(random);
        newPosition = { x: mapMiddle.x + positionOffset.x, y: mapMiddle.y + positionOffset.y };
        count++;
        if (count > maxCount) {
            console.log("can this happen?");
            return;
        }
    }
    enemy.spawnPosition.x = newPosition.x;
    enemy.spawnPosition.y = newPosition.y;
}

function isValidSpawnPosition(position: Position, game: Game) {
    if (!isPositionBlocking(position, game.state.map, game.state.idCounter, game)) {
        const nextWayPoint = getNextWaypoint(position, getMapMidlePosition(game.state.map), game.performance.pathingCache, game.state.time, game);
        if (nextWayPoint) {
            return true;
        }
    }
    return false;
}