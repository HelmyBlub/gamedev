import { TAMER_PET_TRAITS_FUNCTIONS, Trait } from "./petTrait.js";
import { TAMER_PET_TRAIT_LOVES_FOOD } from "./petTraitLovesFood.js";

export const TAMER_PET_TRAIT_WANTS_TO_STAY_SLIM = "wants to stay slim";

export function addTamerPetTraitWantsToStaySlim() {
    TAMER_PET_TRAITS_FUNCTIONS[TAMER_PET_TRAIT_WANTS_TO_STAY_SLIM] = {
        getMoreInfoText: getMoreInfoText,
        createTrait: createTrait,
    }
}

function createTrait(): Trait {
    return {
        name: TAMER_PET_TRAIT_WANTS_TO_STAY_SLIM,
        opposite: TAMER_PET_TRAIT_LOVES_FOOD,
    }
}

function getMoreInfoText(): string[] {
    const texts = [];
    texts.push(`unhappy if fed food`);
    texts.push(`Opposite: '${TAMER_PET_TRAIT_LOVES_FOOD}'`);
    return texts;
}