import { getPlayerCharacters, turnCharacterToPet, moveCharacterTick } from "../character.js";
import { Game, GameState } from "../../gameModel.js";
import { RandomSeed } from "../../randomNumberGenerator.js";
import { Character } from "../characterModel.js";
import { LEVELING_CHARACTER, LevelingCharacter } from "./levelingCharacterModel.js";
import { fillRandomUpgradeOptions } from "../characterUpgrades.js";

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
    fillRandomUpgradeOptions(character, randomSeed, game);
}
