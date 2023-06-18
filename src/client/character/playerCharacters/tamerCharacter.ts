import { addAbilityToCharacter, createAbility } from "../../ability/ability.js";
import { createAbilityHpRegen } from "../../ability/abilityHpRegen.js";
import { ABILITY_NAME_SPEED_BOOST } from "../../ability/speedBoost/abilitySpeedBoost.js";
import { ABILITY_NAME_SNIPE } from "../../ability/snipe/abilitySnipe.js";
import { Game, IdCounter } from "../../gameModel.js";
import { CHARACTER_TYPE_FUNCTIONS, Character, createCharacter } from "../characterModel.js";
import { ABILITY_LEVELING_CHARACTER, AbilityLevelingCharacter } from "./abilityLevelingCharacter.js";
import { PLAYER_CHARACTER_CLASSES_FUNCTIONS } from "./playerCharacters.js";
import { getNextId } from "../../game.js";
import { createAbilityLeash } from "../../ability/abilityLeash.js";
import { determineCharactersInDistance, determineClosestCharacter, calculateAndSetMoveDirectionToPositionWithPathing, moveCharacterTick } from "../character.js";
import { ABILITY_NAME_MELEE, createAbilityMelee } from "../../ability/abilityMelee.js";
import { PetNoTargetBehavior, PetTargetBehavior, TAMER_PET_CHARACTER, TamerPetCharacter, createTamerPetCharacter, tickTamerPetCharacter } from "./tamerPetCharacter.js";
import { ABILITY_NAME_FEED_PET } from "../../ability/abilityFeedPet.js";

export function addTamerClass() {
    PLAYER_CHARACTER_CLASSES_FUNCTIONS["Tamer(Work in Progress)"] = {
        changeCharacterToThisClass: changeCharacterToTamerClass
    }
    CHARACTER_TYPE_FUNCTIONS[TAMER_PET_CHARACTER] = {
        tickPetFunction: tickTamerPetCharacter
    }
}

function changeCharacterToTamerClass(
    character: Character,
    idCounter: IdCounter,
    game: Game,
) {
    addAbilityToCharacter(character, createAbilityHpRegen(idCounter));
    addAbilityToCharacter(character, createAbility(ABILITY_NAME_FEED_PET, idCounter, false, false, "ability1"));
    addPetToTamer(character, "blue", game);
    addPetToTamer(character, "green", game);
    addPetToTamer(character, "black", game);
}

function addPetToTamer(character: Character, color: string, game: Game) {
    if (character.pets === undefined) character.pets = [];
    const pet: TamerPetCharacter = createTamerPetCharacter(character, color, game);
    //pet.isPet = true;
    pet.abilities.push(createAbilityLeash(game.state.idCounter, undefined, 100, character.id));
    pet.abilities.push(createAbility(ABILITY_NAME_MELEE, game.state.idCounter, true));

    character.pets.push(pet);
}

