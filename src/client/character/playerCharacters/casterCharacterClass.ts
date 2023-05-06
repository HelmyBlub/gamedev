import { addAbilityToCharacter } from "../../ability/ability.js";
import { createAbilityFireCircle } from "../../ability/abilityFireCircle.js";
import { Game, IdCounter } from "../../gameModel.js";
import { Character } from "../characterModel.js";
import { changeToLevelingCharacter } from "./levelingCharacterModel.js";
import { PLAYER_CHARACTER_CLASSES_FUNCTIONS } from "./playerCharacters.js";

export function addCasterClass() {
    PLAYER_CHARACTER_CLASSES_FUNCTIONS["Caster"] = {
        changeCharacterToThisClass: changeCharacterToCasterClass
    }
}

function changeCharacterToCasterClass(
    character: Character,
    idCounter: IdCounter,
    game: Game, 
) {
    const levelingCharacter = changeToLevelingCharacter(character, game);
    addAbilityToCharacter(levelingCharacter, createAbilityFireCircle(idCounter, "ability1"));
}