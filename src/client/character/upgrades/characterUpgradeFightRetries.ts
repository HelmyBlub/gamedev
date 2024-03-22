import { Game } from "../../gameModel.js";
import { Character } from "../characterModel.js";
import { CHARACTER_UPGRADE_FUNCTIONS, CharacterUpgrade } from "./characterUpgrades.js";
import { CharacterClass } from "../playerCharacters/playerCharacters.js";

export type CharacterUpgradeFightRetries = CharacterUpgrade & {
    amount: number,
}

export const CHARACTER_UPGRADE_FIGHT_RETRIES = "FightRetries";

export function addCharacterUpgradeFightRetries() {
    CHARACTER_UPGRADE_FUNCTIONS[CHARACTER_UPGRADE_FIGHT_RETRIES] = {
        addUpgrade: addUpgrade,
        getStatsDisplayText: getStatsDisplayText,
    }
}

function addUpgrade(characterUpgrade: CharacterUpgrade, character: Character, game: Game, charClass: CharacterClass | undefined) {
    const retries = characterUpgrade as CharacterUpgradeFightRetries;
    if (charClass) {
        if (!charClass.characterClassUpgrades) charClass.characterClassUpgrades = {};
        charClass.characterClassUpgrades[CHARACTER_UPGRADE_FIGHT_RETRIES] = characterUpgrade;
    }
    if (character.fightRetries === undefined) character.fightRetries = 0;
    character.fightRetries += retries.amount;
}

function getStatsDisplayText(characterUpgrade: CharacterUpgrade): string {
    const up: CharacterUpgradeFightRetries = characterUpgrade as CharacterUpgradeFightRetries;
    return `${CHARACTER_UPGRADE_FIGHT_RETRIES}: ${up.amount}`;
}
