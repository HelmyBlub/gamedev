import { Character } from "../characterModel.js";
import { CHARACTER_UPGRADE_FUNCTIONS, CharacterUpgrade } from "./characterUpgrades.js";
import { CharacterClass } from "../playerCharacters/playerCharacters.js";
import { Game } from "../../gameModel.js";

export type CharacterUpgradeBonusDamageReduction = CharacterUpgrade & {
    bonusDamageReduction: number,
}

export const CHARACTER_UPGRADE_BONUS_DAMAGE_REDUCTION = "Bonus Damage Reduction";

export function addCharacterUpgradeBonusDamageReduction() {
    CHARACTER_UPGRADE_FUNCTIONS[CHARACTER_UPGRADE_BONUS_DAMAGE_REDUCTION] = {
        addUpgrade: addUpgrade,
        getStatsDisplayText: getStatsDisplayText,
    }
}

export function characterCreateAndApplyUpgradeDamageReduction(charClass: CharacterClass, character: Character, game: Game, reductionFactor: number = 0.5) {
    const upgrade = {
        bonusDamageReduction: reductionFactor,
        classIdRef: charClass.id,
        level: 1,
    }
    addUpgrade(upgrade, character, game, charClass);
}

function getStatsDisplayText(characterUpgrade: CharacterUpgrade): string {
    const up: CharacterUpgradeBonusDamageReduction = characterUpgrade as CharacterUpgradeBonusDamageReduction;
    return `${CHARACTER_UPGRADE_BONUS_DAMAGE_REDUCTION}: ${(1 - up.bonusDamageReduction) * 100}%`;
}

function addUpgrade(characterUpgrade: CharacterUpgrade, character: Character, game: Game, charClass?: CharacterClass) {
    const damageReduction = characterUpgrade as CharacterUpgradeBonusDamageReduction;
    if (charClass) {
        if (!charClass.characterClassUpgrades) charClass.characterClassUpgrades = {};
        charClass.characterClassUpgrades[CHARACTER_UPGRADE_BONUS_DAMAGE_REDUCTION] = damageReduction;
    }
    character.damageTakenModifierFactor *= damageReduction.bonusDamageReduction;
}

