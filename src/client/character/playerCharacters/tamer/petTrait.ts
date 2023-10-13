import { Game } from "../../../gameModel.js";
import { addTamerPetTraitEatsLess } from "./petTraitEatsLess.js";
import { addTamerPetTraitGetsFatEasily } from "./petTraitGetFatEasily.js";
import { addTamerPetTraitHappyOne } from "./petTraitHappyOne.js";
import { addTamerPetTraitLongerLeash } from "./petTraitLongerLeash.js";
import { addTamerPetTraitLovesFood } from "./petTraitLovesFood.js";
import { addTamerPetTraitNeedsMoreLove } from "./petTraitNeedsMoreLove.js";
import { addTamerPetTraitNeverGetsFat } from "./petTraitNeverGetsFat.js";
import { addTamerPetTraitShorterLeash } from "./petTraitShorterLeash.js";
import { addTamerPetTraitVeryHungry } from "./petTraitVeryHungry.js";
import { addTamerPetTraitWantsToStaySlim } from "./petTraitWantsToStaySlim.js";
import { TamerPetCharacter } from "./tamerPetCharacter.js";

export type Trait = {
    name: string,
    opposite?: string,
}

export type TamerPetTraitFunctions = {
    addTrait?: (pet: TamerPetCharacter, trait: Trait, game: Game) => void,
    createTrait: () => Trait,
    removeTrait?: (pet: TamerPetCharacter, trait: Trait, game: Game) => void,
    getLongExplainText?: () => string[],
}

export type TamerPetTraitsFunctions = {
    [key: string]: TamerPetTraitFunctions,
}

export const TAMER_PET_TRAITS_FUNCTIONS: TamerPetTraitsFunctions = {};

export function addTamerPetTraits() {
    addTamerPetTraitEatsLess();
    addTamerPetTraitGetsFatEasily();
    addTamerPetTraitHappyOne();
    addTamerPetTraitLongerLeash();
    addTamerPetTraitLovesFood();
    addTamerPetTraitNeedsMoreLove();
    addTamerPetTraitNeverGetsFat();
    addTamerPetTraitShorterLeash();
    addTamerPetTraitVeryHungry();
    addTamerPetTraitWantsToStaySlim();
}

export function tamerPetIncludesTrait(traitName: string, pet: TamerPetCharacter): boolean {
    return pet.traits.find((t) => t.name === traitName) ? true : false;
}

export function getAvailableTamerPetTraits(pet: TamerPetCharacter): string[] {
    const availableTrais: string[] = [];
    const keys = Object.keys(TAMER_PET_TRAITS_FUNCTIONS);

    for (let trait of keys) {
        if (!tamerPetIncludesTrait(trait, pet)) {
            availableTrais.push(trait);
        }
    }

    return availableTrais;
}

export function addTraitToTamerPet(pet: TamerPetCharacter, traitName: string, game: Game) {
    if (!tamerPetIncludesTrait(traitName, pet)) {
        const functions = TAMER_PET_TRAITS_FUNCTIONS[traitName];
        const trait = functions.createTrait();
        if (functions.addTrait) {
            functions.addTrait(pet, trait, game);
        }
        pet.traits.push(trait);
        if (trait.opposite) {
            const oppositeIndex = pet.traits.findIndex((t) => t.name === trait.opposite);
            if (oppositeIndex > -1) {
                const oppositefunctions = TAMER_PET_TRAITS_FUNCTIONS[trait.opposite];
                if (oppositefunctions.removeTrait) {
                    oppositefunctions.removeTrait(pet, pet.traits[oppositeIndex], game);
                }
                pet.traits.splice(oppositeIndex, 1);
            }
        }
    }
}

export function getLongExplainTextForTamerPetTrait(traitName: string): string[] | undefined {
    const functions = TAMER_PET_TRAITS_FUNCTIONS[traitName];
    if (functions.getLongExplainText) {
        return functions.getLongExplainText();
    }
    return undefined;
}
