import { UpgradeOption, UpgradeOptionAndProbability } from "../upgrade.js";
import { Game } from "../../gameModel.js";
import { Character } from "../characterModel.js";
import { CHARACTER_UPGRADE_FUNCTIONS, CharacterUpgrade } from "../characterUpgrades.js";
import { CharacterClass } from "./playerCharacters.js";
import { findCharacterClassById } from "./levelingCharacter.js";

type CharacterUpgradeBonusMoveSpeed = CharacterUpgrade & {
    bonusMoveSpeed: number,
}

export const CHARACTER_UPGRADE_BONUS_MOVE_SPEED = "Bonus Move Speed";
const BONUS_MOVE_SPEED_PER_LEVEL = 0.2;

export function addCharacterUpgradeBonusMoveSpeed() {
    CHARACTER_UPGRADE_FUNCTIONS[CHARACTER_UPGRADE_BONUS_MOVE_SPEED] = {
        addUpgrade: applyUpgrade,
        executeOption: executeOption,
        getLongExplainText: getLongExplainText,
        getOptions: getOptions,
        getStatsDisplayText: getStatsDisplayText,
    }
}

function applyUpgrade(characterUpgrade: CharacterUpgrade, character: Character){
    const charClass = findCharacterClassById(character, characterUpgrade.classIdRef);
    if(!charClass) return;
    if(!charClass.characterClassUpgrades) charClass.characterClassUpgrades = {};
    const bonusHp = characterUpgrade as CharacterUpgradeBonusMoveSpeed;
    charClass.characterClassUpgrades[CHARACTER_UPGRADE_BONUS_MOVE_SPEED] = characterUpgrade;
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

function executeOption(option: UpgradeOption, character: Character){
    if(option.classIdRef === undefined) return;
    let up: CharacterUpgradeBonusMoveSpeed;
    const charClass = findCharacterClassById(character, option.classIdRef);
    if(!charClass) return;
    if(charClass.characterClassUpgrades === undefined) charClass.characterClassUpgrades = {};
    if (charClass.characterClassUpgrades[CHARACTER_UPGRADE_BONUS_MOVE_SPEED] === undefined) {
        up = {level: 0, bonusMoveSpeed: 0, classIdRef: option.classIdRef};
        charClass.characterClassUpgrades[CHARACTER_UPGRADE_BONUS_MOVE_SPEED] = up;
    } else {
        up = charClass.characterClassUpgrades[CHARACTER_UPGRADE_BONUS_MOVE_SPEED] as CharacterUpgradeBonusMoveSpeed;
    }
    up.level++;
    up.bonusMoveSpeed += BONUS_MOVE_SPEED_PER_LEVEL;
    character.moveSpeed += BONUS_MOVE_SPEED_PER_LEVEL;
}

function getStatsDisplayText(characterClass: CharacterClass): string {
    if(characterClass.characterClassUpgrades === undefined) return "";
    const up: CharacterUpgradeBonusMoveSpeed = characterClass.characterClassUpgrades[CHARACTER_UPGRADE_BONUS_MOVE_SPEED] as CharacterUpgradeBonusMoveSpeed;
    return `${CHARACTER_UPGRADE_BONUS_MOVE_SPEED}: ${up.bonusMoveSpeed}`;
}

function getLongExplainText(character: Character, option: UpgradeOption): string[] {
    const textLines: string[] = [];
    textLines.push(`Get ${BONUS_MOVE_SPEED_PER_LEVEL} bonus move speed.`);
    return textLines;
}
