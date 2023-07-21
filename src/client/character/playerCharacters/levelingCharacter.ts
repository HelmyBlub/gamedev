import { getPlayerCharacters, turnCharacterToPet, moveCharacterTick } from "../character.js";
import { Game, GameState } from "../../gameModel.js";
import { RandomSeed } from "../../randomNumberGenerator.js";
import { Character } from "../characterModel.js";
import { LEVELING_CHARACTER, LevelingCharacter } from "./levelingCharacterModel.js";
import { AbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability, fillRandomUpgradeOptionChoices } from "../upgrade.js";
import { ABILITIES_FUNCTIONS } from "../../ability/ability.js";

export function levelingCharacterXpGain(state: GameState, killedCharacter: Character, game: Game) {
    let playerCharacters: LevelingCharacter[] = getPlayerCharacters(state.players) as LevelingCharacter[];
    for (let character of playerCharacters) {
        if (character.leveling !== undefined && !character.isDead && !character.isPet && character.type === LEVELING_CHARACTER) {
            character.leveling.experience += killedCharacter.experienceWorth;
            while (character.leveling.experience >= character.leveling.experienceForLevelUp) {
                levelingCharacterLevelUp(character, state.randomSeed, game);
            }
        }
    }
}

export function tickLevelingCharacter(character: Character, game: Game) {
    const levelingCharacter = character as LevelingCharacter;
    if (character.isDead) {
        if (!character.willTurnToPetOnDeath) return;
        turnCharacterToPet(character, game);
    }
    moveCharacterTick(character, game.state.map, game.state.idCounter);
}

function levelingCharacterLevelUp(character: LevelingCharacter, randomSeed: RandomSeed, game: Game) {
    character.leveling.level++;
    character.availableSkillPoints += 1;
    character.leveling.experience -= character.leveling.experienceForLevelUp;
    character.leveling.experienceForLevelUp += Math.floor(character.leveling.level / 2);
    fillRandomUpgradeOptionChoices(character, game);
}

export function executeLevelingCharacterUpgradeOption(character: Character, upgradeOption: UpgradeOption, game: Game){
    const levelingCharacter = character as LevelingCharacter;
    if(upgradeOption.type === "Character"){
        if(upgradeOption.identifier === "Max Health+50"){
            character.hp += 50;
            character.maxHp += 50;
        }
        if(upgradeOption.identifier === "Move Speed+0.2"){
            character.moveSpeed += 0.2;
        }
    }else if(upgradeOption.type === "Ability"){
        const abilityUpgradeOption = upgradeOption as AbilityUpgradeOption;
        let ability = character.abilities.find((a) => a.name === abilityUpgradeOption.name);
        if(ability){
            let abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
            if(abilityFunctions && abilityFunctions.executeUpgradeOption){
                abilityFunctions.executeUpgradeOption(ability, character, upgradeOption, game);
            }
        }
    }
    levelingCharacter.availableSkillPoints--;
}

export function createCharacterUpgradeOptionsNew(character: Character, game: Game): UpgradeOptionAndProbability[] {
    let leveling = character as LevelingCharacter;
    let upgradeOptions: UpgradeOptionAndProbability[] = [];
    if(leveling.availableSkillPoints === 0) return upgradeOptions;
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

    for(let ability of character.abilities){
        let abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if(abilityFunctions && abilityFunctions.createAbilityUpgradeOptionsNew){
            upgradeOptions.push(...abilityFunctions.createAbilityUpgradeOptionsNew(ability));
        }
    }

    return upgradeOptions;
}