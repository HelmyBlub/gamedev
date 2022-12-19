import { calculateDistance, calculateDirection } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { GameMap } from "../../map/map.js";
import { RandomSeed } from "../../randomNumberGenerator.js";
import { getPlayerCharacters, determineClosestCharacter } from "../character.js";
import { getSpawnPositionAroundPlayer, Character, createCharacter, ENEMY_FACTION } from "../characterModel.js";
import { getNextWaypoint, PathingCache } from "../pathing.js";

export function createRandomEnemy(game: Game) {
    let maxEnemies = Math.min(Math.max(10, game.state.time / 2000), 100);
    if (game.state.characters.length > maxEnemies) return;

    let pos: Position | null = null;
    let hpFactor = Math.pow(1.10, Math.ceil(game.state.time / 2500));
    let hp = Math.max(1, 1 * hpFactor);

    let playerCharacter = getPlayerCharacters(game.state.characters);

    for (let i = 0; i < playerCharacter.length; i++) {
        pos = getSpawnPositionAroundPlayer(playerCharacter[i], game.state.randomSeed, game.state.map);
        if (pos) {
            game.state.characters.push(createEnemy(game, pos.x, pos.y, hp));
        }
    }
}

export function tickEnemyCharacter(enemy: Character, playerCharacters: Character[], map: GameMap, pathingCache: PathingCache, gameTime: number, randomSeed: RandomSeed) {
    let closestPlayer = determineClosestCharacter(enemy, playerCharacters).minDistanceCharacter;
    determineEnemyMoveDirection(enemy, closestPlayer, map, pathingCache);
    determineEnemyHitsPlayer(enemy, closestPlayer);
    increaseEnemyMovementSpeedAfterTime(enemy, gameTime);
    teleportFarEnemy(enemy, playerCharacters, randomSeed, map);
}


function teleportFarEnemy(enemy: Character, playerCharacters: Character[], randomSeed: RandomSeed, map: GameMap) {
    let closest = determineClosestCharacter(enemy, playerCharacters);
    if (closest.minDistanceCharacter && closest.minDistance > 500) {
        let newPos = getSpawnPositionAroundPlayer(closest.minDistanceCharacter, randomSeed, map);
        if (newPos) {
            enemy.x = newPos.x;
            enemy.y = newPos.y;
        }
    }
}

function increaseEnemyMovementSpeedAfterTime(enemy: Character, gameTime: number){
    if(enemy.spawnTime + 15000 < gameTime){
        enemy.moveSpeed = (gameTime - enemy.spawnTime) / 15000;
    }
}

function determineEnemyHitsPlayer(enemy: Character, closestPlayer: Character | null) {
    if (closestPlayer === null) return;

    let distance = calculateDistance(enemy, closestPlayer);
    if (distance <= enemy.size + closestPlayer.size) {
        closestPlayer.hp -= enemy.damage;
    }
}

function determineEnemyMoveDirection(enemy: Character, closestPlayer: Character | null, map: GameMap, pathingCache: PathingCache) {
    if (closestPlayer === null) {
        enemy.isMoving = false;
        return;
    }
    enemy.isMoving = true;
    let nextWayPoint: Position | null = getNextWaypoint(enemy, closestPlayer, map, pathingCache);
    if (nextWayPoint === null) {
        enemy.isMoving = false;
        return;
    }
    enemy.moveDirection = calculateDirection(enemy, nextWayPoint);
}

function createEnemy(game: Game, x: number, y: number, hp: number): Character {
    return createCharacter(game, x, y, 5, "black", 0.5, hp, 1, ENEMY_FACTION, true, game.state.time);
}
