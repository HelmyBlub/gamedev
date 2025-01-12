import { ABILITIES_FUNCTIONS, Ability, AbilityObjectCircle } from "../../../ability/ability.js";
import { CURSE_ICE } from "../../../curse/curseIce.js";
import { getNextId } from "../../../game.js";
import { Game, IdCounter } from "../../../gameModel.js";
import { AbilityObjectCurse, createObjectCurse, deleteObjectCurse, paintAbilityObjectCurse, tickAbilityObjectCurse } from "./abilityCurse.js";
import { AreaBossEnemy } from "./areaBoss.js";

const ABILITY_NAME_CURSE_ICE = "Curse Ice";

export function addAbilityCurseIce() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_CURSE_ICE] = {
        tickAbilityObject: tickAbilityObjectCurse,
        deleteAbilityObject: deleteObjectCurse,
        createAbility: createAbilityCurseIce,
        paintAbilityObject: paintAbilityObjectCurse,
    };
}

export function createAbilityCurseIce(idCounter: IdCounter): Ability {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_CURSE_ICE,
        passive: true,
        upgrades: {},
    }
}

export function createObjectCurseIce(areaBoss: AreaBossEnemy, game: Game): AbilityObjectCurse | undefined {
    return createObjectCurse(areaBoss, ABILITY_NAME_CURSE_ICE, CURSE_ICE, game);
}
