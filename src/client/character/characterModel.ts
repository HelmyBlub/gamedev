import { Position, IdCounter } from "../gameModel.js";
import { GAME_IMAGES } from "../imageLoad.js";
import { RandomSeed } from "../randomNumberGenerator.js";
import { tickFixPositionRespawnEnemyCharacter } from "./enemy/fixPositionRespawnEnemy.js";
import { tickRandomSpawnFollowingEnemyCharacter } from "./enemy/randomSpawnFollowingEnemy.js";
import { tickPlayerCharacter } from "./levelingCharacter.js";
import { createLevelingCharacter } from "./levelingCharacterModel.js";

export type CHARACTER_TYPES_STUFF = {
    [key: string]: {
        tickFunction: Function,
    }
}

export type CharacterImage = {
    spriteHeight: number,
    spriteWidth: number,
    baseColor: string,
    imagePath?: string,
    imageRef?: HTMLImageElement,
    canvas?: HTMLCanvasElement,
    colorToSprite?: string[];
}

GAME_IMAGES["slime"] = { properties: { baseColor: "green" }, imagePath: "/images/slimeEnemy.png", spriteRowHeights: [20], spriteRowWidths: [20] };
GAME_IMAGES["player"] = { imagePath: "/images/player.png", spriteRowHeights: [15,15,10], spriteRowWidths: [20,20,20] };

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
    width: number,
    height: number,
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
    randomizedPaintKey?: string,
}

export function createCharacter(
    id: number,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    moveSpeed: number,
    hp: number,
    damage: number,
    faction: string,
    type: string,
    experienceWorth: number,
): Character {
    return {
        id: id,
        x: x,
        y: y,
        width: width,
        height: height,
        color: color,
        moveSpeed: moveSpeed,
        moveDirection: 0,
        isMoving: false,
        hp: hp,
        maxHp: hp,
        damage: damage,
        faction: faction,
        experienceWorth: experienceWorth,
        type: type,
        isDead: false,
    };
}

export function createPlayerCharacter(idCounter: IdCounter, pos: Position, seed: RandomSeed): Character {
    return createLevelingCharacter(idCounter, pos.x, pos.y, 20, 40, "blue", 2, 200, 10, PLAYER_FACTION, seed);
}
