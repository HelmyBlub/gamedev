import { Character } from "../character/characterModel.js";
import { Game } from "../gameModel.js";
import { addCharacterUpgradeBonusHp } from "./playerCharacters/characterUpgradeBonusHealth.js";
import { addCharacterUpgradeBonusMoveSpeed } from "./playerCharacters/characterUpgradeMoveSpeed.js";
import { findCharacterClassById } from "./playerCharacters/levelingCharacter.js";
import { CharacterClass } from "./playerCharacters/playerCharacters.js";
import { UpgradeOption, UpgradeOptionAndProbability } from "./upgrade.js";

export type CharacterUpgrade = {
    level: number,
    classIdRef: number,
}

export type CharacterUpgradeFunctions = {
    addUpgrade: (characterUpgrade: CharacterUpgrade, character: Character) => void,
    executeOption: (option: UpgradeOption, character: Character) => void,
    getLongExplainText?: (character: Character, option: UpgradeOption) => string[],
    getOptions: (character: Character, game: Game) => UpgradeOptionAndProbability[],
    getStatsDisplayText: (characterClass: CharacterClass) => string,
}

export type CharacterUpgradesFunctions = {
    [key: string]: CharacterUpgradeFunctions,
}

export const CHARACTER_UPGRADE_FUNCTIONS: CharacterUpgradesFunctions = {}

export function onDomLoadSetCharacterUpgradeFunctions(){
    addCharacterUpgradeBonusHp();
    addCharacterUpgradeBonusMoveSpeed();
}

export function upgradeCharacter(character: Character, upgradeOption: UpgradeOption) {
    const upgradeFunctions = CHARACTER_UPGRADE_FUNCTIONS[upgradeOption.identifier];
    if (upgradeFunctions && upgradeOption.classIdRef !== undefined) {
        const charClass = findCharacterClassById(character, upgradeOption.classIdRef);
        upgradeFunctions.executeOption(upgradeOption, character);
        if (charClass?.availableSkillPoints !== undefined){
            charClass.availableSkillPoints--;
        }
    }
    character.upgradeChoices = [];
}

export function pushCharacterUpgradesUiTexts(texts: string[], character: Character) {
    if(!character.characterClasses) return;
    let first = true;
    for(let charClass of character.characterClasses){
        if(!charClass.characterClassUpgrades) continue;
        const keys = Object.keys(charClass.characterClassUpgrades);
        for (let key of keys) {
            if (first) {
                texts.push("");
                texts.push("Upgrades:");
                first = false;
            }
            texts.push(CHARACTER_UPGRADE_FUNCTIONS[key].getStatsDisplayText(charClass));
        }
    }
}

