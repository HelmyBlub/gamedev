import { getNextId } from "../../game.js";
import { Game, IdCounter, Position } from "../../gameModel.js";
import { addEnemyToMap, GameMap, positionToMapKey } from "../../map/map.js";
import { RandomSeed } from "../../randomNumberGenerator.js";
import { getPlayerCharacters, determineClosestCharacter, determineEnemyHitsPlayer, determineEnemyMoveDirection, moveCharacterTick, countCharacters, getSpawnPositionAroundPlayer } from "../character.js";
import { Character, createCharacter, ENEMY_FACTION } from "../characterModel.js";
import { PathingCache } from "../pathing.js";

export type RandomSpawnFollowingEnemyCharacter = Character & {
    spawnTime: number,
}

export function createRandomSpawnFollowingEnemy(game: Game) {
    let maxEnemies = Math.min(Math.max(10, game.state.time / 2000), 100);
    if (countCharacters(game.state.map) > maxEnemies) return;

    let pos: Position | null = null;
    let hpFactor = Math.pow(1.10, Math.ceil(game.state.time / 2500));
    let hp = Math.max(1, 1 * hpFactor);

    let playerCharacter = getPlayerCharacters(game.state.players);

    for (let i = 0; i < playerCharacter.length; i++) {
        pos = getSpawnPositionAroundPlayer(playerCharacter[i], game.state.randomSeed, game.state.map, game.state.idCounter);
        if (pos) {
            addEnemyToMap(game.state.map, createEnemy(game, pos.x, pos.y, hp));
        }
    }
}

export function tickRandomSpawnFollowingEnemyCharacter(enemy: RandomSpawnFollowingEnemyCharacter, game: Game, pathingCache: PathingCache) {
    if (enemy.isDead) {
        removeEnemy(enemy, game.state.map);
    } else {
        let playerCharacters = getPlayerCharacters(game.state.players);
        let closestPlayer = determineClosestCharacter(enemy, playerCharacters).minDistanceCharacter;
        determineEnemyMoveDirection(enemy, closestPlayer, game.state.map, pathingCache, game.state.idCounter, game.state.time);
        determineEnemyHitsPlayer(enemy, closestPlayer, game);
        increaseEnemyMovementSpeedAfterTime(enemy, game.state.time);
        teleportFarEnemy(enemy, playerCharacters, game.state.randomSeed, game.state.map, game.state.idCounter);
        moveCharacterTick(enemy, game.state.map, game.state.idCounter, false);
    }
}

function removeEnemy(enemy: RandomSpawnFollowingEnemyCharacter, map: GameMap) {
    const chunkKey = positionToMapKey(enemy, map);
    let characters = map.chunks[chunkKey].characters;
    for (let i = 0; i < characters.length; i++) {
        if (characters[i] === enemy) {
            characters.splice(i, 1);
            return;
        }
    }
}

function teleportFarEnemy(enemy: RandomSpawnFollowingEnemyCharacter, playerCharacters: Character[], randomSeed: RandomSeed, map: GameMap, idCounter: IdCounter) {
    let closest = determineClosestCharacter(enemy, playerCharacters);
    if (closest.minDistanceCharacter && closest.minDistance > 500) {
        let newPos = getSpawnPositionAroundPlayer(closest.minDistanceCharacter, randomSeed, map, idCounter);
        if (newPos) {
            enemy.x = newPos.x;
            enemy.y = newPos.y;
        }
    }
}

function increaseEnemyMovementSpeedAfterTime(enemy: RandomSpawnFollowingEnemyCharacter, gameTime: number) {
    if (enemy.spawnTime + 15000 < gameTime) {
        enemy.moveSpeed = (gameTime - enemy.spawnTime) / 15000;
    }
}

function createEnemy(game: Game, x: number, y: number, hp: number): RandomSpawnFollowingEnemyCharacter {
    let enemy: Character = createCharacter(getNextId(game.state.idCounter), x, y, 5, 5, "black", 0.5, hp, 1, ENEMY_FACTION, "randomSpawnFollowingEnemy", 1);
    let randomEnemy = { ...enemy, spawnTime: game.state.time };

    return randomEnemy;
}
