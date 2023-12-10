import { Game, IdCounter, Position } from "../../gameModel.js"
import { Character } from "../characterModel.js"
import { UpgradeOption } from "../upgrade.js"
import { addAbilityLevelingCharacter } from "./abilityLevelingCharacter.js"
import { addBallClass } from "./characterClassBall.js"
import { addLevelingCharacter } from "./levelingCharacterModel.js"
import { addSniperClass } from "./sniperCharacter.js"
import { addTamerClass } from "./tamer/tamerCharacter.js"
import { addTowerClass } from "./towerCharacterClass.js"

export type PlayerCharacterClassFunctions = {
    changeCharacterToThisClass: (character: Character, idCounter: IdCounter, game: Game) => void,
    createBossBasedOnClassAndCharacter?: (basedOnCharacter: Character, level: number, spawn: Position, game: Game) => Character,
    getLongUiText?: () => string[],
    preventMultiple?: boolean,
}

export type PlayerCharacterClassesFunctions = {
    [key: string]: PlayerCharacterClassFunctions,
}

export const PLAYER_CHARACTER_CLASSES_FUNCTIONS: PlayerCharacterClassesFunctions = {};

export function onDomLoadSetCharacterClasses() {
    addLevelingCharacter();
    addAbilityLevelingCharacter();
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
            type: "Character",
            identifier: key
        };
        let functions = PLAYER_CHARACTER_CLASSES_FUNCTIONS[key];
        if(functions && functions.getLongUiText){
            option.displayLongText = functions.getLongUiText();
        }
        upgradeOptions.push(option);
    }

    return upgradeOptions;
}

export function isPreventedDuplicateClass(fromCharacter: Character, toCharacter: Character): boolean{
    if(!fromCharacter.characterClass) return false;
    const takeoverClassFunctions = PLAYER_CHARACTER_CLASSES_FUNCTIONS[fromCharacter.characterClass];
    if(takeoverClassFunctions && !takeoverClassFunctions.preventMultiple) return false;
    if(fromCharacter.characterClass === toCharacter.characterClass) return true;
    if(toCharacter.overtakenCharacterClasses){
        const overtaken = toCharacter.overtakenCharacterClasses.find(c => c === fromCharacter.characterClass);
        if(overtaken) return true;
    }    
    return false;
}
