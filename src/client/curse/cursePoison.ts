import { createAbility, findAbilityAndOwnerInCharacterById } from "../ability/ability.js";
import { ABILITY_NAME_POISON_TILE, AbilityPoisonTile } from "../ability/abilityPoisonTile.js";
import { Character } from "../character/characterModel.js";
import { BUFF_NAME_POISON_TILE_IMMUNITY, createBuffPoisonTileImmunity } from "../debuff/buffImmunityPoisonTile.js";
import { applyDebuff, removeCharacterDebuff } from "../debuff/debuff.js";
import { getNextId } from "../game.js";
import { Game, IdCounter } from "../gameModel.js";
import { MODIFIER_NAME_POISON } from "../map/modifiers/mapModifierPoison.js";
import { Curse, CURSES_FUNCTIONS } from "./curse.js";

export const CURSE_POISON = "Curse Poison";

export type CursePoison = Curse & {
    poisonAbilityIdRef?: number,
}

export function addCursePoison() {
    CURSES_FUNCTIONS[CURSE_POISON] = {
        create: create,
        onCurseIncreased: onCurseIncreased,
        remove: remove,
        reset: reset,
        tick: tick,
        mapModifierName: MODIFIER_NAME_POISON,
    };
}

function create(idCounter: IdCounter): CursePoison {
    return {
        id: getNextId(idCounter),
        level: 1,
        type: CURSE_POISON,
        color: "purple",
    };
}

function remove(curse: Curse, target: Character, game: Game) {
    let posion = curse as CursePoison;
    if (posion.poisonAbilityIdRef) {
        const poisonIndex = target.abilities.findIndex(a => a.id === posion.poisonAbilityIdRef);
        target.abilities.splice(poisonIndex, 1);
    }
    if (posion.cleansed) {
        const immunityBuff = target.debuffs.find(b => b.name === BUFF_NAME_POISON_TILE_IMMUNITY);
        if (immunityBuff) {
            removeCharacterDebuff(immunityBuff, target, game);
        }
    }
}

function reset(curse: Curse) {
    const poison = curse as CursePoison;
}

function onCurseIncreased(curse: Curse, curseTarget: Character, game: Game) {
    const poison = curse as CursePoison;
    if (poison.poisonAbilityIdRef === undefined) return;
    const abilityAndOwner = findAbilityAndOwnerInCharacterById(curseTarget, poison.poisonAbilityIdRef);
    if (!abilityAndOwner) return;
    const poisonAbility = abilityAndOwner.ability as AbilityPoisonTile;
    scaleAbilityPoisonForCurseLevel(poisonAbility, poison.level, poison);
}

function scaleAbilityPoisonForCurseLevel(poisonTile: AbilityPoisonTile, level: number, curse: CursePoison) {
    const areaSize = 10 + Math.pow(level, 1.5) * 200;
    poisonTile.radius = Math.sqrt(areaSize / Math.PI);
}

function tick(curse: Curse, target: Character, game: Game) {
    const poison = curse as CursePoison;
    if (poison.poisonAbilityIdRef === undefined) {
        const abilityPoisonTile = createAbility(ABILITY_NAME_POISON_TILE, game.state.idCounter) as AbilityPoisonTile;
        poison.poisonAbilityIdRef = abilityPoisonTile.id;
        target.abilities.push(abilityPoisonTile);
        scaleAbilityPoisonForCurseLevel(abilityPoisonTile, poison.level, poison);
        if (poison.cleansed) {
            const poisonImmunity = createBuffPoisonTileImmunity();
            applyDebuff(poisonImmunity, target, game);
        }
    }
}
