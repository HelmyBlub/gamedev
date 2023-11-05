import { Character } from "../character/characterModel.js";
import { Game } from "../gameModel.js";
import { DEBUFFS_FUNCTIONS, Debuff } from "./debuff.js";

export const BUFF_NAME_BALL_PHYSICS = "Ball Physics";
export type BuffBallPhysics = Debuff & {
    abilityRefId: number,
}

export function addBuffBallPhysics() {
    DEBUFFS_FUNCTIONS[BUFF_NAME_BALL_PHYSICS] = {
        applyDebuffEffect: applyBuffEffect,
        removeDebuffEffect: removeBuffEffect,
    };
}

export function createBuffBallPhysics(
    abilityRefId: number,
): BuffBallPhysics {
    return {
        name: BUFF_NAME_BALL_PHYSICS,
        abilityRefId: abilityRefId,
    };
}

function applyBuffEffect(debuff: Debuff, targetCharacter: Character, game: Game) {
    targetCharacter.isMoveTickDisabled = true;
}

function removeBuffEffect(debuff: Debuff, targetCharacter: Character, game: Game) {
    targetCharacter.isMoveTickDisabled = false;
}
