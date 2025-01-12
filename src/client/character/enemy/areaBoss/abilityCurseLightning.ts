import { ABILITIES_FUNCTIONS, Ability } from "../../../ability/ability.js";
import { CURSE_LIGHTNING } from "../../../curse/curseLightning.js";
import { getNextId } from "../../../game.js";
import { Game, IdCounter } from "../../../gameModel.js";
import { AbilityObjectCurse, createObjectCurse, deleteObjectCurse, paintAbilityObjectCurse, tickAbilityObjectCurse } from "./abilityCurse.js";
import { AreaBossEnemy } from "./areaBoss.js";

const ABILITY_NAME_CURSE_LIGHTNING = "Curse Lightning";

export function addAbilityCurseLightning() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_CURSE_LIGHTNING] = {
        tickAbilityObject: tickAbilityObjectCurse,
        deleteAbilityObject: deleteObjectCurse,
        createAbility: createAbilityCurseLightning,
        paintAbilityObject: paintAbilityObjectCurse,
    };
}

export function createAbilityCurseLightning(idCounter: IdCounter): Ability {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_CURSE_LIGHTNING,
        passive: true,
        upgrades: {},
    }
}

export function createObjectCurseLightning(areaBoss: AreaBossEnemy, game: Game): AbilityObjectCurse | undefined {
    return createObjectCurse(areaBoss, ABILITY_NAME_CURSE_LIGHTNING, CURSE_LIGHTNING, game);
}
