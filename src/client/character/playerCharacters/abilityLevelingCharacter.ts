import { getNextId } from "../../game.js";
import { Game, GameState, IdCounter } from "../../gameModel.js";
import { GAME_IMAGES } from "../../imageLoad.js";
import { createRandomizedCharacterImageData } from "../../randomizedCharacterImage.js";
import { RandomSeed } from "../../randomNumberGenerator.js";
import { calculateCharacterMovePosition, moveCharacterTick, turnCharacterToPet } from "../character.js";
import { Character, CHARACTER_TYPE_FUNCTIONS, createCharacter } from "../characterModel.js";

export type AbilityLevelingCharacter = Character & {
}

export const ABILITY_LEVELING_CHARACTER = "abilityLevelingCharacter";

export function addAbilityLevelingCharacter(){
    CHARACTER_TYPE_FUNCTIONS[ABILITY_LEVELING_CHARACTER] = {
        tickFunction: tickAbilityLevelingCharacter,
    }
}

function tickAbilityLevelingCharacter(character: AbilityLevelingCharacter, game: Game) {
    if (character.isDead) {
        if(!character.willTurnToPetOnDeath) return;
        turnCharacterToPet(character, game);
    }
    moveCharacterTick(character, game.state.map, game.state.idCounter);
}