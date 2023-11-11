import { Ability, AbilityOwner } from "../ability/ability.js";
import { Character } from "../character/characterModel.js";
import { autoSendMousePositionHandler } from "../game.js";
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
        refreshDebuffEffect: refreshBuffEffect,
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

export function findBallBuff(owner: AbilityOwner, ability: Ability): BuffBallPhysics | undefined {
    if (!owner.debuffs) return undefined;
    for (let buff of owner.debuffs) {
        if (buff.name === BUFF_NAME_BALL_PHYSICS) {
            const ballBuff = buff as BuffBallPhysics;
            if (ballBuff.abilityRefId === ability.id) {
                return ballBuff;
            }
        }
    }
    return undefined;
}

function refreshBuffEffect(newDebuff: Debuff, currentDebuff: Debuff, targetCharacter: Character, game: Game) {
    const newBuff = newDebuff as BuffBallPhysics;
    const currentBuff = currentDebuff as BuffBallPhysics;
    currentBuff.abilityRefId = newBuff.abilityRefId;
}

function applyBuffEffect(debuff: Debuff, targetCharacter: Character, game: Game) {
    targetCharacter.isMoveTickDisabled = true;
    autoSendMousePositionHandler(targetCharacter.id, debuff.name, true, undefined, game);
}

function removeBuffEffect(debuff: Debuff, targetCharacter: Character, game: Game) {
    targetCharacter.isMoveTickDisabled = false;
    autoSendMousePositionHandler(targetCharacter.id, debuff.name, false, undefined, game);
}
