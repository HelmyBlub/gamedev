import { ABILITY_NAME_LEASH, AbilityLeash } from "../../../ability/abilityLeash.js";
import { Game } from "../../../gameModel.js";
import { TAMER_PET_TRAITS_FUNCTIONS, Trait } from "./petTrait.js";
import { TAMER_PET_TRAIT_SHORTER_LEASH } from "./petTraitShorterLeash.js";
import { TamerPetCharacter } from "./tamerPetCharacter.js";

export const TAMER_PET_TRAIT_LONGER_LEASH = "longer leash";
const BONUS_LENGTH = 100;

export function addTamerPetTraitLongerLeash() {
    TAMER_PET_TRAITS_FUNCTIONS[TAMER_PET_TRAIT_LONGER_LEASH] = {
        getLongExplainText: getLongExplainText,
        addTrait: addTrait,
        removeTrait: removeTrait,
        createTrait: createTrait,
    }
}

function addTrait(pet: TamerPetCharacter, trait: Trait, game: Game) {
    const leash = pet.abilities.find((a) => a.name === ABILITY_NAME_LEASH) as AbilityLeash;
    if (leash) leash.leashMaxLength += BONUS_LENGTH;
}

function removeTrait(pet: TamerPetCharacter, trait: Trait, game: Game) {
    const leash = pet.abilities.find((a) => a.name === ABILITY_NAME_LEASH) as AbilityLeash;
    if (leash) leash.leashMaxLength -= BONUS_LENGTH;
}

function createTrait(): Trait {
    return {
        name: TAMER_PET_TRAIT_LONGER_LEASH,
        opposite: TAMER_PET_TRAIT_SHORTER_LEASH,
    }
}

function getLongExplainText(): string[] {
    const texts = [];
    texts.push("increases leash max length");
    texts.push(`Opposite: '${TAMER_PET_TRAIT_SHORTER_LEASH}'`);
    return texts;
}