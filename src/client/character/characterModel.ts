import { getNextId } from "../game.js";
import { Position, Game } from "../gameModel.js";
import { GameMap, isPositionBlocking } from "../map/map.js";
import { nextRandom, RandomSeed } from "../randomNumberGenerator.js";
import { getPlayerCharacters } from "./character.js";
import { createLevelingCharacter, LevelingCharacter } from "./levelingCharacterModel.js";

export const PLAYER_FACTION = "player";
export const ENEMY_FACTION = "enemy";
export type Character = Position & {
    id: number,
    size: number,
    color: string,
    moveSpeed: number,
    moveDirection: number,
    isMoving: boolean,
    hp: number,
    maxHp: number,
    damage: number,
    faction: string,
    experienceWorth: number,
    spawnTime: number,
}

export function createCharacter(
    game: Game,
    x: number,
    y: number,
    size: number,
    color: string,
    moveSpeed: number,
    hp: number,
    damage: number,
    faction: string,
    isMoving: boolean = false,
    spawnTime: number,
): Character {
    return {
        id: getNextId(game.state),
        x: x,
        y: y,
        size: size,
        color: color,
        moveSpeed: moveSpeed,
        moveDirection: 0,
        isMoving: isMoving,
        hp: hp,
        maxHp: hp,
        damage: damage,
        faction: faction,
        experienceWorth: 1,
        spawnTime: spawnTime,
    };
}

export function createPlayerCharacter(game: Game, pos: Position): Character {
    return createLevelingCharacter(game, pos.x, pos.y, 10, "blue", 2, 200, 10, PLAYER_FACTION, game.state.time);
}

export function getSpawnPositionAroundPlayer(playerCharacter: Character, randomSeed: RandomSeed, map: GameMap): Position | null{
    let spawnDistance = 150;
    let pos: Position = {x: 0, y:0};
    if (nextRandom(randomSeed) < 0.5) {
        pos.x = playerCharacter.x + (Math.round(nextRandom(randomSeed)) * 2 - 1) * spawnDistance;
        pos.y = playerCharacter.y + (nextRandom(randomSeed) - 0.5) * spawnDistance * 2;
    } else {
        pos.x = playerCharacter.x + (nextRandom(randomSeed) - 0.5) * spawnDistance * 2;
        pos.y = playerCharacter.y + (Math.round(nextRandom(randomSeed)) * 2 - 1) * spawnDistance;
    }
    if (!isPositionBlocking(pos, map)) {
        return pos;
    }
    return null;
}