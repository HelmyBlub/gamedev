import { UpgradeOption, UpgradeOptionAndProbability } from "../upgrade.js";
import { Game } from "../../gameModel.js";
import { Character } from "../characterModel.js";
import { CHARACTER_UPGRADE_FUNCTIONS, CharacterUpgrade } from "./characterUpgrades.js";
import { CharacterClass } from "../playerCharacters/playerCharacters.js";
import { findCharacterClassById } from "../playerCharacters/levelingCharacter.js";

export type CharacterUpgradeBonusMoveSpeed = CharacterUpgrade & {
    bonusMoveSpeed: number,
}

export const CHARACTER_UPGRADE_BONUS_MOVE_SPEED = "Bonus Move Speed";
const BONUS_MOVE_SPEED_PER_LEVEL = 1.0;

export function addCharacterUpgradeBonusMoveSpeed() {
    CHARACTER_UPGRADE_FUNCTIONS[CHARACTER_UPGRADE_BONUS_MOVE_SPEED] = {
        addUpgrade: addUpgrade,
        executeOption: executeOption,
        getLongExplainText: getLongExplainText,
        getOptions: getOptions,
        getStatsDisplayText: getStatsDisplayText,
    }
}

export function characterCreateAndAddUpgradeBonusSpeed(charClass: CharacterClass, character: Character, bonusSpeed: number) {
    if (!charClass.characterClassUpgrades) charClass.characterClassUpgrades = {};
    let upgrade: CharacterUpgradeBonusMoveSpeed = charClass.characterClassUpgrades[CHARACTER_UPGRADE_BONUS_MOVE_SPEED] as CharacterUpgradeBonusMoveSpeed;
    if (!upgrade) {
        upgrade = {
            bonusMoveSpeed: 0,
            level: 1,
        }
        charClass.characterClassUpgrades[CHARACTER_UPGRADE_BONUS_MOVE_SPEED] = upgrade;
    }
    upgrade.bonusMoveSpeed += bonusSpeed;
    character.moveSpeed += bonusSpeed;
}

function addUpgrade(characterUpgrade: CharacterUpgrade, character: Character, charClass: CharacterClass | undefined) {
    const bonusHp = characterUpgrade as CharacterUpgradeBonusMoveSpeed;
    if (charClass) {
        if (!charClass.characterClassUpgrades) charClass.characterClassUpgrades = {};
        charClass.characterClassUpgrades[CHARACTER_UPGRADE_BONUS_MOVE_SPEED] = characterUpgrade;
    }
    character.moveSpeed += bonusHp.bonusMoveSpeed;
}

function getOptions(character: Character, game: Game): UpgradeOptionAndProbability[] {
    const upgradeOptions: UpgradeOptionAndProbability[] = [];
    const optionAndProbability: UpgradeOptionAndProbability = {
        option: {
            identifier: CHARACTER_UPGRADE_BONUS_MOVE_SPEED,
            displayText: CHARACTER_UPGRADE_BONUS_MOVE_SPEED,
            type: "Character",
        },
        probability: 1,
    };
    optionAndProbability.option.displayLongText = getLongExplainText(character, optionAndProbability.option);
    upgradeOptions.push(optionAndProbability);
    return upgradeOptions;
}

function executeOption(option: UpgradeOption, character: Character) {
    if (option.classIdRef === undefined) return;
    let up: CharacterUpgradeBonusMoveSpeed;
    const charClass = findCharacterClassById(character, option.classIdRef);
    if (!charClass) return;
    if (charClass.characterClassUpgrades === undefined) charClass.characterClassUpgrades = {};
    if (charClass.characterClassUpgrades[CHARACTER_UPGRADE_BONUS_MOVE_SPEED] === undefined) {
        up = { level: 0, bonusMoveSpeed: 0 };
        charClass.characterClassUpgrades[CHARACTER_UPGRADE_BONUS_MOVE_SPEED] = up;
    } else {
        up = charClass.characterClassUpgrades[CHARACTER_UPGRADE_BONUS_MOVE_SPEED] as CharacterUpgradeBonusMoveSpeed;
    }
    up.level++;
    up.bonusMoveSpeed += BONUS_MOVE_SPEED_PER_LEVEL;
    character.moveSpeed += BONUS_MOVE_SPEED_PER_LEVEL;
}

function getStatsDisplayText(characterUpgrade: CharacterUpgrade): string {
    const up: CharacterUpgradeBonusMoveSpeed = characterUpgrade as CharacterUpgradeBonusMoveSpeed;
    return `${CHARACTER_UPGRADE_BONUS_MOVE_SPEED}: ${up.bonusMoveSpeed}`;
}

function getLongExplainText(character: Character, option: UpgradeOption): string[] {
    const textLines: string[] = [];
    textLines.push(`Get ${BONUS_MOVE_SPEED_PER_LEVEL} bonus move speed.`);
    return textLines;
}
