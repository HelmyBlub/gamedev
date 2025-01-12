import { ABILITIES_FUNCTIONS, Ability } from "../../../ability/ability.js";
import { CURSE_DARKNESS } from "../../../curse/curseDarkness.js";
import { getNextId } from "../../../game.js";
import { Game, IdCounter } from "../../../gameModel.js";
import { AbilityObjectCurse, createObjectCurse, deleteObjectCurse, paintAbilityObjectCurse, tickAbilityObjectCurse } from "./abilityCurse.js";
import { AreaBossEnemy } from "./areaBoss.js";

const ABILITY_NAME_CURSE_DARKNESS = "Curse Darkness";

export function addAbilityCurseDarkness() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_CURSE_DARKNESS] = {
        tickAbilityObject: tickAbilityObjectCurse,
        deleteAbilityObject: deleteObjectCurse,
        createAbility: createAbilityCurseDarkness,
        paintAbilityObject: paintAbilityObjectCurse,
    };
}

export function createAbilityCurseDarkness(idCounter: IdCounter): Ability {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_CURSE_DARKNESS,
        passive: true,
        upgrades: {},
    }
}

export function createObjectCurseDarkness(areaBoss: AreaBossEnemy, game: Game): AbilityObjectCurse | undefined {
    return createObjectCurse(areaBoss, ABILITY_NAME_CURSE_DARKNESS, CURSE_DARKNESS, game);
}
