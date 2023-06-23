import { createCharacterUpgradeOptions, fillRandomUpgradeOptions, getPlayerCharacters, calculateCharacterMovePosition, turnCharacterToPet, moveCharacterTick } from "../character.js";
import { Game, GameState } from "../../gameModel.js";
import { RandomSeed } from "../../randomNumberGenerator.js";
import { Character } from "../characterModel.js";
import { LEVELING_CHARACTER, LevelingCharacter } from "./levelingCharacterModel.js";
import { PathingCache } from "../pathing.js";

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

export function tickLevelingCharacter(character: Character, game: Game) {
    const levelingCharacter = character as LevelingCharacter;
    if (character.isDead) {
        if (!character.willTurnToPetOnDeath) return;
        turnCharacterToPet(character, game);
    }
    moveCharacterTick(character, game.state.map, game.state.idCounter);
}

function levelingCharacterLevelUp(character: LevelingCharacter, randomSeed: RandomSeed) {
    character.level++;
    character.availableSkillPoints += 1;
    character.experience -= character.experienceForLevelUp;
    character.experienceForLevelUp += Math.floor(character.level / 2);
    fillRandomUpgradeOptions(character, randomSeed);
}
