import { Character } from "../character/characterModel.js";
import { Game } from "../gameModel.js"
import { addBuffSpeed } from "./buffSpeed.js";
import { addDebuffSlow } from "./debuffSlow.js";

export type Debuff = {
    name: string,
    removeTime: number,
}

export type DebuffFunctions = {
    applyDebuffEffect: (debuff: Debuff, targetCharacter: Character, game: Game) => void,
    removeDebuffEffect: (debuff: Debuff, targetCharacter: Character, game: Game) => void,
    refreshDebuffEffect: (newDebuff: Debuff, currentDebuff: Debuff, targetCharacter: Character, game: Game) => void,
}

export type DebuffsFunctions = {
    [key: string]: DebuffFunctions,
}

export const DEBUFFS_FUNCTIONS: DebuffsFunctions = {};

export function onDomLoadSetDebuffsFunctions() {
    addDebuffSlow();
    addBuffSpeed();
}

export function applyDebuff(debuff: Debuff, character: Character, game: Game) {
    let currentDebuff = character.debuffs.find((d) => d.name === debuff.name);
    if (currentDebuff){
        DEBUFFS_FUNCTIONS[debuff.name].refreshDebuffEffect(debuff, currentDebuff, character, game);
    } else{
        character.debuffs.push(debuff);
        DEBUFFS_FUNCTIONS[debuff.name].applyDebuffEffect(debuff, character, game);
    }
}

export function tickCharacterDebuffs(character: Character, game: Game) {
    let debuffs = character.debuffs;
    for (let i = debuffs.length - 1; i >= 0; i--) {
        let debuff = debuffs[i];
        if (debuff.removeTime <= game.state.time) {
            DEBUFFS_FUNCTIONS[debuff.name].removeDebuffEffect(debuff, character, game);
            debuffs.splice(i, 1);
        }
    }
}