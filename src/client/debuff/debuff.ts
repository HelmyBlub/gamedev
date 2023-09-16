import { Character } from "../character/characterModel.js";
import { Game } from "../gameModel.js"
import { addBuffSlowTrail } from "./buffSlowTrail.js";
import { addBuffSpeed } from "./buffSpeed.js";
import { addDebuffExplodeOnDeath } from "./debuffExplodeOnDeath.js";
import { addDebuffRoot } from "./debuffRoot.js";
import { addDebuffSlow } from "./debuffSlow.js";

export type Debuff = {
    name: string,
    removeTime?: number,
}

export type DebuffFunctions = {
    applyDebuffEffect?: (debuff: Debuff, targetCharacter: Character, game: Game) => void,
    removeDebuffEffect: (debuff: Debuff, targetCharacter: Character, game: Game) => void,
    refreshDebuffEffect?: (newDebuff: Debuff, currentDebuff: Debuff, targetCharacter: Character, game: Game) => void,
    tickDebuffEffect?: (debuff: Debuff, targetCharacter: Character, game: Game) => void,
}

export type DebuffsFunctions = {
    [key: string]: DebuffFunctions,
}

export const DEBUFFS_FUNCTIONS: DebuffsFunctions = {};

export function onDomLoadSetDebuffsFunctions() {
    addDebuffSlow();
    addDebuffRoot();
    addBuffSpeed();
    addBuffSlowTrail();
    addDebuffExplodeOnDeath();
}

export function applyDebuff(debuff: Debuff, character: Character, game: Game) {
    if(character.isImmune) return;
    const currentDebuff = character.debuffs.find((d) => d.name === debuff.name);
    const debuffFunctions = DEBUFFS_FUNCTIONS[debuff.name];
    if (currentDebuff) {
        if (debuffFunctions.refreshDebuffEffect) debuffFunctions.refreshDebuffEffect(debuff, currentDebuff, character, game);
    } else {
        character.debuffs.push(debuff);
        if (debuffFunctions.applyDebuffEffect) debuffFunctions.applyDebuffEffect(debuff, character, game);
    }
}

export function removeCharacterDebuffs(character: Character, game: Game){
    let debuffs = character.debuffs;
    for (let i = debuffs.length - 1; i >= 0; i--) {
        let debuff = debuffs[i];
        DEBUFFS_FUNCTIONS[debuff.name].removeDebuffEffect(debuff, character, game);
        debuffs.splice(i, 1);
    }
}

export function tickCharacterDebuffs(character: Character, game: Game) {
    let debuffs = character.debuffs;
    for (let i = debuffs.length - 1; i >= 0; i--) {
        let debuff = debuffs[i];
        if (debuff.removeTime && debuff.removeTime <= game.state.time) {
            DEBUFFS_FUNCTIONS[debuff.name].removeDebuffEffect(debuff, character, game);
            debuffs.splice(i, 1);
        } else {
            let debuffFunctions = DEBUFFS_FUNCTIONS[debuff.name];
            if (debuffFunctions.tickDebuffEffect) debuffFunctions.tickDebuffEffect(debuff, character, game);
        }
    }
}