import { Character } from "../characterModel.js";
import { Game } from "../../gameModel.js";
import { addCharacterUpgradeBonusHp } from "./characterUpgradeBonusHealth.js";
import { addCharacterUpgradeBonusMoveSpeed } from "./characterUpgradeMoveSpeed.js";
import { findCharacterClassById } from "../playerCharacters/levelingCharacter.js";
import { CharacterClass } from "../playerCharacters/playerCharacters.js";
import { UpgradeOption, UpgradeOptionAndProbability } from "../upgrade.js";
import { addCharacterUpgradeBonusDamageReduction } from "./characterUpgradeDamageReduction.js";

export type CharacterUpgrade = {
    level: number,
    investedMoney?: number,
}

export type CharacterUpgrades = {
    [key: string]: CharacterUpgrade
}

export type CharacterUpgradeFunctions = {
    addUpgrade: (characterUpgrade: CharacterUpgrade, character: Character, characterClass: CharacterClass | undefined) => void,
    executeOption?: (option: UpgradeOption, character: Character) => void,
    getLongExplainText?: (character: Character, option: UpgradeOption) => string[],
    getOptions?: (character: Character, game: Game) => UpgradeOptionAndProbability[],
    getStatsDisplayText: (characterUpgrade: CharacterUpgrade) => string,
}

export type CharacterUpgradesFunctions = {
    [key: string]: CharacterUpgradeFunctions,
}

export const CHARACTER_UPGRADE_FUNCTIONS: CharacterUpgradesFunctions = {}

export function onDomLoadSetCharacterUpgradeFunctions() {
    addCharacterUpgradeBonusHp();
    addCharacterUpgradeBonusMoveSpeed();
    addCharacterUpgradeBonusDamageReduction();
}

export function addCharacterUpgrades(characterUpgrades: CharacterUpgrades, character: Character, characterClass: CharacterClass | undefined) {
    const keys = Object.keys(characterUpgrades);
    if (keys.length > 0) {
        for (let key of keys) {
            const classUpgrade = characterUpgrades[key];
            const charUpFunctions = CHARACTER_UPGRADE_FUNCTIONS[key];
            if (charUpFunctions) {
                charUpFunctions.addUpgrade(classUpgrade, character, characterClass);
            }
        }
    }
}

export function characterUpgradeGetStatsDisplayText(upgradeName: string, characterUpgrade: CharacterUpgrade): string {
    const upgradeFunctions = CHARACTER_UPGRADE_FUNCTIONS[upgradeName];
    if (upgradeFunctions) {
        return upgradeFunctions.getStatsDisplayText(characterUpgrade);
    }
    return "";
}

export function upgradeCharacter(character: Character, upgradeOption: UpgradeOption) {
    const upgradeFunctions = CHARACTER_UPGRADE_FUNCTIONS[upgradeOption.identifier];
    if (upgradeFunctions && upgradeOption.classIdRef !== undefined && upgradeFunctions.executeOption) {
        const charClass = findCharacterClassById(character, upgradeOption.classIdRef);
        upgradeFunctions.executeOption(upgradeOption, character);
        if (charClass?.availableSkillPoints !== undefined) {
            charClass.availableSkillPoints--;
        }
    }
    character.upgradeChoices = [];
}

export function pushCharacterClassUpgradesUiTexts(texts: string[], charClass: CharacterClass) {
    if (!charClass.characterClassUpgrades) return;
    let first = true;
    const keys = Object.keys(charClass.characterClassUpgrades);
    for (let key of keys) {
        if (first) {
            texts.push("Upgrades:");
            first = false;
        }
        texts.push(CHARACTER_UPGRADE_FUNCTIONS[key].getStatsDisplayText(charClass.characterClassUpgrades[key]));
    }
}

