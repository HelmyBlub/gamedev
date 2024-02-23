import { TAMER_PET_TRAITS_FUNCTIONS, Trait } from "./petTrait.js";
import { TAMER_PET_TRAIT_EATS_LESS } from "./petTraitEatsLess.js";

export const TAMER_PET_TRAIT_VERY_HUNGRY = "very hungry";

export function addTamerPetTraitVeryHungry() {
    TAMER_PET_TRAITS_FUNCTIONS[TAMER_PET_TRAIT_VERY_HUNGRY] = {
        getMoreInfoText: getMoreInfoText,
        createTrait: createTrait,
    }
}

function createTrait(): Trait {
    return {
        name: TAMER_PET_TRAIT_VERY_HUNGRY,
        opposite: TAMER_PET_TRAIT_EATS_LESS,
    }
}

function getMoreInfoText(): string[] {
    const texts = [];
    texts.push("gets hungry faster");
    texts.push(`Opposite: '${TAMER_PET_TRAIT_EATS_LESS}'`);
    return texts;
}