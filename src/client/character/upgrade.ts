import { Game } from "../gameModel.js";
import { nextRandom } from "../randomNumberGenerator.js";
import { executeDefaultCharacterUpgradeOption } from "./character.js";
import { Character } from "./characterModel.js";
import { CharacterClass, PLAYER_CHARACTER_CLASSES_FUNCTIONS } from "./playerCharacters/playerCharacters.js";

export type UpgradeOption = {
    type: "Character" | "Ability" | "Pet" | "PetAbility" | "ChooseClass" | "Reroll",
    characterClass?: string,
    displayText: string,
    displayMoreInfoText?: string[],
    identifier: string,
    additionalInfo?: string,
    boss?: boolean,
    order?: number,
    classIdRef?: number,
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
    if (upgradeOptionsAndProbabilities.length === 0) return;
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
    if (character.upgradeChoiceRerools && character.upgradeChoiceRerools > 0) {
        character.upgradeChoices.push(createRerollUpgradeOption(character.upgradeChoiceRerools));
    }
    character.upgradeChoices.sort((a, b) => a.order! - b.order!);
}

export function executeUpgradeOptionChoice(character: Character, upgradeChoice: UpgradeOption, game: Game) {
    if (upgradeChoice.characterClass) {
        const classFunction = PLAYER_CHARACTER_CLASSES_FUNCTIONS[upgradeChoice.characterClass];
        if (classFunction.executeUpgradeOption) {
            classFunction.executeUpgradeOption(character, upgradeChoice, game);
        }
    } else {
        executeDefaultCharacterUpgradeOption(character, upgradeChoice, game);
    }
    character.upgradeChoices = [];
    fillRandomUpgradeOptionChoices(character, game);
}

export function executeRerollUpgradeOption(character: Character, game: Game) {
    if (character.upgradeChoiceRerools === undefined) return;
    if (character.upgradeChoices.length > 0) character.upgradeChoices = [];
    character.upgradeChoiceRerools--;
    fillRandomUpgradeOptionChoices(character, game);
}

function setUpgradeOptionOrderValues(options: UpgradeOptionAndProbability[]) {
    for (let i = 0; i < options.length; i++) {
        options[i].option.order = i;
    }
}

function createRerollUpgradeOption(availableRerolls: number): UpgradeOption {
    return {
        displayText: `Reroll (${availableRerolls})`,
        displayMoreInfoText: [
            "Reroll to get new choices.",
            `${availableRerolls} rerolls left this run.`,
        ],
        type: "Reroll",
        identifier: "Reroll",
    }
}

function getCharacterUpgradeOptions(character: Character, game: Game): UpgradeOptionAndProbability[] {
    let upgradeOptionAndProbability: UpgradeOptionAndProbability[] = [];
    if (character.characterClasses) {
        for (let tempClass of character.characterClasses) {
            upgradeOptionAndProbability = getCharacterUpgradeOptionsForClass(character, tempClass, game);
            if (upgradeOptionAndProbability.length > 0) break;
        }
    }
    return upgradeOptionAndProbability;
}

function getCharacterUpgradeOptionsForClass(character: Character, characterClass: CharacterClass, game: Game): UpgradeOptionAndProbability[] {
    let upgradeOptionAndProbability: UpgradeOptionAndProbability[] = [];
    const classFunction = PLAYER_CHARACTER_CLASSES_FUNCTIONS[characterClass.className];
    if (classFunction.createBossUpgradeOptions) {
        upgradeOptionAndProbability = classFunction.createBossUpgradeOptions(character, game);
    }
    if (upgradeOptionAndProbability.length === 0 && classFunction.createUpgradeOptions) {
        upgradeOptionAndProbability = classFunction.createUpgradeOptions(character, characterClass, game);
    }
    return upgradeOptionAndProbability;
}
