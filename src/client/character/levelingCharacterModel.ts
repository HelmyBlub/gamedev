import { getNextId } from "../game.js";
import { IdCounter } from "../gameModel.js";
import { Character, createCharacter } from "./characterModel.js";

export type LevelingCharacter = Character & {
    experience: number,
    experienceForLevelUp: number,
    level: number,
    availableSkillPoints: number,
    shooting: {
        baseFrequency: number,
        frequencyIncrease: number,
        nextShotTime: number,
        pierceCount: number,
        multiShot: number,
        timeToLive: number,
    }
    upgradeOptions: {
        name: string,
    }[],
}

export type UpgradeOption = {
    name: string,
    upgrade: (character: LevelingCharacter) => void,
}

export function createLevelingCharacter(
    idCounter: IdCounter,
    x: number,
    y: number,
    size: number,
    color: string,
    moveSpeed: number,
    hp: number,
    damage: number,
    faction: string,
): LevelingCharacter {
    let character = createCharacter(getNextId(idCounter), x, y, size, color, moveSpeed, hp, damage, faction, "levelingCharacter", 1);
    return {
        ...character,
        experience: 0,
        experienceForLevelUp: 10,
        level: 0,
        availableSkillPoints: 0,
        upgradeOptions: [],
        shooting: {
            baseFrequency: 500,
            frequencyIncrease: 1,
            nextShotTime: 0,
            pierceCount: 0,
            multiShot: 0,
            timeToLive: 1000,
        },
    };
}