import { ABILITIES_FUNCTIONS, Ability } from "../../../ability/ability.js";
import { CURSE_LIGHTNING } from "../../../curse/curseLightning.js";
import { CURSE_POISON } from "../../../curse/cursePoison.js";
import { getNextId } from "../../../game.js";
import { Game, IdCounter } from "../../../gameModel.js";
import { AbilityObjectCurse, createObjectCurse, deleteObjectCurse, paintAbilityObjectCurse, tickAbilityObjectCurse } from "./abilityCurse.js";
import { AreaBossEnemy } from "./areaBoss.js";

const ABILITY_NAME_CURSE_POISON = "Curse Poison";

export function addAbilityCursePoison() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_CURSE_POISON] = {
        tickAbilityObject: tickAbilityObjectCurse,
        deleteAbilityObject: deleteObjectCurse,
        createAbility: createAbilityCursePoison,
        paintAbilityObject: paintAbilityObjectCurse,
    };
}

export function createAbilityCursePoison(idCounter: IdCounter): Ability {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_CURSE_POISON,
        passive: true,
        upgrades: {},
    }
}

export function createObjectCursePoison(areaBoss: AreaBossEnemy, game: Game): AbilityObjectCurse | undefined {
    return createObjectCurse(areaBoss, ABILITY_NAME_CURSE_POISON, CURSE_POISON, game);
}
