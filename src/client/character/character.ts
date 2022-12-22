import { levelingCharacterXpGain } from "./levelingCharacter.js";
import { GameMap, isPositionBlocking } from "../map/map.js";
import { Character, CHARACTER_TYPES_STUFF, ENEMY_FACTION, PLAYER_FACTION } from "./characterModel.js";
import { createPathingCache, getNextWaypoint, PathingCache } from "./pathing.js";
import { UpgradeOption } from "./levelingCharacterModel.js";
import { calculateDirection, calculateDistance } from "../game.js";
import { Position, Game, GameState, IdCounter } from "../gameModel.js";
import { Player } from "../player.js";

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

export function tickMapCharacters(map: GameMap, game: Game) {
    let pathingCache = createPathingCache();
    for (let i = 0; i < map.activeChunkKeys.length; i++) {
        let chunk = map.chunks[map.activeChunkKeys[i]];
        tickCharacters(chunk.characters, game, pathingCache);
    }
}

export function tickCharacters(characters: Character[], game: Game, pathingCache: PathingCache | null = null){
    for (let j = characters.length - 1; j >= 0; j--) {
        CHARACTER_TYPES_STUFF[characters[j].type].tickFunction(characters[j], game, pathingCache);
    }
}

export function getPlayerCharacters(players: Player[]) {
    let playerCharacters = [];
    for (let i = 0; i < players.length; i++) {
        playerCharacters.push(players[i].character);
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

export function determineCharactersInDistance(position: Position, map: GameMap, maxDistance: number): Character[] {
    let result: Character[] = [];
    let mapKeysInDistance = determineMapKeysInDistance(position, map, maxDistance);

    for (let i = 0; i < mapKeysInDistance.length; i++) {
        let chunk = map.chunks[mapKeysInDistance[i]];
        if(chunk === undefined) continue;
        let characters: Character[] = chunk.characters;
        for (let j = 0; j < characters.length; j++) {
            let distance = calculateDistance(position, characters[j]);
            if (maxDistance >= distance) {
                result.push(characters[j]);
            }
        }
    }
    return result;
}

function determineMapKeysInDistance(position: Position, map: GameMap, maxDistance: number): string[] {
    let chunkSize = map.tileSize * map.chunkLength;
    let maxChunks = Math.ceil(maxDistance / chunkSize);
    let result: string[] = [];
    for (let i = - maxChunks; i <= maxChunks; i++) {
        for (let j = - maxChunks; j <= maxChunks; j++) {
            let chunkI = Math.floor(position.y / chunkSize) + i;
            let chunkJ = Math.floor(position.x / chunkSize) + j;
            let distance = calculateDistanceToMapChunk(chunkI, chunkJ, position, map);
            if (distance <= maxDistance) {
                result.push(`${chunkI}_${chunkJ}`);
            }
        }
    }
    return result;
}

function calculateDistanceToMapChunk(chunkI: number, chunkJ: number, position: Position, map: GameMap): number {
    let chunkSize = map.tileSize * map.chunkLength;
    let topChunk = chunkI * chunkSize;
    let leftChunk = chunkJ * chunkSize;
    if (leftChunk <= position.y && leftChunk + chunkSize > position.y) {
        if (topChunk + chunkSize > position.x) {
            if (topChunk <= position.x) {
                return 0;
            } else {
                return topChunk - position.x;
            }
        } else {
            return position.x - topChunk + chunkSize;
        }
    } else if (topChunk <= position.x && topChunk + chunkSize > position.x) {
        if (leftChunk + chunkSize > position.y) {
            if (leftChunk <= position.y) {
                return 0;
            } else {
                return leftChunk - position.y;
            }
        } else {
            return position.y - leftChunk + chunkSize;
        }
    } else {
        if(topChunk > position.x && leftChunk > position.y){
            return calculateDistance(position, {x:leftChunk, y: topChunk});
        }else if(topChunk + chunkSize <= position.x && leftChunk > position.y){
            return calculateDistance(position, {x:leftChunk + chunkSize, y: topChunk});
        }else if(topChunk > position.x && leftChunk + chunkSize <= position.y){
            return calculateDistance(position, {x:leftChunk, y: topChunk + chunkSize});
        }else{
            return calculateDistance(position, {x:leftChunk + chunkSize, y: topChunk + chunkSize});
        }
    }
}

export function detectCharacterDeath(map: GameMap, state: GameState, upgradeOptions: Map<string, UpgradeOption>) {
    for (let i = 0; i < map.activeChunkKeys.length; i++) {
        let chunk = map.chunks[map.activeChunkKeys[i]];
        for (let charIt = chunk.characters.length - 1; charIt >= 0; charIt--) {
            if (chunk.characters[charIt].hp <= 0 && !chunk.characters[charIt].isDead) {
                if (chunk.characters[charIt].faction === ENEMY_FACTION) {
                    levelingCharacterXpGain(state, chunk.characters[charIt], upgradeOptions);
                    state.killCounter++;
                }
                chunk.characters[charIt].isDead = true;
            }
        }
    }
}

export function countAlivePlayerCharacters(players: Player[]) {
    let counter = 0;
    for (let i = players.length - 1; i >= 0; i--) {
        if (!players[i].character.isDead) counter++;
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

export function determineEnemyMoveDirection(enemy: Character, closestPlayerPosition: Position | null, map: GameMap, pathingCache: PathingCache, idCounter: IdCounter) {
    if (closestPlayerPosition === null) {
        enemy.isMoving = false;
        return;
    }
    enemy.isMoving = true;
    let nextWayPoint: Position | null = getNextWaypoint(enemy, closestPlayerPosition, map, pathingCache, idCounter);
    if (nextWayPoint === null) {
        enemy.isMoving = false;
        return;
    }
    enemy.moveDirection = calculateDirection(enemy, nextWayPoint);
}

export function moveCharacterTick(character: Character, map: GameMap, idCounter: IdCounter) {
    if (character.isMoving) {
        let x = character.x + Math.cos(character.moveDirection) * character.moveSpeed;
        let y = character.y + Math.sin(character.moveDirection) * character.moveSpeed;
        let blocking = isPositionBlocking({ x, y }, map, idCounter);
        if (!blocking) {
            character.x = x;
            character.y = y;
        }
    }
}

function paintCharacter(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position) {
    if (character.isDead) return;
    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;
    let paintX = character.x - cameraPosition.x + centerX;
    let paintY = character.y - cameraPosition.y + centerY;
    if (paintX < -character.size || paintX > ctx.canvas.width
        || paintY < -character.size || paintY > ctx.canvas.height) return;
    ctx.fillStyle = character.color;
    ctx.beginPath();
    ctx.arc(
        paintX,
        paintY,
        character.size, 0, 2 * Math.PI);
    ctx.fill();
}