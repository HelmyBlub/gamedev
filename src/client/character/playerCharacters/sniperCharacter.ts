import { addAbilityToCharacter, createAbility } from "../../ability/ability.js";
import { createAbilityHpRegen } from "../../ability/abilityHpRegen.js";
import { ABILITY_NAME_MOVEMENTSPEED } from "../../ability/movementSpeed/abilityMovementSpeed.js";
import { createAbilitySlowTrail } from "../../ability/abilitySlowTrail.js";
import { ABILITY_NAME_SNIPE } from "../../ability/snipe/abilitySnipe.js";
import { Game, IdCounter } from "../../gameModel.js";
import { Character } from "../characterModel.js";
import { ABILITY_LEVELING_CHARACTER, AbilityLevelingCharacter } from "./abilityLevelingCharacter.js";
import { PLAYER_CHARACTER_CLASSES_FUNCTIONS } from "./playerCharacters.js";

export function addSniperClass() {
    PLAYER_CHARACTER_CLASSES_FUNCTIONS["Sniper"] = {
        changeCharacterToThisClass: changeCharacterToSniperClass
    }
}

function changeCharacterToSniperClass(
    character: Character,
    idCounter: IdCounter,
    game: Game,
) {
    character.type = ABILITY_LEVELING_CHARACTER;
    addAbilityToCharacter(character, createAbility(ABILITY_NAME_SNIPE, idCounter, true, true, "ability1"));
    addAbilityToCharacter(character, createAbilityHpRegen(idCounter));
    addAbilityToCharacter(character, createAbility(ABILITY_NAME_MOVEMENTSPEED, idCounter, true, true, "ability2"));
}
