import { Game } from "../../gameModel.js";
import { tickDefaultCharacter } from "../character.js";
import { Character, CHARACTER_TYPE_FUNCTIONS } from "../characterModel.js";
import { createCharacterUpgradeOptionsNew, executeLevelingCharacterUpgradeOption } from "./levelingCharacter.js";

export type LevelingCharacter = Character & {
    availableSkillPoints: number,
    leveling: {
        level: number,
        experience: number,
        experienceForLevelUp: number,
    }
}

export const LEVELING_CHARACTER = "levelingCharacter";

export function changeToLevelingCharacter(character: Character, game: Game): LevelingCharacter {
    const levelingCharacter = character as LevelingCharacter;
    levelingCharacter.type = LEVELING_CHARACTER;
    levelingCharacter.leveling = {
        experience: 0,
        experienceForLevelUp: 10,
        level: 0,
    };
    levelingCharacter.availableSkillPoints = 0;
    return levelingCharacter;
}

export function addLevelingCharacter() {
    CHARACTER_TYPE_FUNCTIONS[LEVELING_CHARACTER] = {
        tickFunction: tickDefaultCharacter,
        createUpgradeOptions: createCharacterUpgradeOptionsNew,
        executeUpgradeOption: executeLevelingCharacterUpgradeOption,
    }
}