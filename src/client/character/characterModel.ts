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

function createCharacter(
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

function createEnemy(game: Game, x: number, y: number, hp: number): Character {
    return createCharacter(game, x, y, 5, "black", 0.5, hp, 1, ENEMY_FACTION, true, game.state.time);
}
