import { addAbilityToCharacter } from "../../ability/ability.js";
import { createAbilityHpRegen } from "../../ability/abilityHpRegen.js";
import { createAbilityTower } from "../../ability/abilityTower.js";
import { Game, IdCounter } from "../../gameModel.js";
import { Character } from "../characterModel.js";
import { LevelingCharacter, changeToLevelingCharacter } from "./levelingCharacterModel.js";
import { PLAYER_CHARACTER_CLASSES_FUNCTIONS } from "./playerCharacters.js";

export function addTowerClass() {
    PLAYER_CHARACTER_CLASSES_FUNCTIONS["Tower Builder"] = {
           changeCharacterToThisClass: changeCharacterToTowerBuilderClass
    }
}

function changeCharacterToTowerBuilderClass(
    character: Character,
    idCounter: IdCounter,
    game: Game, 
) {
    const levelingCharacter = changeToLevelingCharacter(character, game);
    addAbilityToCharacter(levelingCharacter, createAbilityTower(idCounter, "ability1"));
    addAbilityToCharacter(levelingCharacter, createAbilityHpRegen(idCounter));
}