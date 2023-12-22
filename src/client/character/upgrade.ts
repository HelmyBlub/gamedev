import { Game } from "../gameModel.js";
import { nextRandom } from "../randomNumberGenerator.js";
import { executeDefaultCharacterUpgradeOption } from "./character.js";
import { CHARACTER_TYPE_FUNCTIONS, Character } from "./characterModel.js";
import { PLAYER_CHARACTER_CLASSES_FUNCTIONS } from "./playerCharacters/playerCharacters.js";

export type UpgradeOption = {
    type: "Character" | "Ability" | "Pet" | "PetAbility",
    displayText: string,
    displayLongText?: string[],
    identifier: string,
    additionalInfo?: string,
    boss?: boolean,
    order?: number,
}

export type AbilityUpgradeOption = UpgradeOption & {
    type: "Ability",
    name: string,
}

export type PetAbilityUpgradeOption = UpgradeOption & {
    type: "PetAbility",
    abilityName: string,
    petId: number,
}

export type UpgradeOptionAndProbability = { option: UpgradeOption, probability: number };

export function fillRandomUpgradeOptionChoices(character: Character, game: Game) {
    if (character.upgradeChoices.length > 0) return;
    const upgradeOptionsAndProbabilities: UpgradeOptionAndProbability[] = getCharacterUpgradeOptions(character, game);
    setUpgradeOptionOrderValues(upgradeOptionsAndProbabilities);
    let totalProbability = upgradeOptionsAndProbabilities.reduce((acc, ele) => acc + ele.probability, 0);

    const numberChoices = 3;
    for (let i = 0; i < numberChoices; i++) {
        const random = nextRandom(game.state.randomSeed) * totalProbability;
        let currentProb = 0;
        for (let j = 0; j < upgradeOptionsAndProbabilities.length; j++) {
            const upgradeOptionAndProbability = upgradeOptionsAndProbabilities[j];
            currentProb += upgradeOptionAndProbability.probability;
            if (currentProb >= random) {
                character.upgradeChoices.push(upgradeOptionAndProbability.option);
                upgradeOptionsAndProbabilities.splice(j, 1);
                totalProbability -= upgradeOptionAndProbability.probability;
                break;
            }
        }
    }
    character.upgradeChoices.sort((a,b) => a.order! - b.order!);
}

export function executeUpgradeOptionChoice(character: Character, upgradeChoice: UpgradeOption, game: Game) {
    if(character.characterClass){
        const classFunction = PLAYER_CHARACTER_CLASSES_FUNCTIONS[character.characterClass];
        if (classFunction.executeUpgradeOption) {
            classFunction.executeUpgradeOption(character, upgradeChoice, game);
        }    
    }else{
        executeDefaultCharacterUpgradeOption(character, upgradeChoice, game);
    }
    character.upgradeChoices = [];
    fillRandomUpgradeOptionChoices(character, game);
}

function setUpgradeOptionOrderValues(options: UpgradeOptionAndProbability[]){
    for(let i = 0; i < options.length; i++){
        options[i].option.order = i;
    }
}

function getCharacterUpgradeOptions(character: Character, game: Game): UpgradeOptionAndProbability[] {
    let upgradeOptionAndProbability: UpgradeOptionAndProbability[] = [];
    if(!character.characterClass) return [];
    const classFunction = PLAYER_CHARACTER_CLASSES_FUNCTIONS[character.characterClass];
    if (classFunction.createBossUpgradeOptions) {
        upgradeOptionAndProbability = classFunction.createBossUpgradeOptions(character, game);
    }
    if (upgradeOptionAndProbability.length === 0 && classFunction.createUpgradeOptions) {
        upgradeOptionAndProbability = classFunction.createUpgradeOptions(character, game);
    }
    return upgradeOptionAndProbability;
}
