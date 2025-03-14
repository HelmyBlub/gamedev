import { ABILITIES_FUNCTIONS } from "../ability/ability.js";
import { AbilityLightningStrikes, createAbilityLightningStrikes } from "../ability/abilityLightningStrikes.js";
import { Character } from "../character/characterModel.js";
import { Game } from "../gameModel.js";
import { DEBUFFS_FUNCTIONS, Debuff, replaceCharacterDebuff } from "./debuff.js";

export const BUFF_NAME_LIGHTNING_STRIKES = "Buff Lightning Strikes";
export type BuffLightningStrikes = Debuff & {
    abilityLightningStrikes?: AbilityLightningStrikes,
    damage: number,
    spawnRadius: number,
    strikeRadius: number,
    numberStrikes: number,
    tickInterval: number,
    strikeDelay: number,
}

export function addBuffLightningStrikes() {
    DEBUFFS_FUNCTIONS[BUFF_NAME_LIGHTNING_STRIKES] = {
        applyDebuffEffect: applyBuffEffect,
        refreshDebuffEffect: refreshBuffEffect,
        tickDebuffEffect: tickBuff,
    };
}

export function createBuffLightningStrikes(
    duration: number,
    gameTime: number,
    damage: number,
    spawnRadius: number,
    strikeRadius: number,
    numberStrikes: number,
    strikeDelay: number,
    tickInterval: number,
): BuffLightningStrikes {
    return {
        name: BUFF_NAME_LIGHTNING_STRIKES,
        isBuff: true,
        removeTime: duration + gameTime,
        damage: damage,
        spawnRadius: spawnRadius,
        numberStrikes: numberStrikes,
        tickInterval: tickInterval,
        strikeRadius: strikeRadius,
        strikeDelay: strikeDelay,
    };
}

function applyBuffEffect(debuff: Debuff, targetCharacter: Character, game: Game) {
    const buff = debuff as BuffLightningStrikes;
    const ability = createAbilityLightningStrikes(game.state.idCounter, undefined, buff.damage, buff.spawnRadius, buff.numberStrikes, buff.tickInterval, buff.strikeRadius, buff.strikeDelay);
    buff.abilityLightningStrikes = ability;
}

function refreshBuffEffect(newDebuff: Debuff, currentDebuff: Debuff, targetCharacter: Character, game: Game) {
    applyBuffEffect(newDebuff, targetCharacter, game);
    replaceCharacterDebuff(currentDebuff, newDebuff, targetCharacter);
}

function tickBuff(debuff: Debuff, targetCharacter: Character, game: Game) {
    const buff = debuff as BuffLightningStrikes;
    const abilityFunctions = ABILITIES_FUNCTIONS[buff.abilityLightningStrikes!.name];
    if (abilityFunctions.tickAbility) abilityFunctions.tickAbility(targetCharacter, buff.abilityLightningStrikes!, game);
}

