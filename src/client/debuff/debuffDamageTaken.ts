import { Character } from "../character/characterModel.js";
import { Game } from "../gameModel.js";
import { DEBUFFS_FUNCTIONS, Debuff } from "./debuff.js";

export const DEBUFF_NAME_DAMAGE_TAKEN = "DAMAGE_TAKEN";
export type DebuffDamageTaken = Debuff & {
    damageTakenFactor: number,
}

export function addDebuffDamageTaken() {
    DEBUFFS_FUNCTIONS[DEBUFF_NAME_DAMAGE_TAKEN] = {
        applyDebuffEffect: applyDebuffEffect,
        removeDebuffEffect: removeDebuffEffect,
        refreshDebuffEffect: refreshDebuffEffect,
    };
}

export function createDebuffDamageTaken(
    damageTakenFactor: number,
    duration: number,
    gameTime: number,
): DebuffDamageTaken {
    return {
        name: DEBUFF_NAME_DAMAGE_TAKEN,
        removeTime: duration + gameTime,
        damageTakenFactor: damageTakenFactor
    };
}

function applyDebuffEffect(debuff: Debuff, targetCharacter: Character, game: Game) {
    const debuffDamageTaken = debuff as DebuffDamageTaken;
    targetCharacter.damageTakenModifierFactor *= debuffDamageTaken.damageTakenFactor;
}

function removeDebuffEffect(debuff: Debuff, targetCharacter: Character, game: Game) {
    const debuffDamageTaken = debuff as DebuffDamageTaken;
    targetCharacter.damageTakenModifierFactor /= debuffDamageTaken.damageTakenFactor;
}

function refreshDebuffEffect(newDebuff: Debuff, currentDebuff: Debuff, targetCharacter: Character, game: Game) {
    const newDebuffDamageTaken = newDebuff as DebuffDamageTaken;
    const currentDebuffDamageTaken = currentDebuff as DebuffDamageTaken;
    if (newDebuffDamageTaken.damageTakenFactor > currentDebuffDamageTaken.damageTakenFactor) {
        removeDebuffEffect(currentDebuffDamageTaken, targetCharacter, game);
        applyDebuffEffect(newDebuffDamageTaken, targetCharacter, game);
        currentDebuffDamageTaken.damageTakenFactor = newDebuffDamageTaken.damageTakenFactor;
    } else {
        currentDebuff.removeTime = newDebuffDamageTaken.removeTime;
    }
}

