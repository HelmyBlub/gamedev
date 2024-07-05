import { Character } from "../characterModel.js";
import { CHARACTER_UPGRADE_FUNCTIONS, CharacterUpgrade } from "./characterUpgrades.js";
import { CharacterClass } from "../playerCharacters/playerCharacters.js";
import { Game } from "../../gameModel.js";

export type CharacterUpgradeBonusDamage = CharacterUpgrade & {
    bonusDamageFactor: number,
}

export const CHARACTER_UPGRADE_BONUS_DAMAGE = "Bonus Damage Factor";

export function addCharacterUpgradeBonusDamage() {
    CHARACTER_UPGRADE_FUNCTIONS[CHARACTER_UPGRADE_BONUS_DAMAGE] = {
        addUpgrade: addUpgrade,
        getStatsDisplayText: getStatsDisplayText,
    }
}

function getStatsDisplayText(characterUpgrade: CharacterUpgrade): string {
    const up: CharacterUpgradeBonusDamage = characterUpgrade as CharacterUpgradeBonusDamage;
    return `${CHARACTER_UPGRADE_BONUS_DAMAGE}: ${(up.bonusDamageFactor * 100).toFixed()}%`;
}

function addUpgrade(characterUpgrade: CharacterUpgrade, character: Character, game: Game, charClass: CharacterClass | undefined) {
    const experienceUp = characterUpgrade as CharacterUpgradeBonusDamage;
    if (charClass) {
        if (!charClass.characterClassUpgrades) charClass.characterClassUpgrades = {};
        charClass.characterClassUpgrades[CHARACTER_UPGRADE_BONUS_DAMAGE] = experienceUp;
    }
    character.damageDoneFactor += experienceUp.bonusDamageFactor;
}

