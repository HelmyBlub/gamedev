import { ABILITY_NAME_LEASH, AbilityLeash } from "../../../ability/abilityLeash.js";
import { Game } from "../../../gameModel.js";
import { TAMER_PET_TRAITS_FUNCTIONS, Trait } from "./petTrait.js";
import { TAMER_PET_TRAIT_LONGER_LEASH } from "./petTraitLongerLeash.js";
import { TamerPetCharacter } from "./tamerPetCharacter.js";

export const TAMER_PET_TRAIT_SHORTER_LEASH = "shorter leash";
const MINUS_LENGTH = 50;

export function addTamerPetTraitShorterLeash() {
    TAMER_PET_TRAITS_FUNCTIONS[TAMER_PET_TRAIT_SHORTER_LEASH] = {
        getMoreInfoText: getMoreInfoText,
        addTrait: addTrait,
        removeTrait: removeTrait,
        createTrait: createTrait,
    }
}

function addTrait(pet: TamerPetCharacter, trait: Trait, game: Game) {
    const leash = pet.abilities.find((a) => a.name === ABILITY_NAME_LEASH) as AbilityLeash;
    if (leash) leash.leashMaxLength -= MINUS_LENGTH;
}

function removeTrait(pet: TamerPetCharacter, trait: Trait, game: Game) {
    const leash = pet.abilities.find((a) => a.name === ABILITY_NAME_LEASH) as AbilityLeash;
    if (leash) leash.leashMaxLength += MINUS_LENGTH;
}

function createTrait(): Trait {
    return {
        name: TAMER_PET_TRAIT_SHORTER_LEASH,
        opposite: TAMER_PET_TRAIT_LONGER_LEASH,
    }
}

function getMoreInfoText(): string[] {
    const texts = [];
    texts.push("decreases leash max length");
    texts.push(`Opposite: '${TAMER_PET_TRAIT_LONGER_LEASH}'`);
    return texts;
}