import { Game, IdCounter } from "../../gameModel.js"
import { Character } from "../characterModel.js"
import { CharacterUpgradeOption } from "../characterUpgrades.js"
import { addAbilityLevelingCharacter } from "./abilityLevelingCharacter.js"
import { addLevelingCharacter } from "./levelingCharacterModel.js"
import { addSniperClass } from "./sniperCharacter.js"
import { addTamerClass } from "./tamerCharacter.js"
import { addTowerClass } from "./towerCharacterClass.js"

export type PlayerCharacterClassFunctions = {
    changeCharacterToThisClass: (character: Character, idCounter: IdCounter, game: Game) => void,
}

export type PlayerCharacterClassesFunctions = {
    [key: string]: PlayerCharacterClassFunctions,
}

export const PLAYER_CHARACTER_CLASSES_FUNCTIONS: PlayerCharacterClassesFunctions = {};

export function onDomLoadSetCharacterClasses() {
    addLevelingCharacter();
    addAbilityLevelingCharacter();
    //addShooterClass();
    //addSwordClass();
    //addCasterClass();
    addSniperClass();
    addTowerClass();
    addTamerClass();
}

export function initPlayerCharacterChoiceOptions(character: Character, game: Game){
    const options: CharacterUpgradeOption[] = createCharacterChooseUpgradeOptions(game);
    for(let i = 0; i < 3; i++){
        if(options.length > i){
            character.upgradeChoice.push({ name: options[i].name });
        }
    }
}

export function createCharacterChooseUpgradeOptions(game: Game): CharacterUpgradeOption[] {
    const idCounter = game.state.idCounter;
    const upgradeOptions: CharacterUpgradeOption[] = [];
    let keys = Object.keys(PLAYER_CHARACTER_CLASSES_FUNCTIONS);

    for(let key of keys){
        upgradeOptions.push({
            name: key, probabilityFactor: 1, upgrade: (c: Character) => {
                PLAYER_CHARACTER_CLASSES_FUNCTIONS[key].changeCharacterToThisClass(c, idCounter, game);
            }
        });
    }

    return upgradeOptions;
}
