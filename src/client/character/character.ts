import { levelingCharacterXpGain, tickPlayerCharacter } from "./levelingCharacter.js";
import { GameMap, isPositionBlocking } from "../map/map.js";
import { Projectile } from "../projectile.js";
import { Character, ENEMY_FACTION, PLAYER_FACTION } from "./characterModel.js";
import { createPathingCache, getNextWaypoint, PathingCache } from "./pathing.js";
import { LevelingCharacter, UpgradeOption } from "./levelingCharacterModel.js";
import { calculateDistance, calculateDirection } from "../game.js";
import { Position, Game, GameState } from "../gameModel.js";
import { tickEnemyCharacter } from "./enemy/randomSpawnFollowingEnemy.js";
import { RandomSeed } from "../randomNumberGenerator.js";

export function paintCharacters(ctx: CanvasRenderingContext2D, characters: Character[], cameraPosition: Position) {
    for (let i = 0; i < characters.length; i++) {
        paintCharacter(ctx, characters[i], cameraPosition);
    }
}

export function findCharacterById(characters: Character[], id: number): Character | null {
    for (let i = 0; i < characters.length; i++) {
        if (characters[i].id === id) {
            return characters[i];
        }
    }
    return null;
}

export function tickCharacters(characters: Character[], projectiles: Projectile[], gameTime: number, game: Game, randomSeed: RandomSeed) {
    let pathingCache =  createPathingCache();
    for (let i = 0; i < characters.length; i++) {
        if (characters[i].faction === PLAYER_FACTION) {
            tickPlayerCharacter(characters[i] as LevelingCharacter, projectiles, gameTime, game.state.randomSeed);
        } else if (characters[i].faction === ENEMY_FACTION) {
            tickEnemyCharacter(characters[i], getPlayerCharacters(characters), game.state.map,pathingCache, gameTime, randomSeed);
        }
        moveCharacterTick(characters[i], game.state.map);
    }
}

export function getPlayerCharacters(characters: Character[]) {
    let playerCharacters = [];
    for (let i = 0; i < characters.length; i++) {
        if (characters[i].faction === PLAYER_FACTION) {
            playerCharacters.push(characters[i]);
        }
    }
    return playerCharacters;
}

export function determineClosestCharacter(character: Character, characters: Character[]) {
    let minDistance: number = 0;
    let minDistanceCharacter: Character | null = null;

    for (let i = 0; i < characters.length; i++) {
        let distance = calculateDistance(character, characters[i]);
        if (minDistanceCharacter === null || minDistance > distance) {
            minDistance = distance;
            minDistanceCharacter = characters[i];
        }
    }
    return { minDistanceCharacter, minDistance };
}

export function detectCharacterDeath(characters: Character[], state: GameState, upgradeOptions: Map<string, UpgradeOption>) {
    for (let charIt = characters.length - 1; charIt >= 0; charIt--) {
        if (characters[charIt].hp <= 0) {
            if (characters[charIt].faction === ENEMY_FACTION) {
                levelingCharacterXpGain(state, characters[charIt], upgradeOptions);
                state.killCounter++;
            }
            characters.splice(charIt, 1);
        }
    }
}

export function countAlivePlayerCharacters(characters: Character[]) {
    let counter = 0;
    for (let charIt = characters.length - 1; charIt >= 0; charIt--) {
        if (characters[charIt].faction === PLAYER_FACTION) counter++;
    }
    return counter;
}

function moveCharacterTick(character: Character, map: GameMap) {
    if (character.isMoving) {
        let x = character.x + Math.cos(character.moveDirection) * character.moveSpeed;
        let y = character.y + Math.sin(character.moveDirection) * character.moveSpeed;
        let blocking = isPositionBlocking({ x, y }, map);
        if (!blocking) {
            character.x = x;
            character.y = y;
        }
    }
}

function paintCharacter(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position) {
    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;
    ctx.fillStyle = character.color;
    ctx.beginPath();
    ctx.arc(
        character.x - cameraPosition.x + centerX,
        character.y - cameraPosition.y + centerY,
        character.size, 0, 2 * Math.PI);
    ctx.fill();
}