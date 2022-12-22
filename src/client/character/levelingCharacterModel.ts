import { getNextId } from "../game.js";
import { Game, IdCounter } from "../gameModel.js";
import { Character } from "./characterModel.js";

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
    isMoving: boolean = false,
): LevelingCharacter {
    return {
        id: getNextId(idCounter),
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
        type: "levelingCharacter",
        isDead: false,
    };
}