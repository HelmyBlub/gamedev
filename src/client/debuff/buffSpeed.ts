import { Character } from "../character/characterModel.js";
import { Game } from "../gameModel.js";
import { DEBUFFS_FUNCTIONS, Debuff } from "./debuff.js";

export const BUFF_NAME_SPEED = "SPEED";
export type BuffSpeed = Debuff & {
    speedFactor: number,
}

export function addBuffSpeed() {
    DEBUFFS_FUNCTIONS[BUFF_NAME_SPEED] = {
        applyDebuffEffect: applyBuffEffectSpeed,
        removeDebuffEffect: removeBuffEffectSpeed,
        refreshDebuffEffect: refreshBuffEffectSpeed,
    };
}

export function createBuffSpeed(
    speedFactor: number,
    duration: number,
    gameTime: number,
): BuffSpeed {
    return {
        name: BUFF_NAME_SPEED,
        removeTime: duration + gameTime,
        speedFactor: speedFactor
    };
}

function applyBuffEffectSpeed(debuff: Debuff, targetCharacter: Character, game: Game) {
    const buffSpeed = debuff as BuffSpeed;
    targetCharacter.moveSpeedFactor *= buffSpeed.speedFactor;
}

function removeBuffEffectSpeed(debuff: Debuff, targetCharacter: Character, game: Game) {
    const buffSpeed = debuff as BuffSpeed;
    targetCharacter.moveSpeedFactor /= buffSpeed.speedFactor;
}

function refreshBuffEffectSpeed(newDebuff: Debuff, currentDebuff: Debuff, targetCharacter: Character, game: Game) {
    const newBuffSpeed = newDebuff as BuffSpeed;
    const currentBuffSpeed = currentDebuff as BuffSpeed;
    if (newBuffSpeed.speedFactor > currentBuffSpeed.speedFactor) {
        removeBuffEffectSpeed(currentBuffSpeed, targetCharacter, game);
        applyBuffEffectSpeed(newBuffSpeed, targetCharacter, game);
    } else {
        currentDebuff.removeTime = newBuffSpeed.removeTime;
    }
}

