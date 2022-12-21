import { levelingCharacterXpGain } from "./levelingCharacter.js";
import { GameMap, isPositionBlocking } from "../map/map.js";
import { Character, CHARACTER_TYPES_STUFF, ENEMY_FACTION, PLAYER_FACTION } from "./characterModel.js";
import { createPathingCache, getNextWaypoint, PathingCache } from "./pathing.js";
import { UpgradeOption } from "./levelingCharacterModel.js";
import { calculateDirection, calculateDistance } from "../game.js";
import { Position, Game, GameState } from "../gameModel.js";

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

export function tickCharacters(characters: Character[], game: Game) {
    let pathingCache =  createPathingCache();
    for (let i = characters.length - 1; i >= 0; i--) {
        CHARACTER_TYPES_STUFF[characters[i].type].tickFunction(characters[i], game, pathingCache);
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

export function determineCharactersInDistance(character: Character, characters: Character[], maxDistance: number): Character[] {
    let result: Character[] = [];

    for (let i = 0; i < characters.length; i++) {
        if(characters[i] === character) continue;
        let distance = calculateDistance(character, characters[i]);
        if (maxDistance >= distance) {
            result.push(characters[i]);
        }
    }
    return result;
}

export function detectCharacterDeath(characters: Character[], state: GameState, upgradeOptions: Map<string, UpgradeOption>) {
    for (let charIt = characters.length - 1; charIt >= 0; charIt--) {
        if (characters[charIt].hp <= 0 && !characters[charIt].isDead) {
            if (characters[charIt].faction === ENEMY_FACTION) {
                levelingCharacterXpGain(state, characters[charIt], upgradeOptions);
                state.killCounter++;
            }
            characters[charIt].isDead = true;
        }
    }
}

export function countAlivePlayerCharacters(characters: Character[]) {
    let counter = 0;
    for (let charIt = characters.length - 1; charIt >= 0; charIt--) {
        if (characters[charIt].faction === PLAYER_FACTION && !characters[charIt].isDead) counter++;
    }
    return counter;
}

export function determineEnemyHitsPlayer(enemy: Character, closestPlayer: Character | null) {
    if (closestPlayer === null) return;

    let distance = calculateDistance(enemy, closestPlayer);
    if (distance <= enemy.size + closestPlayer.size) {
        closestPlayer.hp -= enemy.damage;
    }
}

export function determineEnemyMoveDirection(enemy: Character, closestPlayerPosition: Position | null, map: GameMap, pathingCache: PathingCache) {
    if (closestPlayerPosition === null) {
        enemy.isMoving = false;
        return;
    }
    enemy.isMoving = true;
    let nextWayPoint: Position | null = getNextWaypoint(enemy, closestPlayerPosition, map, pathingCache);
    if (nextWayPoint === null) {
        enemy.isMoving = false;
        return;
    }
    enemy.moveDirection = calculateDirection(enemy, nextWayPoint);
}

export function moveCharacterTick(character: Character, map: GameMap) {
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
    if(character.isDead) return;
    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;
    let paintX = character.x - cameraPosition.x + centerX;
    let paintY = character.y - cameraPosition.y + centerY;
    if(paintX < -character.size || paintX > ctx.canvas.width 
        || paintY < -character.size || paintY > ctx.canvas.height) return;
    ctx.fillStyle = character.color;
    ctx.beginPath();
    ctx.arc(
        paintX,
        paintY,
        character.size, 0, 2 * Math.PI);
    ctx.fill();
}