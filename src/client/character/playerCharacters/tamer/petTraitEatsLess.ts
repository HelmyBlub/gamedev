import { TAMER_PET_TRAITS_FUNCTIONS, Trait } from "./petTrait.js";
import { TAMER_PET_TRAIT_VERY_HUNGRY } from "./petTraitVeryHungry.js";

export const TAMER_PET_TRAIT_EATS_LESS = "eats less";

export function addTamerPetTraitEatsLess() {
    TAMER_PET_TRAITS_FUNCTIONS[TAMER_PET_TRAIT_EATS_LESS] = {
        getLongExplainText: getLongExplainText,
        createTrait: createTrait,
    }
}

function createTrait(): Trait{
    return {
        name: TAMER_PET_TRAIT_EATS_LESS,
        opposite: TAMER_PET_TRAIT_VERY_HUNGRY,
    }
}

function getLongExplainText(): string[] {
    const texts = [];
    texts.push("needs less food");
    texts.push(`Opposite: '${TAMER_PET_TRAIT_VERY_HUNGRY}'`);
    return texts;
}