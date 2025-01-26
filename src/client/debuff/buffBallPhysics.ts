import { Ability, AbilityOwner } from "../ability/ability.js";
import { ABILITY_NAME_LIGHTNING_BALL } from "../ability/ball/abilityLightningBall.js";
import { Character } from "../character/characterModel.js";
import { autoSendMousePositionHandler } from "../game.js";
import { FACTION_PLAYER, Game } from "../gameModel.js";
import { BUFF_NAME_IMMUNITY, createBuffImmunity } from "./buffImmunity.js";
import { DEBUFFS_FUNCTIONS, Debuff, applyDebuff, removeCharacterDebuff } from "./debuff.js";

export const BUFF_NAME_BALL_PHYSICS = "Ball Physics";
export type BuffBallPhysics = Debuff & {
    abilityIdRef: number,
    abilityRefName: string,
}

export function addBuffBallPhysics() {
    DEBUFFS_FUNCTIONS[BUFF_NAME_BALL_PHYSICS] = {
        applyDebuffEffect: applyBuffEffect,
        removeDebuffEffect: removeBuffEffect,
        refreshDebuffEffect: refreshBuffEffect,
    };
}

export function createBuffBallPhysics(
    abilityIdRef: number,
    abilityRefName: string,
): BuffBallPhysics {
    return {
        name: BUFF_NAME_BALL_PHYSICS,
        isBuff: true,
        abilityIdRef: abilityIdRef,
        abilityRefName: abilityRefName,
    };
}

export function findBallBuff(owner: AbilityOwner, ability: Ability): BuffBallPhysics | boolean {
    if (!owner.debuffs) return false;
    for (let buff of owner.debuffs) {
        if (buff.name === BUFF_NAME_BALL_PHYSICS) {
            const ballBuff = buff as BuffBallPhysics;
            if (ballBuff.abilityIdRef === ability.id) {
                return ballBuff;
            }
            return true;
        }
    }
    return false;
}

function refreshBuffEffect(newDebuff: Debuff, currentDebuff: Debuff, targetCharacter: Character, game: Game) {
    const newBuff = newDebuff as BuffBallPhysics;
    const currentBuff = currentDebuff as BuffBallPhysics;
    removeCharacterDebuff(currentBuff, targetCharacter, game);
    applyDebuff(newBuff, targetCharacter, game);
}

function applyBuffEffect(debuff: Debuff, targetCharacter: Character, game: Game) {
    const buffBall = debuff as BuffBallPhysics;
    targetCharacter.isMoveTickDisabled = true;
    targetCharacter.paint.preventDefaultCharacterPaint = true;
    autoSendMousePositionHandler(targetCharacter.id, debuff.name, true, undefined, game);
    if (buffBall.abilityRefName === ABILITY_NAME_LIGHTNING_BALL && targetCharacter.faction === FACTION_PLAYER) {
        const buffImmunity = createBuffImmunity(undefined, undefined);
        applyDebuff(buffImmunity, targetCharacter, game);
    }
}

function removeBuffEffect(debuff: Debuff, targetCharacter: Character, game: Game) {
    const buffBall = debuff as BuffBallPhysics;
    targetCharacter.isMoveTickDisabled = false;
    autoSendMousePositionHandler(targetCharacter.id, debuff.name, false, undefined, game);
    targetCharacter.paint.preventDefaultCharacterPaint = false;
    if (buffBall.abilityRefName === ABILITY_NAME_LIGHTNING_BALL) {
        const immunityBuff = targetCharacter.debuffs.find((d) => d.name === BUFF_NAME_IMMUNITY);
        if (immunityBuff) {
            removeCharacterDebuff(immunityBuff, targetCharacter, game);
        }
    }
}
