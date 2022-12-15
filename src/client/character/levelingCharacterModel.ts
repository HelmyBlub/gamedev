import { Game, getNextId } from "../game.js";
import { Character } from "./characterModel.js";

export type LevelingCharacter = Character & {
    experience: number,
    experienceForLevelUp: number,
    level: number,
    availableSkillPoints: number,
    shooting: {
        frequency: number,
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
    game: Game,
    x: number,
    y: number,
    size: number,
    color: string,
    moveSpeed: number,
    hp: number,
    damage: number,
    faction: string,
    isMoving: boolean = false
): LevelingCharacter {
    return {
        id: getNextId(game.state),
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
        experienceForLevelUp: 20,
        level: 0,
        availableSkillPoints: 0,
        upgradeOptions: [],
        shooting: {
            frequency: 500,
            nextShotTime: 0,
            pierceCount: 0,
            multiShot: 0,
            timeToLive: 1000,
        }
    };
}