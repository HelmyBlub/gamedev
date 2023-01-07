import { Position, IdCounter } from "../gameModel.js";
import { GameMap, isPositionBlocking } from "../map/map.js";
import { nextRandom, RandomSeed } from "../randomNumberGenerator.js";
import { tickFixPositionRespawnEnemyCharacter } from "./enemy/fixPositionRespawnEnemy.js";
import { tickRandomSpawnFollowingEnemyCharacter } from "./enemy/randomSpawnFollowingEnemy.js";
import { tickPlayerCharacter } from "./levelingCharacter.js";
import { createLevelingCharacter } from "./levelingCharacterModel.js";

export type CHARACTER_TYPES_STUFF = {
    [key: string]: {
        tickFunction: Function,
    }
}

type EnemyImages = {
    [key: string]: EnemyImage,
}
type ColorConversions = {
    [key: string]: {r:number, g: number, b: number},
}
export type EnemyImage = {
    baseColor: string,
    imagePath?: string,
    imageRef?: HTMLImageElement,
    canvas?: HTMLCanvasElement,
    colorToSprite?: string[];
}

export const ENEMY_IMAGES: EnemyImages = {
    "slime": { baseColor: "green", imagePath: "/images/slimeEnemy.png" },
}

export const COLOR_CONVERSION: ColorConversions = {
    "green": {r:0, g:255, b:0},
    "black": {r:0, g:0, b:0},
    "red": {r:255, g:0, b:0},
    "blue": {r:0, g:0, b:255},
}

export const PLAYER_FACTION = "player";
export const ENEMY_FACTION = "enemy";
export const CHARACTER_TYPES_STUFF: CHARACTER_TYPES_STUFF = {
    fixPositionRespawnEnemy: {
        tickFunction: tickFixPositionRespawnEnemyCharacter
    },
    randomSpawnFollowingEnemy: {
        tickFunction: tickRandomSpawnFollowingEnemyCharacter
    },
    levelingCharacter: {
        tickFunction: tickPlayerCharacter
    }
}

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
    type: string,
    isDead: boolean,
    wasHitRecently?: boolean,
}

export function createCharacter(
    id: number,
    x: number,
    y: number,
    size: number,
    color: string,
    moveSpeed: number,
    hp: number,
    damage: number,
    faction: string,
    type: string,
    isMoving: boolean = false,
): Character {
    return {
        id: id,
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
        type: type,
        isDead: false,
    };
}

export function createPlayerCharacter(idCounter: IdCounter, pos: Position): Character {
    return createLevelingCharacter(idCounter, pos.x, pos.y, 10, "blue", 2, 200, 10, PLAYER_FACTION);
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