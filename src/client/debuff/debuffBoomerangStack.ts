import { DEBUFFS_FUNCTIONS, Debuff } from "./debuff.js";

export const DEBUFF_NAME_BOOMERANG_STACKS = "Boomerang Stacks";
export type DebuffBoomerangStacks = Debuff & {
    stackCounter: number,
}

export function addDebuffExplodeOnDeath() {
    DEBUFFS_FUNCTIONS[DEBUFF_NAME_BOOMERANG_STACKS] = {
    };
}

export function createDebuffBoomerangStacks(
): DebuffBoomerangStacks {
    return {
        name: DEBUFF_NAME_BOOMERANG_STACKS,
        stackCounter: 0,
    };
}
