import { AbilityUpgradeOption, ABILITIES_FUNCTIONS } from "../../ability/ability.js"
import { Game, IdCounter } from "../../gameModel.js"
import { RandomSeed } from "../../randomNumberGenerator.js"
import { createCharacterUpgradeOptions, fillRandomUpgradeOptions } from "../character.js"
import { Character, UpgradeOptionCharacter } from "../characterModel.js"
import { ABILITY_LEVELING_CHARACTER, AbilityLevelingCharacter, addAbilityLevelingCharacter } from "./abilityLevelingCharacter.js"
import { LEVELING_CHARACTER, LevelingCharacter, addLevelingCharacter } from "./levelingCharacterModel.js"
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

export function initCharacterChoiceOptons(character: Character, game: Game){
    const options: UpgradeOptionCharacter[] = createCharacterChooseUpgradeOptions(game);
    for(let i = 0; i < 3; i++){
        if(options.length > i){
            character.upgradeChoice.push({ name: options[i].name });
        }
    }
}
export function upgradePlayerCharacter(character: Character, upgradeOptionIndex: number, randomSeed: RandomSeed, game: Game) {
    if (character.upgradeChoice.length > 0) {
        let upgradeOption = character.upgradeChoice[upgradeOptionIndex];
        if (upgradeOption.abilityName !== undefined) {
            let ability = character.abilities.find(a => a.name === upgradeOption.abilityName);
            if (ability !== undefined) {
                let upgrades: AbilityUpgradeOption[];
                if (upgradeOption.boss) {
                    const abilityFunctions = ABILITIES_FUNCTIONS[upgradeOption.abilityName];
                    if (abilityFunctions.createAbilityBossUpgradeOptions) {
                        upgrades = abilityFunctions.createAbilityBossUpgradeOptions(ability);
                        upgrades.find((e) => e.name === upgradeOption.name)?.upgrade(ability);
                        if (ability.bossSkillPoints !== undefined) ability.bossSkillPoints--;
                    }
                } else {
                    upgrades = ABILITIES_FUNCTIONS[upgradeOption.abilityName].createAbilityUpgradeOptions(ability);
                    upgrades.find((e) => e.name === upgradeOption.name)?.upgrade(ability);
                }
                character.upgradeChoice = [];
            }
        } else {
            let upgrades = createCharacterUpgradeOptions(character, game);
            upgrades.find((e) => e.name === character.upgradeChoice[upgradeOptionIndex].name)?.upgrade(character);
            character.upgradeChoice = [];
        }
        if (character.type === LEVELING_CHARACTER) {
            const levelingCharacter = character as LevelingCharacter;
            levelingCharacter.availableSkillPoints--;
            if (levelingCharacter.availableSkillPoints > 0) {
                fillRandomUpgradeOptions(character, randomSeed);
            }
        } else if (character.type === ABILITY_LEVELING_CHARACTER) {
            const abilityLevelingCharacter = character as AbilityLevelingCharacter;
            for (let ability of abilityLevelingCharacter.abilities) {
                if (ability.bossSkillPoints !== undefined && ability.bossSkillPoints > 0) {
                    fillRandomUpgradeOptions(character, randomSeed, true);
                    break;
                }
            }
        }
    }
}

export function createCharacterChooseUpgradeOptions(game: Game): UpgradeOptionCharacter[] {
    const idCounter = game.state.idCounter;
    const upgradeOptions: UpgradeOptionCharacter[] = [];
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
