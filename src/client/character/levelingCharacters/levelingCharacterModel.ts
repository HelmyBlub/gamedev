import { getNextId } from "../../game.js";
import { IdCounter } from "../../gameModel.js";
import { GAME_IMAGES } from "../../imageLoad.js";
import { createRandomizedCharacterImageData } from "../../randomizedCharacterImage.js";
import { RandomSeed } from "../../randomNumberGenerator.js";
import { Character, createCharacter } from "../characterModel.js";

export type LevelingCharacter = Character & {
    experience: number,
    experienceForLevelUp: number,
    level: number,
    availableSkillPoints: number,
    isPet: boolean,
    upgradeOptions: {
        abilityName?: string,
        name: string,
    }[],
}

export type LevelingCharacterClass = {
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
    ) => LevelingCharacter
}

export type LevelingCharacterClasses = {
    [key: string]: LevelingCharacterClass,
}

export type UpgradeOptionLevelingCharacter = {
    name: string,
    upgrade: (levelingCharacter: LevelingCharacter) => void,
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
    seed: RandomSeed
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
        isPet: false,
    };
}