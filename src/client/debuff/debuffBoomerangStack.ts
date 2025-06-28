import { Character } from "../character/characterModel.js";
import { Game } from "../gameModel.js";
import { DEBUFFS_FUNCTIONS, Debuff } from "./debuff.js";

export const DEBUFF_NAME_BOOMERANG_STACKS = "Boomerang Stacks";
export type DebuffBoomerangStacks = Debuff & {
    stackCounter: number,
}

export function addDebuffBoomerangStack() {
    DEBUFFS_FUNCTIONS[DEBUFF_NAME_BOOMERANG_STACKS] = {
        refreshDebuffEffect: refreshDebuffEffect,
        allowMultiple: false,
    };
}

export function createDebuffBoomerangStacks(
    stacks: number
): DebuffBoomerangStacks {
    return {
        name: DEBUFF_NAME_BOOMERANG_STACKS,
        stackCounter: stacks,
    };
}

function refreshDebuffEffect(newDebuff: Debuff, currentDebuff: Debuff, targetCharacter: Character, game: Game) {
    const newStacks = newDebuff as DebuffBoomerangStacks;
    const currentStacks = currentDebuff as DebuffBoomerangStacks;
    currentStacks.stackCounter += newStacks.stackCounter;;
}
