import { characterTakeDamage } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { Game } from "../gameModel.js";
import { DEBUFFS_FUNCTIONS, Debuff } from "./debuff.js";

export const DEBUFF_NAME_DAMAGE_OVER_TIME = "Damage Over Time Debuff";
export type DebuffDamageOverTime = Debuff & {
    tickInterval: number,
    nextTickTime?: number,
    damagePerTick: number,
    damageCap: number,
}

export function addDebuffDamageOverTime() {
    DEBUFFS_FUNCTIONS[DEBUFF_NAME_DAMAGE_OVER_TIME] = {
        refreshDebuffEffect: refreshDebuffEffect,
        tickDebuffEffect: tickDebuff,
        allowMultiple: true,
    };
}

export function createDebuffDamageOverTime(
    damagePerSecond: number,
    abilityIdRef: number,
): DebuffDamageOverTime {
    const baseTickInterval = 250;
    const damagePerTick = damagePerSecond * (baseTickInterval / 1000);
    return {
        name: DEBUFF_NAME_DAMAGE_OVER_TIME,
        abilityIdRef: abilityIdRef,
        damageCap: damagePerSecond * 10,
        tickInterval: baseTickInterval,
        damagePerTick: damagePerTick,
    };
}

function refreshDebuffEffect(newDebuff: Debuff, currentDebuff: Debuff, targetCharacter: Character, game: Game) {
    const newDOT = newDebuff as DebuffDamageOverTime;
    const currentDOT = currentDebuff as DebuffDamageOverTime;
    if (newDOT.damageCap > currentDOT.damageCap) currentDOT.damageCap = newDOT.damageCap;
    currentDOT.damagePerTick += newDOT.damagePerTick;
    if (currentDOT.damagePerTick > newDOT.damageCap) currentDOT.damagePerTick = newDOT.damageCap;
}

function tickDebuff(debuff: Debuff, targetCharacter: Character, game: Game) {
    const debuffDOT = debuff as DebuffDamageOverTime;
    if (debuffDOT.nextTickTime === undefined || debuffDOT.nextTickTime <= game.state.time) {
        debuffDOT.nextTickTime = debuffDOT.tickInterval + game.state.time;
        characterTakeDamage(targetCharacter, debuffDOT.damagePerTick, game, debuffDOT.abilityIdRef, DEBUFF_NAME_DAMAGE_OVER_TIME);
    }
}

