import { getNextId } from "../../game.js";
import { IdCounter } from "../../gameModel.js";
import { GAME_IMAGES } from "../../imageLoad.js";
import { createRandomizedCharacterImageData } from "../../randomizedCharacterImage.js";
import { RandomSeed } from "../../randomNumberGenerator.js";
import { Character, CHARACTER_TYPE_FUNCTIONS, createCharacter } from "../characterModel.js";
import { tickLevelingCharacter } from "./levelingCharacter.js";

export type LevelingCharacter = Character & {
    experience: number,
    experienceForLevelUp: number,
    level: number,
    availableSkillPoints: number,
    upgradeOptions: {
        abilityName?: string,
        name: string,
    }[],
}

export type UpgradeOptionLevelingCharacter = {
    name: string,
    probabilityFactor: number,
    upgrade: (levelingCharacter: LevelingCharacter) => void,
}

const LEVELING_CHARACTER = "levelingCharacter";

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
    let character = createCharacter(getNextId(idCounter), x, y, width, height, color, moveSpeed, hp, damage, faction, LEVELING_CHARACTER, 1);
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

export function addLevelingCharacter(){
    CHARACTER_TYPE_FUNCTIONS[LEVELING_CHARACTER] = {
        tickFunction: tickLevelingCharacter
    }
}