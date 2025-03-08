import { Character } from "../characterModel.js";
import { CHARACTER_UPGRADE_FUNCTIONS, CharacterUpgrade } from "./characterUpgrades.js";
import { CharacterClass } from "../playerCharacters/playerCharacters.js";
import { findPlayerByCharacterId } from "../../player.js";
import { Game } from "../../gameModel.js";

export type CharacterUpgradeBonusMoney = CharacterUpgrade & {
    bonusMoneyFactor: number,
}

export const CHARACTER_UPGRADE_BONUS_MONEY = "Bonus Money Gain";

export function addCharacterUpgradeBonusMoney() {
    CHARACTER_UPGRADE_FUNCTIONS[CHARACTER_UPGRADE_BONUS_MONEY] = {
        addUpgrade: addUpgrade,
        getStatsDisplayText: getStatsDisplayText,
    }
}

function getStatsDisplayText(characterUpgrade: CharacterUpgrade): string {
    const up: CharacterUpgradeBonusMoney = characterUpgrade as CharacterUpgradeBonusMoney;
    return `${CHARACTER_UPGRADE_BONUS_MONEY}: ${(up.bonusMoneyFactor * 100).toFixed()}%`;
}

function addUpgrade(characterUpgrade: CharacterUpgrade, character: Character, game: Game, charClass?: CharacterClass) {
    const up = characterUpgrade as CharacterUpgradeBonusMoney;
    if (charClass) {
        if (!charClass.characterClassUpgrades) charClass.characterClassUpgrades = {};
        charClass.characterClassUpgrades[CHARACTER_UPGRADE_BONUS_MONEY] = up;
    }
    if (character.bonusMoneyFactor === undefined) character.bonusMoneyFactor = 1;
    character.bonusMoneyFactor += up.bonusMoneyFactor;
}

