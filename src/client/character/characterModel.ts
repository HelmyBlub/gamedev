import { Ability } from "../ability/ability.js";
import { Combatlog, createDefaultCombatLog } from "../combatlog.js";
import { Debuff } from "../debuff/debuff.js";
import { getNextId } from "../game.js";
import { Position, IdCounter, Game, FACTION_PLAYER } from "../gameModel.js";
import { GAME_IMAGES } from "../imageLoad.js";
import { createRandomizedCharacterImageData, RandomizedCharacterImage } from "../randomizedCharacterImage.js";
import { RandomSeed } from "../randomNumberGenerator.js";
import { executeDefaultCharacterUpgradeOption, tickDefaultCharacter } from "./character.js";
import { tickFixPositionRespawnEnemyCharacter } from "./enemy/fixPositionRespawnEnemy.js";
import { PathingCache } from "./pathing.js";
import { initPlayerCharacterChoiceOptions } from "./playerCharacters/playerCharacters.js";
import { TamerPetCharacter } from "./playerCharacters/tamer/tamerPetCharacter.js";
import { UpgradeOption, UpgradeOptionAndProbability } from "./upgrade.js";

export type CHARACTER_TYPE_FUNCTIONS = {
    [key: string]: {
        tickFunction?: (character: Character, game: Game, pathingCache: PathingCache | null) => void,
        tickPetFunction?: (character: Character, petOwner: Character, game: Game, pathingCache: PathingCache | null) => void,
        createUpgradeOptions?: (character: Character, game: Game) => UpgradeOptionAndProbability[],
        createBossUpgradeOptions?: (character: Character, game: Game) => UpgradeOptionAndProbability[],
        executeUpgradeOption?: (character: Character, upgradeOptionChoice: UpgradeOption, game: Game) => void,
        paintCharacterType?: (ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) => void,
        reset?: (character: Character) => void,
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
export const IMAGE_SLIME = "slime";
export const IMAGE_PLAYER_PARTS = "playerParts";
export const PLAYER_BASE_HP = 200;

GAME_IMAGES[IMAGE_SLIME] = {
    properties: { baseColor: "green" },
    imagePath: "/images/slimeEnemy.png",
    spriteRowHeights: [20],
    spriteRowWidths: [20]
};

const playerImageProperties: CharacterImageLoadProperties = {
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

GAME_IMAGES[IMAGE_PLAYER_PARTS] = {
    imagePath: "/images/player.png",
    spriteRowHeights: [13, 14, 13],
    spriteRowWidths: [20, 20, 20],
    properties: playerImageProperties,
};

export const CHARACTER_TYPE_FUNCTIONS: CHARACTER_TYPE_FUNCTIONS = {
    fixPositionRespawnEnemy: {
        tickFunction: tickFixPositionRespawnEnemyCharacter
    },
    Character: {
        tickFunction: tickDefaultCharacter,
        executeUpgradeOption: executeDefaultCharacterUpgradeOption,
    },
}

export type Character = Position & {
    id: number,
    width: number,
    height: number,
    moveSpeed: number,
    moveDirection: number,
    isMoving: boolean,
    isRooted: boolean,
    isMoveTickDisabled?:boolean,
    hp: number,
    maxHp: number,
    shield: number,
    damageTakenModifierFactor: number,
    maxShieldFactor: number,
    faction: string,
    experienceWorth: number,
    type: string,
    characterClass?: string,
    overtakenCharacterClasses?: string[],
    isDead: boolean,
    abilities: Ability[],
    debuffs: Debuff[],
    wasHitRecently?: boolean,
    paint: {
        image?: string,
        color?: string,
        randomizedCharacterImage?: RandomizedCharacterImage,
        preventDefaultCharacterPaint?: boolean,
    }
    isPet?: boolean,
    isDamageImmune?: boolean,
    isDebuffImmune?: boolean,
    isUnMoveAble?: boolean,
    becameEndBoss?: boolean,
    willTurnToPetOnDeath?: boolean,
    upgradeChoices: UpgradeOption[],
    pets?: TamerPetCharacter[],
    weight: number,
    bossSkillPoints?: number,
    leveling?: {
        level: number,
        experience: number,
        experienceForLevelUp: number,
    }
    mapChunkKey?: string,
    combatlog?: Combatlog, 
}

export function createCharacter(
    id: number,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string | undefined,
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
        paint: {
            color: color,
        },
        moveSpeed: moveSpeed,
        moveDirection: 0,
        isMoving: false,
        hp: hp,
        maxHp: hp,
        shield: 0,
        maxShieldFactor: 3,
        faction: faction,
        experienceWorth: experienceWorth,
        type: type,
        isDead: false,
        abilities: [],
        debuffs: [],
        upgradeChoices: [],
        weight: width * height,
        isRooted: false,
        damageTakenModifierFactor: 1,
    };
}

export function createPlayerCharacter(idCounter: IdCounter, pos: Position, seed: RandomSeed, game: Game): Character {
    const playerCharacter = createCharacter(getNextId(idCounter), pos.x, pos.y, 20, 40, undefined, 2, PLAYER_BASE_HP, FACTION_PLAYER, DEFAULT_CHARACTER, 1);
    playerCharacter.paint.randomizedCharacterImage = createRandomizedCharacterImageData(GAME_IMAGES[IMAGE_PLAYER_PARTS], seed);
    playerCharacter.willTurnToPetOnDeath = true;
    playerCharacter.isPet = false;
    playerCharacter.combatlog = createDefaultCombatLog();
    initPlayerCharacterChoiceOptions(playerCharacter, game);
    return playerCharacter;
}
