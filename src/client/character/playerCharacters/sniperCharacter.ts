import { addAbilityToCharacter, createAbility } from "../../ability/ability.js";
import { createAbilityHpRegen } from "../../ability/abilityHpRegen.js";
import { ABILITY_NAME_SPEED_BOOST } from "../../ability/speedBoost/abilitySpeedBoost.js";
import { ABILITY_NAME_SNIPE } from "../../ability/snipe/abilitySnipe.js";
import { Game, IdCounter } from "../../gameModel.js";
import { Character } from "../characterModel.js";
import { ABILITY_LEVELING_CHARACTER, AbilityLevelingCharacter } from "./abilityLevelingCharacter.js";
import { PLAYER_CHARACTER_CLASSES_FUNCTIONS } from "./playerCharacters.js";

export const CHARACTER_CLASS_SNIPER_NAME = "Sniper";

export function addSniperClass() {
    PLAYER_CHARACTER_CLASSES_FUNCTIONS[CHARACTER_CLASS_SNIPER_NAME] = {
        changeCharacterToThisClass: changeCharacterToSniperClass
    }
}

function changeCharacterToSniperClass(
    character: Character,
    idCounter: IdCounter,
    game: Game,
) {
    character.type = ABILITY_LEVELING_CHARACTER;
    character.characterClass = CHARACTER_CLASS_SNIPER_NAME;
    addAbilityToCharacter(character, createAbility(ABILITY_NAME_SNIPE, idCounter, true, true, "ability1"));
    addAbilityToCharacter(character, createAbilityHpRegen(idCounter));
    addAbilityToCharacter(character, createAbility(ABILITY_NAME_SPEED_BOOST, idCounter, true, true, "ability2"));
}
