import { TAMER_PET_TRAITS_FUNCTIONS, Trait } from "./petTrait.js";
import { TAMER_PET_TRAIT_GETS_FAT_EASILY } from "./petTraitGetFatEasily.js";

export const TAMER_PET_TRAIT_NEVER_GETS_FAT = "never gets fat";

export function addTamerPetTraitNeverGetsFat() {
    TAMER_PET_TRAITS_FUNCTIONS[TAMER_PET_TRAIT_NEVER_GETS_FAT] = {
        getLongExplainText: getLongExplainText,
        createTrait: createTrait,
    }
}

function createTrait(): Trait{
    return {
        name: TAMER_PET_TRAIT_NEVER_GETS_FAT,
        opposite: TAMER_PET_TRAIT_GETS_FAT_EASILY,
    }
}

function getLongExplainText(): string[] {
    const texts = [];
    texts.push("can not get fat");
    texts.push(`Opposite: '${TAMER_PET_TRAIT_GETS_FAT_EASILY}'`);
    return texts;
}