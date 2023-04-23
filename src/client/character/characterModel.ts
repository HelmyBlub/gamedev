import { Ability } from "../ability/ability.js";
import { Debuff } from "../debuff/debuff";
import { Position, IdCounter, LEVELING_CHARACTER_CLASSES } from "../gameModel.js";
import { GAME_IMAGES } from "../imageLoad.js";
import { RandomizedCharacterImage } from "../randomizedCharacterImage.js";
import { RandomSeed } from "../randomNumberGenerator.js";
import { tickFixPositionRespawnEnemyCharacter } from "./enemy/fixPositionRespawnEnemy.js";
import { tickRandomSpawnFollowingEnemyCharacter } from "./enemy/randomSpawnFollowingEnemy.js";
import { tickLevelingCharacter } from "./levelingCharacters/levelingCharacter.js";

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

export type CharacterImageLoadProperties = {
    headSpriteRows: number[],
    headSpriteCounter: number;
    chestSpriteRows: number[],
    chestSpriteCounter: number,
    legsSpriteRows: number[],
    legsSpriteCounter: number,
    directionSpriteCount: number,
    skinColor: string,
    clothColor: string,
    canvases?: { [key: string]: HTMLCanvasElement },
}

GAME_IMAGES["slime"] = { properties: { baseColor: "green" }, imagePath: "/images/slimeEnemy.png", spriteRowHeights: [20], spriteRowWidths: [20] };

let playerImageProperties: CharacterImageLoadProperties = {
    headSpriteRows: [0],
    headSpriteCounter: 3,
    chestSpriteRows: [1, 3, 5],
    chestSpriteCounter: 3,
    legsSpriteRows: [2, 4, 6],
    legsSpriteCounter: 3,
    directionSpriteCount: 3,
    skinColor: "white",
    clothColor: "blue",
}

GAME_IMAGES["player"] = {
    imagePath: "/images/player.png",
    spriteRowHeights: [13, 14, 13],
    spriteRowWidths: [20, 20, 20],
    properties: playerImageProperties,
};

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
        tickFunction: tickLevelingCharacter
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
    abilities: Ability[],
    debuffs: Debuff[],
    wasHitRecently?: boolean,
    randomizedCharacterImage?: RandomizedCharacterImage,
    isPet?: boolean,
    willTurnToPetOnDeath?: boolean,
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
        abilities: [],
        debuffs: [],
    };
}

export function createPlayerCharacter(idCounter: IdCounter, pos: Position, seed: RandomSeed, characterClass: string): Character {
    let playerCharacter = LEVELING_CHARACTER_CLASSES[characterClass].createLevelingCharacter(idCounter, pos.x, pos.y, 20, 40, "blue", 2, 200, 10, PLAYER_FACTION, seed);
    playerCharacter.willTurnToPetOnDeath = true;
    playerCharacter.isPet = false;
    return playerCharacter;
}
