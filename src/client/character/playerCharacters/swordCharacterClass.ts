import { addAbilityToCharacter } from "../../ability/ability.js";
import { createAbilitySword } from "../../ability/abilitySword.js";
import { Game, IdCounter } from "../../gameModel.js";
import { Character } from "../characterModel.js";
import { changeToLevelingCharacter } from "./levelingCharacter.js";
import { PLAYER_CHARACTER_CLASSES_FUNCTIONS } from "./playerCharacters.js";

export function addSwordClass() {
    PLAYER_CHARACTER_CLASSES_FUNCTIONS["Sword"] = {
        changeCharacterToThisClass: changeCharacterToSwordClass
    }
}

function changeCharacterToSwordClass(
    character: Character,
    idCounter: IdCounter,
    game: Game,
) {
    changeToLevelingCharacter(character, game);
    addAbilityToCharacter(character, createAbilitySword(idCounter));
}