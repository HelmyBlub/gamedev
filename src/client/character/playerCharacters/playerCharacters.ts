import { Game, IdCounter, Legendary, Position } from "../../gameModel.js"
import { Character } from "../characterModel.js"
import { CharacterUpgrade, CharacterUpgrades } from "../upgrades/characterUpgrades.js"
import { UpgradeOption, UpgradeOptionAndProbability } from "../upgrade.js"
import { addBallClass } from "./characterClassBall.js"
import { Leveling } from "./levelingCharacter.js"
import { addSniperClass } from "./sniperCharacter.js"
import { addTamerClass } from "./tamer/tamerCharacter.js"
import { addTowerClass } from "./towerCharacterClass.js"

export type PlayerCharacterClassFunctions = {
    changeCharacterToThisClass: (character: Character, idCounter: IdCounter, game: Game) => void,
    createBossBasedOnClassAndCharacter?: (basedOnCharacter: Character, level: number, spawn: Position, game: Game) => Character,
    createUpgradeOptions?: (character: Character, characterClass: CharacterClass, game: Game) => UpgradeOptionAndProbability[],
    createBossUpgradeOptions?: (character: Character, game: Game) => UpgradeOptionAndProbability[],
    executeUpgradeOption?: (character: Character, upgradeOptionChoice: UpgradeOption, game: Game) => void,
    getMoreInfosText?: () => string[],
    preventMultiple?: boolean,
}

export type CharacterClass = {
    id: number,
    className: string,
    level?: Leveling,
    gifted?: boolean,
    legendary?: {
        levelCap: number,
        blessings: string[],
    },
    availableSkillPoints?: number,
    characterClassUpgrades?: CharacterUpgrades,
}

export type PlayerCharacterClassesFunctions = {
    [key: string]: PlayerCharacterClassFunctions,
}

export const PLAYER_CHARACTER_CLASSES_FUNCTIONS: PlayerCharacterClassesFunctions = {};

export function onDomLoadSetCharacterClasses() {
    addSniperClass();
    addTowerClass();
    addTamerClass();
    addBallClass();
}

export function initPlayerCharacterChoiceOptions(character: Character, game: Game) {
    const options: UpgradeOption[] = createCharacterChooseUpgradeOptions(game);
    for (let i = 0; i < 4; i++) {
        if (options.length > i) {
            character.upgradeChoices.push(options[i]);
        }
    }
}

export function createCharacterChooseUpgradeOptions(game: Game): UpgradeOption[] {
    const upgradeOptions: UpgradeOption[] = [];
    const keys = Object.keys(PLAYER_CHARACTER_CLASSES_FUNCTIONS);

    for (let key of keys) {
        let option: UpgradeOption = {
            displayText: key,
            type: "ChooseClass",
            identifier: key
        };
        let functions = PLAYER_CHARACTER_CLASSES_FUNCTIONS[key];
        if (functions && functions.getMoreInfosText) {
            option.displayMoreInfoText = functions.getMoreInfosText();
        }
        upgradeOptions.push(option);
    }

    return upgradeOptions;
}

export function shareCharactersTradeablePreventedMultipleClass(fromCharacter: Character, toCharacter: Character): boolean {
    if (!fromCharacter.characterClasses) return false;
    const giftingClass = findMainCharacterClass(fromCharacter);
    return hasCharacterPreventedMultipleClass(giftingClass, toCharacter);
}

export function hasCharacterPreventedMultipleClass(newCharacterClassName: string, toCharacter: Character): boolean {
    const newCharacterClassFunctions = PLAYER_CHARACTER_CLASSES_FUNCTIONS[newCharacterClassName];
    if (newCharacterClassFunctions && !newCharacterClassFunctions.preventMultiple) return false;
    if (toCharacter.characterClasses) {
        const overtaken = toCharacter.characterClasses.find(c => c.className === newCharacterClassName);
        if (overtaken) return true;
    }
    return false;
}

export function findMainCharacterClass(character: Character): string {
    if (character.characterClasses) {
        for (let charClass of character.characterClasses) {
            if (!charClass.gifted && !charClass.legendary) return charClass.className;
        }
    }
    return "";
}

export function hasPlayerChoosenStartClassUpgrade(character: Character): boolean {
    if (character.upgradeChoices.length > 0 && character.upgradeChoices[0].type === "ChooseClass") {
        return false;
    }
    return true;
}
