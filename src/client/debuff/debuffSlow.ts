import { Character } from "../character/characterModel.js";
import { Game } from "../gameModel.js";
import { DEBUFFS_FUNCTIONS, Debuff } from "./debuff.js";

export const DEBUFF_NAME_SLOW = "SLOW";
export type DebuffSlow = Debuff & {
    slowFactor: number,
}

export function addSlowDebuff(){
    DEBUFFS_FUNCTIONS[DEBUFF_NAME_SLOW] = {
        applyDebuffEffect: applyDebuffEffectSlow,
        removeDebuffEffect: removeDebuffEffectSlow,
        refreshDebuffEffect: refreshDebuffEffectSlow,
    };
}

export function createDebuffSlow(
    slowFactor: number,
    duration: number,
    gameTime: number,
): DebuffSlow {
    return {
        name: DEBUFF_NAME_SLOW,
        removeTime: duration + gameTime,
        slowFactor: slowFactor
    };
}

function applyDebuffEffectSlow(debuff: Debuff, targetCharacter: Character, game: Game){
    let debuffSlow = debuff as DebuffSlow;
    targetCharacter.moveSpeed /= debuffSlow.slowFactor;
}

function removeDebuffEffectSlow(debuff: Debuff, targetCharacter: Character, game: Game){
    let debuffSlow = debuff as DebuffSlow;
    targetCharacter.moveSpeed *= debuffSlow.slowFactor;
}

function refreshDebuffEffectSlow(newDebuff: Debuff, currentDebuff: Debuff,targetCharacter: Character, game: Game){
    let newdebuffSlow = newDebuff as DebuffSlow;
    let currentDebuffSlow = currentDebuff as DebuffSlow;
    if(newdebuffSlow.slowFactor > currentDebuffSlow.slowFactor){
        removeDebuffEffectSlow(currentDebuffSlow, targetCharacter, game);
        applyDebuffEffectSlow(newdebuffSlow, targetCharacter, game);
        currentDebuffSlow.slowFactor = newdebuffSlow.slowFactor;
    }else{
        currentDebuff.removeTime = newdebuffSlow.removeTime;
    }
}
