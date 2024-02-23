import { UpgradeOption, UpgradeOptionAndProbability } from "../upgrade.js";
import { Game } from "../../gameModel.js";
import { Character } from "../characterModel.js";
import { CHARACTER_UPGRADE_FUNCTIONS, CharacterUpgrade } from "./characterUpgrades.js";
import { findCharacterClassById } from "../playerCharacters/levelingCharacter.js";
import { CharacterClass } from "../playerCharacters/playerCharacters.js";

export type CharacterUpgradeBonusHP = CharacterUpgrade & {
    bonusHp: number,
}

export const CHARACTER_UPGRADE_BONUS_HP = "Bonus HP";
const BONUS_HP_PER_LEVEL = 200;

export function addCharacterUpgradeBonusHp() {
    CHARACTER_UPGRADE_FUNCTIONS[CHARACTER_UPGRADE_BONUS_HP] = {
        addUpgrade: addUpgrade,
        executeOption: executeOption,
        getMoreInfoText: getMoreInfoText,
        getOptions: getOptions,
        getStatsDisplayText: getStatsDisplayText,
    }
}

export function characterCreateAndAddUpgradeBonusHp(charClass: CharacterClass, character: Character, bonusHp: number) {
    if (!charClass.characterClassUpgrades) charClass.characterClassUpgrades = {};
    let upgrade: CharacterUpgradeBonusHP = charClass.characterClassUpgrades[CHARACTER_UPGRADE_BONUS_HP] as CharacterUpgradeBonusHP;
    if (!upgrade) {
        upgrade = {
            bonusHp: 0,
            level: 1,
        }
        charClass.characterClassUpgrades[CHARACTER_UPGRADE_BONUS_HP] = upgrade;
    }
    upgrade.bonusHp += bonusHp;
    character.hp += bonusHp;
    character.maxHp += bonusHp;
}

function addUpgrade(characterUpgrade: CharacterUpgrade, character: Character, game: Game, charClass: CharacterClass | undefined) {
    const bonusHp = characterUpgrade as CharacterUpgradeBonusHP;
    if (charClass) {
        if (!charClass.characterClassUpgrades) charClass.characterClassUpgrades = {};
        charClass.characterClassUpgrades[CHARACTER_UPGRADE_BONUS_HP] = characterUpgrade;
    }
    character.hp += bonusHp.bonusHp;
    character.maxHp += bonusHp.bonusHp;
}

function getOptions(character: Character, game: Game): UpgradeOptionAndProbability[] {
    const upgradeOptions: UpgradeOptionAndProbability[] = [];
    const optionAndProbability: UpgradeOptionAndProbability = {
        option: {
            identifier: CHARACTER_UPGRADE_BONUS_HP,
            displayText: CHARACTER_UPGRADE_BONUS_HP,
            type: "Character",
        },
        probability: 1,
    };
    optionAndProbability.option.displayMoreInfoText = getMoreInfoText(character, optionAndProbability.option);
    upgradeOptions.push(optionAndProbability);
    return upgradeOptions;
}

function executeOption(option: UpgradeOption, character: Character) {
    if (option.classIdRef === undefined) return;
    let up: CharacterUpgradeBonusHP;
    const charClass = findCharacterClassById(character, option.classIdRef);
    if (!charClass) return;
    if (charClass.characterClassUpgrades === undefined) charClass.characterClassUpgrades = {};
    if (charClass.characterClassUpgrades[CHARACTER_UPGRADE_BONUS_HP] === undefined) {
        up = { level: 0, bonusHp: 0 };
        charClass.characterClassUpgrades[CHARACTER_UPGRADE_BONUS_HP] = up;
    } else {
        up = charClass.characterClassUpgrades[CHARACTER_UPGRADE_BONUS_HP] as CharacterUpgradeBonusHP;
    }
    up.level++;
    up.bonusHp += BONUS_HP_PER_LEVEL;
    character.hp += BONUS_HP_PER_LEVEL;
    character.maxHp += BONUS_HP_PER_LEVEL;
}

function getStatsDisplayText(characterUpgrade: CharacterUpgrade): string {
    const up: CharacterUpgradeBonusHP = characterUpgrade as CharacterUpgradeBonusHP;
    return `${CHARACTER_UPGRADE_BONUS_HP}: ${up.bonusHp}`;
}

function getMoreInfoText(character: Character, option: UpgradeOption): string[] {
    const textLines: string[] = [];
    textLines.push(`Get ${BONUS_HP_PER_LEVEL} bonus hp and max hp.`);
    return textLines;
}
