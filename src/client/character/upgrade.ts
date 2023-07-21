import { Game } from "../gameModel.js";
import { nextRandom } from "../randomNumberGenerator.js";
import { CHARACTER_TYPE_FUNCTIONS, Character } from "./characterModel.js";

export type UpgradeOption = {
    type: "Character" | "Ability" | "Pet" | "PetAbility",
    displayText: string,
    identifier: string,
    additionalInfo?: string,
    boss?: boolean,
}

export type AbilityUpgradeOption = UpgradeOption & {
    type: "Ability",
    name: string,
}

export type UpgradeOptionAndProbability = { option: UpgradeOption, probability: number };

export function fillRandomUpgradeOptionChoices(character: Character, game: Game) {
    if(character.upgradeChoices.length > 0) return;
    let upgradeOptionsAndProbabilities: UpgradeOptionAndProbability[] = getCharacterUpgradeOptions(character, game);
    let totalProbability = upgradeOptionsAndProbabilities.reduce((acc, ele) => acc + ele.probability, 0);

    const numberChoices = 3;
    for (let i = 0; i < numberChoices; i++) {
        const random = nextRandom(game.state.randomSeed) * totalProbability;
        let currentProb = 0;
        for (let j = 0; j < upgradeOptionsAndProbabilities.length; j++) {
            let upgradeOptionAndProbability = upgradeOptionsAndProbabilities[j];
            currentProb += upgradeOptionAndProbability.probability;
            if (currentProb >= random) {
                character.upgradeChoices.push(upgradeOptionAndProbability.option);
                upgradeOptionsAndProbabilities.splice(j, 1);
                totalProbability -= upgradeOptionAndProbability.probability;
                break;
            }
        }
    }
}

export function executeUpgradeOptionChoice(character: Character, upgradeChoice: UpgradeOption, game: Game) {
    let characterTypeFunction = CHARACTER_TYPE_FUNCTIONS[character.type];
    if (characterTypeFunction.executeUpgradeOption) {
        characterTypeFunction.executeUpgradeOption(character, upgradeChoice, game);
        character.upgradeChoices = [];
        fillRandomUpgradeOptionChoices(character, game);
    } else {
        throw new Error("missing upgrade function for " + character.type);
    }
}

function getCharacterUpgradeOptions(character: Character, game: Game): UpgradeOptionAndProbability[] {
    let upgradeOptionAndProbability: UpgradeOptionAndProbability[] = [];
    let characterTypeFunction = CHARACTER_TYPE_FUNCTIONS[character.type];
    if (characterTypeFunction.createBossUpgradeOptionsNew) {
        upgradeOptionAndProbability = characterTypeFunction.createBossUpgradeOptionsNew(character, game);
    }
    if (upgradeOptionAndProbability.length === 0 && characterTypeFunction.createUpgradeOptionsNew) {
        upgradeOptionAndProbability = characterTypeFunction.createUpgradeOptionsNew(character, game);
    }
    return upgradeOptionAndProbability;
}
