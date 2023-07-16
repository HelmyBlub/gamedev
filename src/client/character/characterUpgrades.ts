import { AbilityUpgradeOption, ABILITIES_FUNCTIONS } from "../ability/ability.js";
import { upgradeAbility } from "../ability/abilityUpgrade.js";
import { Game } from "../gameModel.js";
import { RandomSeed, nextRandom } from "../randomNumberGenerator.js";
import { CHARACTER_TYPE_FUNCTIONS, Character, DEFAULT_CHARACTER } from "./characterModel.js";
import { ABILITY_LEVELING_CHARACTER, AbilityLevelingCharacter } from "./playerCharacters/abilityLevelingCharacter.js";
import { LEVELING_CHARACTER, LevelingCharacter } from "./playerCharacters/levelingCharacterModel.js";
import { createCharacterChooseUpgradeOptions } from "./playerCharacters/playerCharacters.js";

export type CharacterUpgradeOption = {
    name: string,
    probabilityFactor: number,
    upgrade: (levelingCharacter: Character) => void,
}

export type CharacterUpgradeChoice = {
    abilityName?: string,
    abilityUpgradeName?: string,
    name: string,
    boss?: boolean,
}

type AbilitiesUpgradeAndProbability = { [key: string]: { options: AbilityUpgradeOption[], probability: number } };
type CharacterUpgradeAndProbability = { options: CharacterUpgradeOption[], probability: number };

export function createCharacterUpgradeOptions(character: Character, game: Game): CharacterUpgradeOption[] {
    let upgradeOptions: CharacterUpgradeOption[] = [];
    upgradeOptions.push({
        name: "Max Health+50", probabilityFactor: 1, upgrade: (c: Character) => {
            c.hp += 50;
            c.maxHp += 50;
        }
    });
    upgradeOptions.push({
        name: "Move Speed+0.2", probabilityFactor: 1, upgrade: (c: Character) => {
            c.moveSpeed += 0.2;
        }
    });

    return upgradeOptions;
}

export function fillRandomUpgradeOptions(character: Character, randomSeed: RandomSeed, game: Game, boss: boolean = false) {
    if (character.upgradeChoice.length !== 0) return;
    let characterOptions = getCharacterUpgradeOptions(character, game, boss);
    let abilitiesOptions = getAbilityUpgradeOptions(character, boss);
    choose3RandomUpgrades(character, characterOptions, abilitiesOptions, boss, game);
}

export function upgradeCharacter(character: Character, upgradeOptionIndex: number, randomSeed: RandomSeed, game: Game) {
    if (character.upgradeChoice.length > 0) {
        let upgradeChoice = character.upgradeChoice[upgradeOptionIndex];
        if(upgradeChoice === undefined) return;
        if (upgradeChoice.abilityName !== undefined) {
            upgradeAbility(character, upgradeChoice);
        } else {
            const upgradeOption = getCharacterUpgradeOptionByChoice(character, upgradeChoice, game);
            if (upgradeOption) upgradeOption.upgrade(character);
            character.upgradeChoice = [];
        }
        decideWhichAndFillRandomUpgradeChoices(character, randomSeed, game);
    }
}

function getCharacterUpgradeOptionByChoice(character: Character, upgradeChoice: CharacterUpgradeChoice, game: Game): CharacterUpgradeOption | undefined {
    let characterTypeFunction = CHARACTER_TYPE_FUNCTIONS[character.type];
    if (characterTypeFunction.getUpgradeOptionByUpgradeChoice) {
        return characterTypeFunction.getUpgradeOptionByUpgradeChoice(character, upgradeChoice, game);
    } else {
        if (upgradeChoice.boss) {
            if (characterTypeFunction.createBossUpgradeOptions) {
                let upgrades = characterTypeFunction.createBossUpgradeOptions(character, game);
                return upgrades.find((e) => e.name === upgradeChoice.name);
            }
        } else {
            if (characterTypeFunction.createUpgradeOptions) {
                let upgrades = characterTypeFunction.createUpgradeOptions(character, game);
                return upgrades.find((e) => e.name === upgradeChoice.name);
            }
        }
    }
    return undefined;
}

function decideWhichAndFillRandomUpgradeChoices(character: Character, randomSeed: RandomSeed, game: Game) {
    if (character.upgradeChoice.length > 0) return;
    if (character.type === LEVELING_CHARACTER) {
        const levelingCharacter = character as LevelingCharacter;
        levelingCharacter.availableSkillPoints--;
        if (levelingCharacter.availableSkillPoints > 0) {
            fillRandomUpgradeOptions(character, randomSeed, game);
            return;
        }
    } else if (character.type === ABILITY_LEVELING_CHARACTER) {
        const abilityLevelingCharacter = character as AbilityLevelingCharacter;
        for (let ability of abilityLevelingCharacter.abilities) {
            if (ability.bossSkillPoints !== undefined && ability.bossSkillPoints > 0) {
                fillRandomUpgradeOptions(character, randomSeed, game, true);
                return;
            }
        }
    } else if (character.pets) {
        for (let pet of character.pets) {
            if (pet.bossSkillPoints && pet.bossSkillPoints > 0) {
                fillRandomUpgradeOptions(character, randomSeed, game, true);
                return;
            }
        }
    }
}

function choose3RandomUpgrades(character: Character, characterOptions: CharacterUpgradeAndProbability, abilitiesOptions: AbilitiesUpgradeAndProbability, boss: boolean, game: Game) {
    for (let i = 0; i < 3; i++) {
        const abilitiesOptionsKeys = Object.keys(abilitiesOptions);
        let totablPropability = characterOptions.probability;
        for (let key of abilitiesOptionsKeys) {
            totablPropability += abilitiesOptions[key].probability;
        }
        if (totablPropability === 0) return;
        let randomProbability = nextRandom(game.state.randomSeed) * (totablPropability);
        if (randomProbability < characterOptions.probability) {
            randomProbability = findAndAddCharacterUpgradeForRandomValue(character, randomProbability, characterOptions, boss);
        } else {
            randomProbability -= characterOptions.probability;
            randomProbability = findAndAddAbilityUpgradeForRandomValue(character, randomProbability, abilitiesOptions, boss);
        }
        if (randomProbability >= 0) throw new Error("getting random upgrade option with probabilities failed. Random value to high?");
    }
}

function findAndAddAbilityUpgradeForRandomValue(character: Character, randomProbability: number, abilitiesOptions: AbilitiesUpgradeAndProbability, boss: boolean): number {
    const abilitiesOptionsKeys = Object.keys(abilitiesOptions);
    let abilityName = "";
    for (let abilityKeyIndex = 0; abilityKeyIndex < abilitiesOptionsKeys.length; abilityKeyIndex++) {
        if (randomProbability < abilitiesOptions[abilitiesOptionsKeys[abilityKeyIndex]].probability) {
            abilityName = abilitiesOptionsKeys[abilityKeyIndex];
            break;
        };
        randomProbability -= abilitiesOptions[abilitiesOptionsKeys[abilityKeyIndex]].probability;
    }
    let abilityOptions = abilitiesOptions[abilityName];

    for (let abilityOptionIndex = 0; abilityOptionIndex < abilityOptions.options.length; abilityOptionIndex++) {
        randomProbability -= abilityOptions.options[abilityOptionIndex].probabilityFactor;
        if (randomProbability < 0) {
            character.upgradeChoice.push({
                name: abilityOptions.options[abilityOptionIndex].name,
                abilityName: abilityName,
                abilityUpgradeName: abilityOptions.options[abilityOptionIndex].upgradeName,
                boss: boss
            });
            abilityOptions.probability -= abilityOptions.options[abilityOptionIndex].probabilityFactor;
            abilityOptions.options.splice(abilityOptionIndex, 1);
            if (abilityOptions.options.length === 0) {
                delete abilitiesOptions[abilityName];
            }
            break;
        }
    }
    return randomProbability;
}

function findAndAddCharacterUpgradeForRandomValue(character: Character, randomProbability: number, characterOptions: CharacterUpgradeAndProbability, boss: boolean): number {
    let characterOptionIndex = 0;
    for (characterOptionIndex = 0; characterOptionIndex < characterOptions.options.length; characterOptionIndex++) {
        randomProbability -= characterOptions.options[characterOptionIndex].probabilityFactor;
        if (randomProbability < 0) {
            break;
        };
    }
    if (randomProbability >= 0) throw new Error("getting random upgrade option with probabilities failed. Probability not fitting to character options");
    character.upgradeChoice.push({ name: characterOptions.options[characterOptionIndex].name, boss: boss });
    characterOptions.probability -= characterOptions.options[characterOptionIndex].probabilityFactor;
    characterOptions.options.splice(characterOptionIndex, 1);
    return randomProbability;
}

function getCharacterUpgradeOptions(character: Character, game: Game, boss: boolean): CharacterUpgradeAndProbability {
    let characterOptions: CharacterUpgradeOption[] = [];
    let characterOptionProbability = 0;
    let characterTypeFunction = CHARACTER_TYPE_FUNCTIONS[character.type];
    if (!boss) {
        if (characterTypeFunction.createUpgradeOptions) {
            characterOptions = characterTypeFunction.createUpgradeOptions(character, game);
            for (let characterOption of characterOptions) {
                characterOptionProbability += characterOption.probabilityFactor;
            }
        }
    } else {
        if (characterTypeFunction.createBossUpgradeOptions) {
            characterOptions = characterTypeFunction.createBossUpgradeOptions(character, game);
            for (let characterOption of characterOptions) {
                characterOptionProbability += characterOption.probabilityFactor;
            }
        }
    }
    return { options: characterOptions, probability: characterOptionProbability };
}

function getAbilityUpgradeOptions(character: Character, boss: boolean): AbilitiesUpgradeAndProbability {
    let abilitiesOptions: AbilitiesUpgradeAndProbability = {};
    for (let ability of character.abilities) {
        let options: AbilityUpgradeOption[] = [];
        if (boss) {
            const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
            if (abilityFunctions.createAbilityBossUpgradeOptions && ability.bossSkillPoints !== undefined && ability.bossSkillPoints > 0) {
                options = abilityFunctions.createAbilityBossUpgradeOptions(ability);
            }
        } else {
            options = ABILITIES_FUNCTIONS[ability.name].createAbilityUpgradeOptions(ability);
        }
        if (options.length > 0) {
            let abilityOptionProbability = 0;
            for (let abilityOption of options) {
                abilityOptionProbability += abilityOption.probabilityFactor;
            }
            abilitiesOptions[ability.name] = { options, probability: abilityOptionProbability };
            if (boss) break;
        }
    }
    return abilitiesOptions;
}
