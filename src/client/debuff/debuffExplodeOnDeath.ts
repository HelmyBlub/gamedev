import { createAbilityObjectExplode } from "../ability/abilityExplode.js";
import { Character } from "../character/characterModel.js";
import { Game } from "../gameModel.js";
import { DEBUFFS_FUNCTIONS, Debuff } from "./debuff.js";

export const DEBUFF_NAME_EXPLODE_ON_DEATH = "Explode on death";
export type DebuffExplodeOnDeath = Debuff & {
    damage: number,
    faction: string,
    size: number,
    abilityRefId: number,
}

export function addDebuffExplodeOnDeath() {
    DEBUFFS_FUNCTIONS[DEBUFF_NAME_EXPLODE_ON_DEATH] = {
        removeDebuffEffect: removeDebuffEffectExplodeOnDeath,
    };
}

export function createDebuffExplodeOnDeath(
    damage: number,
    faction: string,
    size: number,
    abilityRefId: number,
): DebuffExplodeOnDeath {
    return {
        name: DEBUFF_NAME_EXPLODE_ON_DEATH,
        faction: faction,
        damage: damage,
        size: size,
        abilityRefId: abilityRefId,
    };
}

function removeDebuffEffectExplodeOnDeath(debuff: Debuff, targetCharacter: Character, game: Game) {
    let debuffExplodeOnDeath = debuff as DebuffExplodeOnDeath;
    game.state.abilityObjects.push(createAbilityObjectExplode(targetCharacter, debuffExplodeOnDeath.damage, debuffExplodeOnDeath.size, debuffExplodeOnDeath.faction, debuffExplodeOnDeath.abilityRefId, game));
}
