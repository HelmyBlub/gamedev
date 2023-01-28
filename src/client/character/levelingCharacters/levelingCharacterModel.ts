import { getNextId } from "../../game.js";
import { Game, IdCounter, Position, UpgradeOptions } from "../../gameModel.js";
import { GAME_IMAGES } from "../../imageLoad.js";
import { createRandomizedCharacterImageData } from "../../randomizedCharacterImage.js";
import { RandomSeed } from "../../randomNumberGenerator.js";
import { Character, createCharacter } from "../characterModel.js";

export type LevelingCharacter = Character & {
    experience: number,
    experienceForLevelUp: number,
    level: number,
    availableSkillPoints: number,
    characterClass: string,
    characterClassProperties: any,
    upgradeOptions: {
        name: string,
    }[],
}

export type LevelingCharacterClass = {
    fillRandomUpgradeOptions: (character: LevelingCharacter, randomSeed: RandomSeed, upgradeOptions: UpgradeOptions) => void,
    createDefaultUpgradeOptions: () => Map<string, UpgradeOption>;
    upgradeLevelingCharacter: (character: LevelingCharacter, upgradeOptionIndex: number, upgradeOptions: UpgradeOptions, randomSeed: RandomSeed) => void,
    tickPlayerCharacter: (character: LevelingCharacter, game: Game) => void,
    createLevelingCharacter: (
        idCounter: IdCounter,
        x: number,
        y: number,
        width: number,
        height: number,
        color: string,
        moveSpeed: number,
        hp: number,
        damage: number,
        faction: string,
        seed: RandomSeed,
    ) => LevelingCharacter,
    paintWeapon?: (ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position) => void,
}

export type LevelingCharacterClasses = {
    [key:string]: LevelingCharacterClass,
}

export type UpgradeOption = {
    name: string,
    upgrade: (character: LevelingCharacter) => void,
}

export function createLevelingCharacter(
    idCounter: IdCounter,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    moveSpeed: number,
    hp: number,
    damage: number,
    faction: string,
    seed: RandomSeed,
    characterClass: string,
    characterClassProperties: any,
): LevelingCharacter {
    let character = createCharacter(getNextId(idCounter), x, y, width, height, color, moveSpeed, hp, damage, faction, "levelingCharacter", 1);
    return {
        ...character,
        randomizedCharacterImage: createRandomizedCharacterImageData(GAME_IMAGES["player"], seed),
        experience: 0,
        experienceForLevelUp: 10,
        level: 0,
        availableSkillPoints: 0,
        upgradeOptions: [],
        characterClass: characterClass,
        characterClassProperties: characterClassProperties,
    };
}