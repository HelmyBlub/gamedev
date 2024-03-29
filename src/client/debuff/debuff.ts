import { Character } from "../character/characterModel.js";
import { Game } from "../gameModel.js"
import { addBuffBallPhysics } from "./buffBallPhysics.js";
import { addBuffImmunity } from "./buffImmunity.js";
import { addBuffLightningStrikes } from "./buffLightningStrikes.js";
import { addBuffSlowTrail } from "./buffSlowTrail.js";
import { addBuffSpeed } from "./buffSpeed.js";
import { addDebuffDamageTaken } from "./debuffDamageTaken.js";
import { addDebuffExplodeOnDeath } from "./debuffExplodeOnDeath.js";
import { addDebuffRoot } from "./debuffRoot.js";
import { addDebuffSlow } from "./debuffSlow.js";

export type Debuff = {
    name: string,
    removeTime?: number,
}

export type DebuffFunctions = {
    applyDebuffEffect?: (debuff: Debuff, targetCharacter: Character, game: Game) => void,
    removeDebuffEffect?: (debuff: Debuff, targetCharacter: Character, game: Game) => void,
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
    addBuffBallPhysics();
    addBuffLightningStrikes();
    addBuffImmunity();
    addDebuffDamageTaken();
}

export function applyDebuff(debuff: Debuff, character: Character, game: Game) {
    if (character.isDebuffImmune) return;
    const currentDebuff = character.debuffs.find((d) => d.name === debuff.name);
    const debuffFunctions: DebuffFunctions | undefined = DEBUFFS_FUNCTIONS[debuff.name];
    if (currentDebuff) {
        if (debuffFunctions && debuffFunctions.refreshDebuffEffect) debuffFunctions.refreshDebuffEffect(debuff, currentDebuff, character, game);
    } else {
        character.debuffs.push(debuff);
        if (debuffFunctions && debuffFunctions.applyDebuffEffect) debuffFunctions.applyDebuffEffect(debuff, character, game);
    }
}

export function removeCharacterDebuffs(character: Character, game: Game) {
    const debuffs = character.debuffs;
    for (let i = debuffs.length - 1; i >= 0; i--) {
        const debuff = debuffs[i];
        const debuffFunctions = DEBUFFS_FUNCTIONS[debuff.name];
        if (debuffFunctions && debuffFunctions.removeDebuffEffect) debuffFunctions.removeDebuffEffect(debuff, character, game);
        debuffs.splice(i, 1);
    }
}

export function removeCharacterDebuff(debuff: Debuff, character: Character, game: Game) {
    for (let i = character.debuffs.length - 1; i >= 0; i--) {
        const debuffIt = character.debuffs[i];
        const debuffFunctions = DEBUFFS_FUNCTIONS[debuff.name];
        if (debuff === debuffIt) {
            if (debuffFunctions && debuffFunctions.removeDebuffEffect) debuffFunctions.removeDebuffEffect(debuff, character, game);
            character.debuffs.splice(i, 1);
            return;
        }
    }
}

export function tickCharacterDebuffs(character: Character, game: Game) {
    const debuffs = character.debuffs;
    for (let i = debuffs.length - 1; i >= 0; i--) {
        const debuff = debuffs[i];
        const debuffFunctions = DEBUFFS_FUNCTIONS[debuff.name];
        if (debuff.removeTime && debuff.removeTime <= game.state.time) {
            if (debuffFunctions && debuffFunctions.removeDebuffEffect) debuffFunctions.removeDebuffEffect(debuff, character, game);
            debuffs.splice(i, 1);
        } else {
            if (debuffFunctions && debuffFunctions.tickDebuffEffect) debuffFunctions.tickDebuffEffect(debuff, character, game);
        }
    }
}

export function replaceCharacterDebuff(currentDebuff: Debuff, newDebuff: Debuff, character: Character) {
    for (let i = character.debuffs.length - 1; i >= 0; i--) {
        const debuff = character.debuffs[i];
        if (currentDebuff === debuff) {
            character.debuffs[i] = newDebuff;
            return;
        }
    }
}