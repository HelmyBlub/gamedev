import { Game } from "../../gameModel.js";
import { Character, CHARACTER_TYPE_FUNCTIONS, createCharacter } from "../characterModel.js";
import { createCharacterUpgradeOptionsNew, executeLevelingCharacterUpgradeOption, tickLevelingCharacter } from "./levelingCharacter.js";

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
    let levelingCharacter = character as LevelingCharacter;
    levelingCharacter.type = LEVELING_CHARACTER;
    levelingCharacter.leveling = {
        experience: 0,
        experienceForLevelUp: 10,
        level: 0,
    };
    levelingCharacter.availableSkillPoints = 0;
    
    let players = game.state.players;
    return levelingCharacter;
}

export function addLevelingCharacter(){
    CHARACTER_TYPE_FUNCTIONS[LEVELING_CHARACTER] = {
        tickFunction: tickLevelingCharacter,
        createUpgradeOptionsNew: createCharacterUpgradeOptionsNew,
        executeUpgradeOption: executeLevelingCharacterUpgradeOption,
    }
}