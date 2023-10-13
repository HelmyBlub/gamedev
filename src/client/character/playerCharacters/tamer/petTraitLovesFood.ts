import { TAMER_PET_TRAITS_FUNCTIONS, Trait } from "./petTrait.js";
import { TAMER_PET_TRAIT_WANTS_TO_STAY_SLIM } from "./petTraitWantsToStaySlim.js";

export const TAMER_PET_TRAIT_LOVES_FOOD = "loves food";

export function addTamerPetTraitLovesFood() {
    TAMER_PET_TRAITS_FUNCTIONS[TAMER_PET_TRAIT_LOVES_FOOD] = {
        getLongExplainText: getLongExplainText,
        createTrait: createTrait,
    }
}

function createTrait(): Trait {
    return {
        name: TAMER_PET_TRAIT_LOVES_FOOD,
        opposite: TAMER_PET_TRAIT_WANTS_TO_STAY_SLIM,
    }
}

function getLongExplainText(): string[] {
    const texts = [];
    texts.push("always happy if it gets food.");
    texts.push(`Opposite: '${TAMER_PET_TRAIT_WANTS_TO_STAY_SLIM}'`);
    return texts;
}