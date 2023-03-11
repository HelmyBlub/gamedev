import { levelingCharacterXpGain } from "./levelingCharacters/levelingCharacter.js";
import { determineMapKeysInDistance, GameMap, getChunksTouchingLine, isPositionBlocking, MapChunk } from "../map/map.js";
import { Character, CHARACTER_TYPES_STUFF, ENEMY_FACTION } from "./characterModel.js";
import { getNextWaypoint, getPathingCache, PathingCache } from "./pathing.js";
import { calculateDirection, calculateDistance, calculateDistancePointToLine, takeTimeMeasure } from "../game.js";
import { Position, Game, GameState, IdCounter, Camera } from "../gameModel.js";
import { Player } from "../player.js";
import { RandomSeed, nextRandom } from "../randomNumberGenerator.js";
import { ABILITIES_FUNCTIONS } from "../ability/ability.js";
import { LevelingCharacter } from "./levelingCharacters/levelingCharacterModel.js";
import { BossEnemyCharacter, CHARACTER_TYPE_BOSS_ENEMY } from "./enemy/bossEnemy.js";

export function findCharacterById(characters: Character[], id: number): Character | null {
    for (let i = 0; i < characters.length; i++) {
        if (characters[i].id === id) {
            return characters[i];
        }
    }
    return null;
}

export function tickMapCharacters(map: GameMap, game: Game) {
    takeTimeMeasure(game.debug, "", "tickMapCharacters");
    let pathingCache = getPathingCache(game);
    let allCharacters: Character[] = [];
    for (let i = 0; i < map.activeChunkKeys.length; i++) {
        let chunk = map.chunks[map.activeChunkKeys[i]];
        allCharacters.push(...chunk.characters);
    }
    tickCharacters(allCharacters, game, pathingCache);
    takeTimeMeasure(game.debug, "tickMapCharacters", "");
}

export function tickCharacters(characters: Character[], game: Game, pathingCache: PathingCache | null = null) {
    for (let j = characters.length - 1; j >= 0; j--) {
        CHARACTER_TYPES_STUFF[characters[j].type].tickFunction(characters[j], game, pathingCache);
        if (!characters[j].isDead) {
            for (let ability of characters[j].abilities) {
                ABILITIES_FUNCTIONS[ability.name].tickAbility(characters[j], ability, game);
            }
        }
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
        if (characters[i].isDead) continue;
        if (characters[i].type === "levelingCharacter" && (characters[i] as LevelingCharacter).isPet) continue;
        let distance = calculateDistance(character, characters[i]);
        if (minDistanceCharacter === null || minDistance > distance) {
            minDistance = distance;
            minDistanceCharacter = characters[i];
        }
    }
    return { minDistanceCharacter, minDistance };
}

export function determineCharactersInDistance(position: Position, map: GameMap, players: Player[], bosses: BossEnemyCharacter[] , maxDistance: number): Character[] {
    let result: Character[] = [];
    let mapKeysInDistance = determineMapKeysInDistance(position, map, maxDistance);

    for (let i = 0; i < mapKeysInDistance.length; i++) {
        let chunk = map.chunks[mapKeysInDistance[i]];
        if (chunk === undefined) continue;
        let characters: Character[] = chunk.characters;
        for (let j = 0; j < characters.length; j++) {
            let distance = calculateDistance(position, characters[j]);
            if (maxDistance >= distance) {
                result.push(characters[j]);
            }
        }
    }

    for (let boss of bosses) {
        let distance = calculateDistance(position, boss);
        if (maxDistance >= distance) {
            result.push(boss);
        }
    }

    for (let player of players) {
        let distance = calculateDistance(position, player.character);
        if (maxDistance >= distance) {
            result.push(player.character);
        }
    }
    return result;
}

export function getCharactersTouchingLine(game: Game, lineStart: Position, lineEnd: Position): Character[] {
    let chunks: MapChunk[] = getChunksTouchingLine(game.state.map, lineStart, lineEnd);
    let lineWidth = 3;
    let charactersTouchingLine: Character[] = [];
    for (let chunk of chunks) {
        for (let char of chunk.characters) {
            let distance = calculateDistancePointToLine(char, lineStart, lineEnd);
            if (distance < char.width / 2 + lineWidth / 2) {
                charactersTouchingLine.push(char);
            }
        }
    }
    for(let boss of game.state.bosses){
        let distance = calculateDistancePointToLine(boss, lineStart, lineEnd);
        if (distance < boss.width / 2 + lineWidth / 2) {
            charactersTouchingLine.push(boss);
        }
    }

    return charactersTouchingLine;
}

export function countCharacters(map: GameMap): number {
    let counter = 0;
    let chunkKeys = Object.keys(map.chunks);

    for (const key of chunkKeys) {
        counter += map.chunks[key].characters.length;
    }

    return counter;
}

export function detectCharacterDeath(map: GameMap, state: GameState, camera: Camera, game: Game) {
    takeTimeMeasure(game.debug, "", "detectCharacterDeath");
    for (let i = 0; i < map.activeChunkKeys.length; i++) {
        let chunk = map.chunks[map.activeChunkKeys[i]];
        for (let charIt = chunk.characters.length - 1; charIt >= 0; charIt--) {
            if (chunk.characters[charIt].hp <= 0 && !chunk.characters[charIt].isDead) {
                if (chunk.characters[charIt].faction === ENEMY_FACTION) {
                    levelingCharacterXpGain(state, chunk.characters[charIt]);
                    state.killCounter++;
                }
                chunk.characters[charIt].isDead = true;
            }
        }
    }
    for (let i = state.bosses.length - 1; i >= 0; i--) {
        let char = state.bosses[i];
        if (char.hp <= 0 && !char.isDead) {
            char.isDead = true;
            state.bosses.splice(i,1);
        }
    }

    for (let i = 0; i < state.players.length; i++) {
        let char = state.players[i].character;
        if (char.hp <= 0 && !char.isDead) {
            char.isDead = true;
        }
    }
    takeTimeMeasure(game.debug, "detectCharacterDeath", "");
}

export function findAndSetNewCameraCharacterId(camera: Camera, players: Player[], myClientId?: number) {
    let newCameraCharacterId = undefined;
    for (let i = 0; i < players.length; i++) {
        if (!players[i].character.isDead) {
            if (players[i].character.id === camera.characterId
                || newCameraCharacterId === undefined
                || myClientId === players[i].clientId) {
                newCameraCharacterId = players[i].character.id;
            }
        }
    }
    if(newCameraCharacterId){
        camera.characterId = newCameraCharacterId;
    }
}

export function getSpawnPositionAroundPlayer(playerCharacter: Character, randomSeed: RandomSeed, map: GameMap, idCounter: IdCounter): Position | null {
    let spawnDistance = 150;
    let pos: Position = { x: 0, y: 0 };
    if (nextRandom(randomSeed) < 0.5) {
        pos.x = playerCharacter.x + (Math.round(nextRandom(randomSeed)) * 2 - 1) * spawnDistance;
        pos.y = playerCharacter.y + (nextRandom(randomSeed) - 0.5) * spawnDistance * 2;
    } else {
        pos.x = playerCharacter.x + (nextRandom(randomSeed) - 0.5) * spawnDistance * 2;
        pos.y = playerCharacter.y + (Math.round(nextRandom(randomSeed)) * 2 - 1) * spawnDistance;
    }
    if (!isPositionBlocking(pos, map, idCounter)) {
        return pos;
    }
    return null;
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
    if (distance <= enemy.width / 2 + closestPlayer.width / 2) {
        closestPlayer.hp -= enemy.damage;
    }
}

export function determineEnemyMoveDirection(enemy: Character, closestPlayerPosition: Position | null, map: GameMap, pathingCache: PathingCache, idCounter: IdCounter, time: number) {
    if (closestPlayerPosition === null) {
        enemy.isMoving = false;
        return;
    }
    enemy.isMoving = true;
    let nextWayPoint: Position | null = getNextWaypoint(enemy, closestPlayerPosition, map, pathingCache, idCounter, time);
    if (nextWayPoint === null) {
        enemy.isMoving = false;
        return;
    }
    enemy.moveDirection = calculateDirection(enemy, nextWayPoint);
}

export function moveCharacterTick(character: Character, map: GameMap, idCounter: IdCounter, isPlayer: boolean) {
    if (character.isMoving) {
        let x = character.x + Math.cos(character.moveDirection) * character.moveSpeed;
        let y = character.y + Math.sin(character.moveDirection) * character.moveSpeed;
        let blocking = isPositionBlocking({ x, y }, map, idCounter);
        if (!blocking) {
            mapCharacterCheckForChunkChange(character, map, x, y, isPlayer);
            character.x = x;
            character.y = y;
        }
    }
}

function mapCharacterCheckForChunkChange(character: Character, map: GameMap, newX: number, newY: number, isPlayer: boolean) {
    if (!isPlayer && character.type !== CHARACTER_TYPE_BOSS_ENEMY) {
        let currentChunkI = Math.floor(character.y / (map.tileSize * map.chunkLength));
        let newChunkI = Math.floor(newY / (map.tileSize * map.chunkLength));
        let currentChunkJ = Math.floor(character.x / (map.tileSize * map.chunkLength));
        let newChunkJ = Math.floor(newX / (map.tileSize * map.chunkLength));
        if (currentChunkI !== newChunkI || currentChunkJ !== newChunkJ) {
            let currentChunkKey = `${currentChunkI}_${currentChunkJ}`;
            let newChunkKey = `${newChunkI}_${newChunkJ}`;
            map.chunks[currentChunkKey].characters = map.chunks[currentChunkKey].characters.filter(el => el !== character);
            map.chunks[newChunkKey].characters.push(character);
        }
    }
}