import { Ability } from "../ability/ability.js";
import { Debuff } from "../debuff/debuff.js";
import { getNextId } from "../game.js";
import { Position, IdCounter, Game } from "../gameModel.js";
import { GAME_IMAGES } from "../imageLoad.js";
import { createRandomizedCharacterImageData, RandomizedCharacterImage } from "../randomizedCharacterImage.js";
import { RandomSeed } from "../randomNumberGenerator.js";
import { CharacterUpgradeChoice, CharacterUpgradeOption, createDefaultCharacterUpgradeOptions } from "./characterUpgrades.js";
import { tickDefaultCharacter } from "./character.js";
import { tickFixPositionRespawnEnemyCharacter } from "./enemy/fixPositionRespawnEnemy.js";
import { PathingCache } from "./pathing.js";
import { initPlayerCharacterChoiceOptions } from "./playerCharacters/playerCharacters.js";
import { TamerPetCharacter } from "./playerCharacters/tamerPetCharacter.js";

export type CHARACTER_TYPE_FUNCTIONS = {
    [key: string]: {
        tickFunction?: (character: Character, game: Game, pathingCache: PathingCache | null) => void,
        tickPetFunction?: (character: Character, petOwner: Character, game: Game, pathingCache: PathingCache | null) => void,
        createUpgradeOptions?: (character: Character, game: Game) => CharacterUpgradeOption[],
        createBossUpgradeOptions?: (character: Character, game: Game) => CharacterUpgradeOption[],
        getUpgradeOptionByUpgradeChoice?:(character: Character, characterUpgradeChoice: CharacterUpgradeChoice, game: Game) => CharacterUpgradeOption | undefined,
        paintCharacterType?: (ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) => void,
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

export const DEFAULT_CHARACTER = "Character";

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
export const CHARACTER_TYPE_FUNCTIONS: CHARACTER_TYPE_FUNCTIONS = {
    fixPositionRespawnEnemy: {
        tickFunction: tickFixPositionRespawnEnemyCharacter
    },
    Character: {
        tickFunction: tickDefaultCharacter,
        createUpgradeOptions: createDefaultCharacterUpgradeOptions,
    },
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
    upgradeChoice: CharacterUpgradeChoice[],
    pets?: TamerPetCharacter[],
    weight: number,
    bossSkillPoints?: number,
    leveling?: {
        level: number,
        experience: number,
        experienceForLevelUp: number,
    }    
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
        faction: faction,
        experienceWorth: experienceWorth,
        type: type,
        isDead: false,
        abilities: [],
        debuffs: [],
        upgradeChoice: [],
        weight: width * height,
    };
}

export function createPlayerCharacter(idCounter: IdCounter, pos: Position, seed: RandomSeed, game: Game): Character {
    let playerCharacter = createCharacter(getNextId(idCounter), pos.x, pos.y, 20, 40, "blue", 2, 200, PLAYER_FACTION, DEFAULT_CHARACTER, 1);
    playerCharacter.randomizedCharacterImage = createRandomizedCharacterImageData(GAME_IMAGES["player"], seed);
    playerCharacter.willTurnToPetOnDeath = true;
    playerCharacter.isPet = false;
    initPlayerCharacterChoiceOptions(playerCharacter, game);
    return playerCharacter;
}
