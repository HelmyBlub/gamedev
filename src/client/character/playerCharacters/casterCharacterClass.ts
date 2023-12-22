import { addAbilityToCharacter, createAbility } from "../../ability/ability.js";
import { ABILITY_NAME_FIRE_CIRCLE } from "../../ability/abilityFireCircle.js";
import { Game, IdCounter } from "../../gameModel.js";
import { Character } from "../characterModel.js";
import { changeToLevelingCharacter } from "./levelingCharacter.js";
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
    changeToLevelingCharacter(character, game);
    addAbilityToCharacter(character, createAbility(ABILITY_NAME_FIRE_CIRCLE, idCounter, false, false, "ability1"));
}