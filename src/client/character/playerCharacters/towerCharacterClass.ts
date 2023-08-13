import { addAbilityToCharacter } from "../../ability/ability.js";
import { createAbilityHpRegen } from "../../ability/abilityHpRegen.js";
import { createAbilityTower } from "../../ability/abilityTower.js";
import { Game, IdCounter } from "../../gameModel.js";
import { Character } from "../characterModel.js";
import { changeToLevelingCharacter } from "./levelingCharacterModel.js";
import { PLAYER_CHARACTER_CLASSES_FUNCTIONS } from "./playerCharacters.js";

const TOWER_BUILDER = "Tower Builder";

export function addTowerClass() {
    PLAYER_CHARACTER_CLASSES_FUNCTIONS[TOWER_BUILDER] = {
        changeCharacterToThisClass: changeCharacterToTowerBuilderClass
    }
}

function changeCharacterToTowerBuilderClass(
    character: Character,
    idCounter: IdCounter,
    game: Game, 
) {
    const levelingCharacter = changeToLevelingCharacter(character, game);
    character.characterClass = TOWER_BUILDER;
    addAbilityToCharacter(levelingCharacter, createAbilityTower(idCounter, "ability1"));
    addAbilityToCharacter(levelingCharacter, createAbilityHpRegen(idCounter));
}