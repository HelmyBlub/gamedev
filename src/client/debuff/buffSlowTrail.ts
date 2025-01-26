import { ABILITIES_FUNCTIONS } from "../ability/ability.js";
import { AbilitySlowTrail, createAbilitySlowTrail } from "../ability/abilitySlowTrail.js";
import { Character } from "../character/characterModel.js";
import { Game } from "../gameModel.js";
import { DEBUFFS_FUNCTIONS, Debuff } from "./debuff.js";

export const BUFF_NAME_SLOW_TRAIL = "Slow Trail Buff";
export type BuffSlowTrail = Debuff & {
    abilitySlowTrail?: AbilitySlowTrail,
}

export function addBuffSlowTrail() {
    DEBUFFS_FUNCTIONS[BUFF_NAME_SLOW_TRAIL] = {
        applyDebuffEffect: applyBuffEffectSlowTrail,
        refreshDebuffEffect: refreshBuffEffectSlowTrail,
        tickDebuffEffect: tickBuffSlowTrail,
    };
}

export function createBuffSlowTrail(
    duration: number,
    gameTime: number,
): BuffSlowTrail {
    return {
        name: BUFF_NAME_SLOW_TRAIL,
        isBuff: true,
        removeTime: duration + gameTime,
    };
}

function applyBuffEffectSlowTrail(debuff: Debuff, targetCharacter: Character, game: Game) {
    const buffSlowTrail = debuff as BuffSlowTrail;
    buffSlowTrail.abilitySlowTrail = createAbilitySlowTrail(game.state.idCounter);
}

function refreshBuffEffectSlowTrail(newDebuff: Debuff, currentDebuff: Debuff, targetCharacter: Character, game: Game) {
    currentDebuff.removeTime = newDebuff.removeTime;
}

function tickBuffSlowTrail(debuff: Debuff, targetCharacter: Character, game: Game) {
    const buffSlowTrail = debuff as BuffSlowTrail;
    const abilityFunctions = ABILITIES_FUNCTIONS[buffSlowTrail.abilitySlowTrail!.name];
    if (abilityFunctions.tickAbility) abilityFunctions.tickAbility(targetCharacter, buffSlowTrail.abilitySlowTrail!, game);
}

