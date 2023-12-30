import { getPlayerCharacters, turnCharacterToPet, moveCharacterTick } from "../character.js";
import { Game, GameState } from "../../gameModel.js";
import { RandomSeed } from "../../randomNumberGenerator.js";
import { Character } from "../characterModel.js";
import { AbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability, fillRandomUpgradeOptionChoices } from "../upgrade.js";
import { ABILITIES_FUNCTIONS } from "../../ability/ability.js";
import { PLAYER_CLASS_TOWER_BUILDER } from "./towerCharacterClass.js";

export type Leveling = {
    level: number,
    leveling?: {
        experience: number,
        experienceForLevelUp: number,
    }
}

export function levelingCharacterXpGain(state: GameState, killedCharacter: Character, game: Game) {
    let playerCharacters = getPlayerCharacters(state.players);
    for (let character of playerCharacters) {
        if (character.level?.leveling !== undefined && !character.isDead && !character.isPet) {
            character.level.leveling.experience += killedCharacter.experienceWorth;
            while (character.level.leveling.experience >= character.level.leveling.experienceForLevelUp) {
                levelingCharacterLevelUp(character, state.randomSeed, game);
            }
        }
    }
}

export function changeToLevelingCharacter(character: Character, game: Game) {
    character.level = {
        level: 0,
        leveling: {
            experience: 0,
            experienceForLevelUp: 10,
        }
    };
    character.availableSkillPoints = 0;
}

function levelingCharacterLevelUp(character: Character, randomSeed: RandomSeed, game: Game) {
    if (!character.level?.leveling || character.availableSkillPoints === undefined) return;
    character.level.level++;
    character.availableSkillPoints += 1;
    character.level.leveling.experience -= character.level.leveling.experienceForLevelUp;
    character.level.leveling.experienceForLevelUp += Math.floor(character.level.level / 2);
    fillRandomUpgradeOptionChoices(character, game);
}

export function executeLevelingCharacterUpgradeOption(character: Character, upgradeOption: UpgradeOption, game: Game) {
    if (character.availableSkillPoints === undefined) return;
    if (upgradeOption.type === "Character") {
        if (upgradeOption.identifier === "Max Health+50") {
            character.hp += 50;
            character.maxHp += 50;
        }
        if (upgradeOption.identifier === "Move Speed+0.2") {
            character.moveSpeed += 0.2;
        }
    } else if (upgradeOption.type === "Ability") {
        const abilityUpgradeOption = upgradeOption as AbilityUpgradeOption;
        const ability = character.abilities.find((a) => a.name === abilityUpgradeOption.name);
        if (ability) {
            const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
            if (abilityFunctions && abilityFunctions.executeUpgradeOption) {
                abilityFunctions.executeUpgradeOption(ability, character, upgradeOption, game);
            }
        }
    }
    character.availableSkillPoints--;
}

export function createCharacterUpgradeOptionsNew(character: Character, game: Game): UpgradeOptionAndProbability[] {
    const upgradeOptions: UpgradeOptionAndProbability[] = [];
    if (character.availableSkillPoints === 0) return upgradeOptions;
    upgradeOptions.push({
        option: {
            identifier: "Max Health+50",
            displayText: "Max Health+50",
            type: "Character",
        },
        probability: 1,
    });
    upgradeOptions.push({
        option: {
            identifier: "Move Speed+0.2",
            displayText: "Move Speed+0.2",
            type: "Character",
        },
        probability: 1,
    });

    for (let ability of character.abilities) {
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions && abilityFunctions.createAbilityUpgradeOptions) {
            upgradeOptions.push(...abilityFunctions.createAbilityUpgradeOptions(ability));
        }
    }
    for(let option of upgradeOptions){
        option.option.characterClass = PLAYER_CLASS_TOWER_BUILDER;
    }
    return upgradeOptions;
}