import { TAMER_PET_TRAITS_FUNCTIONS, Trait } from "./petTrait.js";
import { TAMER_PET_TRAIT_NEVER_GETS_FAT } from "./petTraitNeverGetsFat.js";

export const TAMER_PET_TRAIT_GETS_FAT_EASILY = "gets fat easily";

export function addTamerPetTraitGetsFatEasily() {
    TAMER_PET_TRAITS_FUNCTIONS[TAMER_PET_TRAIT_GETS_FAT_EASILY] = {
        getMoreInfoText: getMoreInfoText,
        createTrait: createTrait,
    }
}

function createTrait(): Trait {
    return {
        name: TAMER_PET_TRAIT_GETS_FAT_EASILY,
        opposite: TAMER_PET_TRAIT_NEVER_GETS_FAT,
    }
}

function getMoreInfoText(): string[] {
    const texts = [];
    texts.push("gets faster fat with food");
    texts.push(`Opposite: '${TAMER_PET_TRAIT_NEVER_GETS_FAT}'`);
    return texts;
}