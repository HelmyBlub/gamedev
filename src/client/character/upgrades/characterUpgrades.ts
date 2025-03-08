import { Character } from "../characterModel.js";
import { Game } from "../../gameModel.js";
import { addCharacterUpgradeBonusHp } from "./characterUpgradeBonusHealth.js";
import { addCharacterUpgradeBonusMoveSpeed } from "./characterUpgradeMoveSpeed.js";
import { findCharacterClassById } from "../playerCharacters/levelingCharacter.js";
import { CharacterClass } from "../playerCharacters/playerCharacters.js";
import { UpgradeOption, UpgradeOptionAndProbability } from "../upgrade.js";
import { addCharacterUpgradeBonusDamageReduction } from "./characterUpgradeDamageReduction.js";
import { addCharacterUpgradeBonusExperience } from "./characterUpgradeExperienceGain.js";
import { addCharacterUpgradeBonusMoney } from "./characterUpgradeMoney.js";
import { addCharacterUpgradeBonusDamage } from "./characterUpgradeBonusDamage.js";
import { addCharacterUpgradeRerolls } from "./characterUpgradeRerolls.js";
import { addCharacterUpgradeFightRetries } from "./characterUpgradeFightRetries.js";

export type CharacterUpgrade = {
    level: number,
    investedMoney?: number,
}

export type CharacterUpgrades = {
    [key: string]: CharacterUpgrade
}

export type CharacterUpgradeFunctions = {
    addUpgrade: (characterUpgrade: CharacterUpgrade, character: Character, game: Game, characterClass?: CharacterClass) => void,
    executeOption?: (option: UpgradeOption, character: Character) => void,
    getOptions?: (character: Character, characterClass: CharacterClass, game: Game) => UpgradeOptionAndProbability[],
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
    addCharacterUpgradeBonusExperience();
    addCharacterUpgradeBonusMoney();
    addCharacterUpgradeBonusDamage();
    addCharacterUpgradeRerolls();
    addCharacterUpgradeFightRetries();
}

export function addCharacterUpgrades(characterUpgrades: CharacterUpgrades, character: Character, game: Game, characterClass?: CharacterClass) {
    const keys = Object.keys(characterUpgrades);
    if (keys.length > 0) {
        for (let key of keys) {
            const classUpgrade = characterUpgrades[key];
            const charUpFunctions = CHARACTER_UPGRADE_FUNCTIONS[key];
            if (charUpFunctions) {
                charUpFunctions.addUpgrade(classUpgrade, character, game, characterClass);
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
            charClass.availableSkillPoints.available--;
            charClass.availableSkillPoints.used++;
        }
    }
    character.upgradeChoices.choices = [];
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
        texts.push("  " + CHARACTER_UPGRADE_FUNCTIONS[key].getStatsDisplayText(charClass.characterClassUpgrades[key]));
    }
}

