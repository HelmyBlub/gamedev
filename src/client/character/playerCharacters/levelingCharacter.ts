import { createCharacterUpgradeOptions, fillRandomUpgradeOptions, getPlayerCharacters, moveCharacterTick, turnCharacterToPet } from "../character.js";
import { Game, GameState } from "../../gameModel.js";
import { RandomSeed } from "../../randomNumberGenerator.js";
import { Character } from "../characterModel.js";
import { LEVELING_CHARACTER, LevelingCharacter } from "./levelingCharacterModel.js";
import { ABILITIES_FUNCTIONS } from "../../ability/ability.js";

export function upgradeLevelingCharacter(character: Character, upgradeOptionIndex: number, randomSeed: RandomSeed) {
    if (character.upgradeOptions.length > 0) {
        let upgradeOption = character.upgradeOptions[upgradeOptionIndex];
        if (upgradeOption.abilityName !== undefined) {
            let ability = character.abilities.find(a => a.name === upgradeOption.abilityName);
            if (ability !== undefined) {
                let upgrades = ABILITIES_FUNCTIONS[upgradeOption.abilityName].createAbiltiyUpgradeOptions(ability);
                upgrades.find((e) => e.name === upgradeOption.name)?.upgrade(ability);
            }
        } else {
            let upgrades = createCharacterUpgradeOptions();
            upgrades.find((e) => e.name === character.upgradeOptions[upgradeOptionIndex].name)?.upgrade(character);
        }
        if (character.type === LEVELING_CHARACTER) {
            const levelingCharacter = character as LevelingCharacter;
            levelingCharacter.availableSkillPoints--;
            levelingCharacter.upgradeOptions = [];
            if (levelingCharacter.availableSkillPoints > 0) {
                fillRandomUpgradeOptions(levelingCharacter, randomSeed);
            }
        }
    }
}

export function levelingCharacterXpGain(state: GameState, killedCharacter: Character) {
    let playerCharacters: LevelingCharacter[] = getPlayerCharacters(state.players) as LevelingCharacter[];
    for (let i = 0; i < playerCharacters.length; i++) {
        if (playerCharacters[i].experience !== undefined && !playerCharacters[i].isDead && !playerCharacters[i].isPet) {
            playerCharacters[i].experience += killedCharacter.experienceWorth;
            while (playerCharacters[i].experience >= playerCharacters[i].experienceForLevelUp) {
                levelingCharacterLevelUp(playerCharacters[i], state.randomSeed);
            }
        }
    }
}

export function tickLevelingCharacter(character: LevelingCharacter, game: Game) {
    if (character.isDead) {
        if (!character.willTurnToPetOnDeath) return;
        turnCharacterToPet(character, game);
    }
    moveCharacterTick(character, game.state.map, game.state.idCounter, true);
}

function levelingCharacterLevelUp(character: LevelingCharacter, randomSeed: RandomSeed) {
    character.level++;
    character.availableSkillPoints += 1;
    character.experience -= character.experienceForLevelUp;
    character.experienceForLevelUp += Math.floor(character.level / 2);
    fillRandomUpgradeOptions(character, randomSeed);
}
