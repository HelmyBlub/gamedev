import { Character } from "../characterModel.js";
import { CHARACTER_UPGRADE_FUNCTIONS, CharacterUpgrade } from "./characterUpgrades.js";
import { CharacterClass } from "../playerCharacters/playerCharacters.js";
import { Game } from "../../gameModel.js";

export type CharacterUpgradeBonusExperience = CharacterUpgrade & {
    bonusExperienceFactor: number,
}

export const CHARACTER_UPGRADE_BONUS_EXPERIENCE = "Bonus Experience Gain";

export function addCharacterUpgradeBonusExperience() {
    CHARACTER_UPGRADE_FUNCTIONS[CHARACTER_UPGRADE_BONUS_EXPERIENCE] = {
        addUpgrade: addUpgrade,
        getStatsDisplayText: getStatsDisplayText,
    }
}

function getStatsDisplayText(characterUpgrade: CharacterUpgrade): string {
    const up: CharacterUpgradeBonusExperience = characterUpgrade as CharacterUpgradeBonusExperience;
    return `${CHARACTER_UPGRADE_BONUS_EXPERIENCE}: ${(up.bonusExperienceFactor) * 100}%`;
}

function addUpgrade(characterUpgrade: CharacterUpgrade, character: Character, game: Game, charClass: CharacterClass | undefined) {
    const experienceUp = characterUpgrade as CharacterUpgradeBonusExperience;
    if (charClass) {
        if (!charClass.characterClassUpgrades) charClass.characterClassUpgrades = {};
        charClass.characterClassUpgrades[CHARACTER_UPGRADE_BONUS_EXPERIENCE] = experienceUp;
    }
    if (character.experienceGainFactor === undefined) character.experienceGainFactor = 1;
    character.experienceGainFactor += experienceUp.bonusExperienceFactor;
}

