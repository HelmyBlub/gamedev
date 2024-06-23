import { Character } from "../character/characterModel.js";
import { Game } from "../gameModel.js";
import { DEBUFFS_FUNCTIONS, Debuff } from "./debuff.js";

export const DEBUFF_NAME_DAMAGE_TAKEN = "DAMAGE_TAKEN";
export type DebuffDamageTaken = Debuff & {
    damageTakenFactor: number,
    stackReduceTime?: number,
    stacks?: number,
    duration?: number,
}

export function addDebuffDamageTaken() {
    DEBUFFS_FUNCTIONS[DEBUFF_NAME_DAMAGE_TAKEN] = {
        applyDebuffEffect: applyDebuffEffect,
        removeDebuffEffect: removeDebuffEffect,
        tickDebuffEffect: tickDebuffEffect,
        refreshDebuffEffect: refreshDebuffEffect,
    };
}

export function createDebuffDamageTaken(
    damageTakenFactor: number,
    duration: number,
    gameTime: number,
    stacking: boolean = false,
    abilityIdRef: number | undefined = undefined,
): DebuffDamageTaken {
    const debuff: DebuffDamageTaken = {
        name: DEBUFF_NAME_DAMAGE_TAKEN,
        removeTime: duration + gameTime,
        damageTakenFactor: damageTakenFactor,
        abilityIdRef: abilityIdRef,
    }
    if (stacking) {
        debuff.stacks = 1;
        debuff.duration = duration;
    }
    return debuff;
}

function tickDebuffEffect(debuff: Debuff, targetCharacter: Character, game: Game) {
    const debuffDamageTaken = debuff as DebuffDamageTaken;
    if (debuffDamageTaken.stacks === undefined) return;
    if (debuffDamageTaken.stacks > 1) {
        if (debuffDamageTaken.removeTime) delete debuffDamageTaken.removeTime;
        if (debuffDamageTaken.stackReduceTime === undefined && debuffDamageTaken.duration !== undefined) {
            debuffDamageTaken.stackReduceTime = game.state.time + debuffDamageTaken.duration;
        }
        if (debuffDamageTaken.stackReduceTime !== undefined && debuffDamageTaken.stackReduceTime <= game.state.time) {
            removeDebuffEffect(debuffDamageTaken, targetCharacter, game);
            debuffDamageTaken.stacks--;
            applyDebuffEffect(debuffDamageTaken, targetCharacter, game);
            delete debuffDamageTaken.stackReduceTime;
        }
    } else {
        if (debuffDamageTaken.removeTime === undefined && debuffDamageTaken.duration !== undefined) {
            debuffDamageTaken.removeTime = game.state.time + debuffDamageTaken.duration;
        }
    }
}

function applyDebuffEffect(debuff: Debuff, targetCharacter: Character, game: Game) {
    const debuffDamageTaken = debuff as DebuffDamageTaken;
    let factor = debuffDamageTaken.damageTakenFactor;
    if (debuffDamageTaken.stacks !== undefined) {
        factor = Math.pow(factor, debuffDamageTaken.stacks);
    }
    targetCharacter.damageTakenModifierFactor *= factor;
}

function removeDebuffEffect(debuff: Debuff, targetCharacter: Character, game: Game) {
    const debuffDamageTaken = debuff as DebuffDamageTaken;
    let factor = debuffDamageTaken.damageTakenFactor;
    if (debuffDamageTaken.stacks !== undefined) {
        factor = Math.pow(factor, debuffDamageTaken.stacks);
    }
    targetCharacter.damageTakenModifierFactor /= factor;
}

function refreshDebuffEffect(newDebuff: Debuff, currentDebuff: Debuff, targetCharacter: Character, game: Game) {
    const newDebuffDamageTaken = newDebuff as DebuffDamageTaken;
    const currentDebuffDamageTaken = currentDebuff as DebuffDamageTaken;
    if (newDebuffDamageTaken.damageTakenFactor > currentDebuffDamageTaken.damageTakenFactor) {
        removeDebuffEffect(currentDebuffDamageTaken, targetCharacter, game);
        applyDebuffEffect(newDebuffDamageTaken, targetCharacter, game);
        currentDebuffDamageTaken.damageTakenFactor = newDebuffDamageTaken.damageTakenFactor;
    } else {
        if (newDebuffDamageTaken.stacks !== undefined && currentDebuffDamageTaken.stacks !== undefined) {
            removeDebuffEffect(currentDebuffDamageTaken, targetCharacter, game);
            currentDebuffDamageTaken.stacks++;
            applyDebuffEffect(currentDebuffDamageTaken, targetCharacter, game);
        }
        currentDebuff.removeTime = newDebuffDamageTaken.removeTime;
    }
}

