import { Character } from "../character/characterModel.js";
import { Game } from "../gameModel.js";
import { DEBUFFS_FUNCTIONS, Debuff } from "./debuff.js";

export const BUFF_NAME_IMMUNITY = "Immunity";
export type BuffImmunity = Debuff & {
}

export function addBuffImmunity() {
    DEBUFFS_FUNCTIONS[BUFF_NAME_IMMUNITY] = {
        applyDebuffEffect: applyDebuffEffect,
        removeDebuffEffect: removeDebuffEffect,
        refreshDebuffEffect: refreshDebuffEffect,
    };
}

export function createBuffImmunity(
    duration: number | undefined,
    gameTime: number | undefined,
): BuffImmunity {
    return {
        name: BUFF_NAME_IMMUNITY,
        isBuff: true,
        removeTime: (duration && gameTime) ? duration + gameTime : undefined,
    };
}

function applyDebuffEffect(debuff: Debuff, targetCharacter: Character, game: Game) {
    targetCharacter.isDamageImmune = true;
}

function removeDebuffEffect(debuff: Debuff, targetCharacter: Character, game: Game) {
    targetCharacter.isDamageImmune = false;
}

function refreshDebuffEffect(newDebuff: Debuff, currentDebuff: Debuff, targetCharacter: Character, game: Game) {
    if (newDebuff.removeTime === undefined || (currentDebuff.removeTime && newDebuff.removeTime > currentDebuff.removeTime)) {
        currentDebuff.removeTime = newDebuff.removeTime;
    }
}

