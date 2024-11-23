import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityObjectCircle, PaintOrderAbility } from "../../../ability/ability.js";
import { applyCurse } from "../../../curse/curse.js";
import { createCurseDarkness, CURSE_DARKNESS, CurseDarkness, increaseCurseDarkness } from "../../../curse/curseDarkness.js";
import { calculateDistance, getCameraPosition, getNextId } from "../../../game.js";
import { FACTION_ENEMY, Game, IdCounter } from "../../../gameModel.js";
import { getPointPaintPosition } from "../../../gamePaint.js";
import { findNearNonBlockingPosition } from "../../../map/map.js";
import { findMapModifierById } from "../../../map/modifiers/mapModifier.js";
import { getShapeArea } from "../../../map/modifiers/mapModifierShapes.js";
import { getPlayerCharacters } from "../../character.js";
import { Character } from "../../characterModel.js";
import { createObjectCurse, deleteObjectCurse, paintAbilityObjectCurse, tickAbilityObjectCurse } from "./abilityCurse.js";
import { AreaBossEnemy } from "./areaBoss.js";
import { AreaBossEnemyDarknessSpider } from "./areaBossDarknessSpider.js";

export type AbilityCurseLightning = Ability & {
}

export type AbilityObjectCurseLightning = AbilityObjectCircle & {
    strength: number,
    tickInterval: number,
    nextTickTime?: number,
}

const ABILITY_NAME_CURSE_LIGHTNING = "Curse Lightning";

export function addAbilityCurseLightning() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_CURSE_LIGHTNING] = {
        tickAbilityObject: tickAbilityObjectCurse,
        deleteAbilityObject: deleteObjectCurse,
        createAbility: createAbilityCurseLightning,
        paintAbilityObject: paintAbilityObjectCurse,
    };
}

export function createAbilityCurseLightning(idCounter: IdCounter): AbilityCurseLightning {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_CURSE_LIGHTNING,
        passive: true,
        upgrades: {},
    }
}

export function createObjectCurseLightning(areaBoss: AreaBossEnemy, game: Game): AbilityObjectCurseLightning | undefined {
    return createObjectCurse(areaBoss, ABILITY_NAME_CURSE_LIGHTNING, game);
}
