import { Game } from "../../gameModel.js";
import { Character } from "../characterModel.js";
import { CHARACTER_UPGRADE_FUNCTIONS, CharacterUpgrade } from "./characterUpgrades.js";
import { CharacterClass } from "../playerCharacters/playerCharacters.js";

export type CharacterUpgradeRerolls = CharacterUpgrade & {
    amount: number,
}

export const CHARACTER_UPGRADE_REROLLS = "Rerolls";

export function addCharacterUpgradeRerolls() {
    CHARACTER_UPGRADE_FUNCTIONS[CHARACTER_UPGRADE_REROLLS] = {
        addUpgrade: addUpgrade,
        getStatsDisplayText: getStatsDisplayText,
    }
}

function addUpgrade(characterUpgrade: CharacterUpgrade, character: Character, game: Game, charClass?: CharacterClass) {
    const rerolls = characterUpgrade as CharacterUpgradeRerolls;
    if (charClass) {
        if (!charClass.characterClassUpgrades) charClass.characterClassUpgrades = {};
        charClass.characterClassUpgrades[CHARACTER_UPGRADE_REROLLS] = characterUpgrade;
    }
    if (character.upgradeChoices.rerools === undefined) character.upgradeChoices.rerools = 0;
    character.upgradeChoices.rerools += rerolls.amount;
}

function getStatsDisplayText(characterUpgrade: CharacterUpgrade): string {
    const up: CharacterUpgradeRerolls = characterUpgrade as CharacterUpgradeRerolls;
    return `${CHARACTER_UPGRADE_REROLLS}: ${up.amount}`;
}
