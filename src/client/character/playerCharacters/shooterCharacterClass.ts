import { addAbilityToCharacter } from "../../ability/ability.js";
import { createAbilityShoot } from "../../ability/abilityShoot.js";
import { Game, IdCounter } from "../../gameModel.js";
import { Character } from "../characterModel.js";
import { changeToLevelingCharacter } from "./levelingCharacterModel.js";
import { PLAYER_CHARACTER_CLASSES_FUNCTIONS } from "./playerCharacters.js";

export function addShooterClass() {
    PLAYER_CHARACTER_CLASSES_FUNCTIONS["Shooter"] = {
        changeCharacterToThisClass: changeCharacterToShooterClass,
    }
}

function changeCharacterToShooterClass(
    character: Character,
    idCounter: IdCounter,
    game: Game, 
) {
    const levelingCharacter = changeToLevelingCharacter(character, game);
    addAbilityToCharacter(levelingCharacter, createAbilityShoot(idCounter));
}