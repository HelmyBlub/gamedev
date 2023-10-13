import { Character } from "../character/characterModel.js";
import { Game } from "../gameModel.js";
import { DEBUFFS_FUNCTIONS, Debuff } from "./debuff.js";

export const DEBUFF_NAME_ROOT = "ROOT";
export type DebuffRoot = Debuff & {
}

export function addDebuffRoot() {
    DEBUFFS_FUNCTIONS[DEBUFF_NAME_ROOT] = {
        applyDebuffEffect: applyDebuffEffectRoot,
        removeDebuffEffect: removeDebuffEffectRoot,
        refreshDebuffEffect: refreshDebuffEffectRoot,
    };
}

export function createDebuffRoot(
    duration: number,
    gameTime: number,
): DebuffRoot {
    return {
        name: DEBUFF_NAME_ROOT,
        removeTime: duration + gameTime,
    };
}

function applyDebuffEffectRoot(debuff: Debuff, targetCharacter: Character, game: Game) {
    targetCharacter.isRooted = true;
}

function removeDebuffEffectRoot(debuff: Debuff, targetCharacter: Character, game: Game) {
    targetCharacter.isRooted = false;
}

function refreshDebuffEffectRoot(newDebuff: Debuff, currentDebuff: Debuff, targetCharacter: Character, game: Game) {
    const newdebuffRoot = newDebuff as DebuffRoot;
    const currentDebuffRoot = currentDebuff as DebuffRoot;
    if (newdebuffRoot.removeTime! > currentDebuffRoot.removeTime!) {
        removeDebuffEffectRoot(currentDebuffRoot, targetCharacter, game);
        applyDebuffEffectRoot(newdebuffRoot, targetCharacter, game);
    }
}

