import { TAMER_PET_TRAITS_FUNCTIONS, Trait } from "./petTrait.js";
import { TAMER_PET_TRAIT_HAPPY_ONE } from "./petTraitHappyOne.js";

export const TAMER_PET_TRAIT_NEEDS_MORE_LOVE = "needs more love";

export function addTamerPetTraitNeedsMoreLove() {
    TAMER_PET_TRAITS_FUNCTIONS[TAMER_PET_TRAIT_NEEDS_MORE_LOVE] = {
        getLongExplainText: getLongExplainText,
        createTrait: createTrait,
    }
}

function createTrait(): Trait {
    return {
        name: TAMER_PET_TRAIT_NEEDS_MORE_LOVE,
        opposite: TAMER_PET_TRAIT_HAPPY_ONE,
    }
}

function getLongExplainText(): string[] {
    const texts = [];
    texts.push("gets unhappy faster");
    texts.push(`Opposite: '${TAMER_PET_TRAIT_HAPPY_ONE}'`);
    return texts;
}