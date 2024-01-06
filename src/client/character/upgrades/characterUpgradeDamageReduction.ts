import { UpgradeOption, UpgradeOptionAndProbability } from "../upgrade.js";
import { Game } from "../../gameModel.js";
import { Character } from "../characterModel.js";
import { CHARACTER_UPGRADE_FUNCTIONS, CharacterUpgrade } from "./characterUpgrades.js";
import { CharacterClass } from "../playerCharacters/playerCharacters.js";
import { findCharacterClassById } from "../playerCharacters/levelingCharacter.js";

type CharacterUpgradeBonusDamageReduction = CharacterUpgrade & {
    bonusDamageReduction: number,
}

export const CHARACTER_UPGRADE_BONUS_DAMAGE_REDUCTION = "Bonus Damage Reduction";

export function addCharacterUpgradeBonusDamageReduction() {
    CHARACTER_UPGRADE_FUNCTIONS[CHARACTER_UPGRADE_BONUS_DAMAGE_REDUCTION] = {
        addUpgrade: addUpgrade,
    }
}

export function characterCreateAndApplyUpgradeDamageReduction(charClass: CharacterClass, character: Character, reductionFactor: number = 0.5){
    const upgrade = {
        bonusDamageReduction: reductionFactor,
        classIdRef: charClass.id,
        level: 1,
    }
    applyUpgradeToCharacterClass(charClass, upgrade, character);
}

function addUpgrade(characterUpgrade: CharacterUpgrade, character: Character, charClass: CharacterClass){
    const damageReduction = characterUpgrade as CharacterUpgradeBonusDamageReduction;
    applyUpgradeToCharacterClass(charClass, damageReduction, character);
}

function applyUpgradeToCharacterClass(charClass: CharacterClass, characterUpgradeDamageReduction: CharacterUpgradeBonusDamageReduction,  character: Character){
    if(!charClass.characterClassUpgrades) charClass.characterClassUpgrades = {};
    charClass.characterClassUpgrades[CHARACTER_UPGRADE_BONUS_DAMAGE_REDUCTION] = characterUpgradeDamageReduction;
    character.damageTakenModifierFactor *= characterUpgradeDamageReduction.bonusDamageReduction;
}

