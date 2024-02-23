import { TAMER_PET_TRAITS_FUNCTIONS, Trait } from "./petTrait.js";
import { TAMER_PET_TRAIT_NEEDS_MORE_LOVE } from "./petTraitNeedsMoreLove.js";

export const TAMER_PET_TRAIT_HAPPY_ONE = "happy one";

export function addTamerPetTraitHappyOne() {
    TAMER_PET_TRAITS_FUNCTIONS[TAMER_PET_TRAIT_HAPPY_ONE] = {
        getMoreInfoText: getMoreInfonText,
        createTrait: createTrait,
    }
}

function createTrait(): Trait {
    return {
        name: TAMER_PET_TRAIT_HAPPY_ONE,
        opposite: TAMER_PET_TRAIT_NEEDS_MORE_LOVE,
    }
}

function getMoreInfonText(): string[] {
    const texts = [];
    texts.push("always happy");
    texts.push(`Opposite: '${TAMER_PET_TRAIT_NEEDS_MORE_LOVE}'`);
    return texts;
}