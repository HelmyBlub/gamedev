import { createAbility, findAbilityAndOwnerInCharacterById } from "../ability/ability.js";
import { ABILITY_NAME_ICE_AURA, AbilityIceAura } from "../ability/abilityIceAura.js";
import { Character } from "../character/characterModel.js";
import { getCameraPosition, getNextId } from "../game.js";
import { FACTION_PLAYER, Game, IdCounter } from "../gameModel.js";
import { getPointPaintPosition, paintTextWithOutline } from "../gamePaint.js";
import { MODIFIER_NAME_LIGHTNING } from "../map/modifiers/mapModifierLightning.js";
import { Curse, CURSES_FUNCTIONS } from "./curse.js";

export const CURSE_ICE = "Curse Ice";

export type CurseIce = Curse & {
    tickInterval: number
    lastTickTime?: number,
    iceAuraIdRef?: number,
}

export function addCurseIce() {
    CURSES_FUNCTIONS[CURSE_ICE] = {
        copy: copy,
        create: create,
        paint: paint,
        reset: reset,
        tick: tick,
        onCurseIncreased: onCurseIncreased,
        mapModifierName: MODIFIER_NAME_LIGHTNING,
    };
}

function create(idCounter: IdCounter): CurseIce {
    return {
        id: getNextId(idCounter),
        level: 1,
        type: CURSE_ICE,
        tickInterval: 1000,
        color: "blue",
    };
}

function reset(curse: Curse) {
    const ice = curse as CurseIce;
    ice.lastTickTime = undefined;
}

function copy(curse: Curse, idCounter: IdCounter): Curse {
    const copy = create(idCounter);
    copy.level = curse.level;
    return copy;
}

function onCurseIncreased(curse: Curse, curseTarget: Character, game: Game) {
    const ice = curse as CurseIce;
    if (ice.iceAuraIdRef === undefined) return;
    const abilityAndOwner = findAbilityAndOwnerInCharacterById(curseTarget, ice.iceAuraIdRef);
    if (!abilityAndOwner) return;
    const iceAura = abilityAndOwner.ability as AbilityIceAura;
    scaleAbilityIceAuraForCurseLevel(iceAura, ice.level, curseTarget.faction);
}

function scaleAbilityIceAuraForCurseLevel(iceAura: AbilityIceAura, level: number, faction: string) {
    if (faction === FACTION_PLAYER) {
        iceAura.damage = level * 100;
    } else {
        iceAura.damage = level * 10;
    }
    iceAura.slowFactor = 1 + 0.05 * level;
    const areaSize = 2000 + level * 2000;
    iceAura.radius = Math.sqrt(areaSize / Math.PI);
}

function paint(ctx: CanvasRenderingContext2D, curse: Curse, target: Character, game: Game) {
    const ice = curse as CurseIce;
    if (ice.visualizeFadeTimer !== undefined && ice.visualizeFadeTimer > game.state.time) {
        const cameraPosition = getCameraPosition(game);
        const paintPos = getPointPaintPosition(ctx, target, cameraPosition, game.UI.zoom);
        ctx.font = "30px Arial";
        paintTextWithOutline(ctx, "white", "black", `Curse ${CURSE_ICE} Level ${Math.floor(curse.level)}`, paintPos.x, paintPos.y - 30, true, 3);
    }
}

function tick(curse: Curse, target: Character, game: Game) {
    const ice = curse as CurseIce;
    if (ice.lastTickTime === undefined) ice.lastTickTime = game.state.time;
    if (ice.lastTickTime + ice.tickInterval < game.state.time) {
        if (ice.iceAuraIdRef === undefined) {
            const abilityIceAura = createAbility(ABILITY_NAME_ICE_AURA, game.state.idCounter) as AbilityIceAura;
            ice.iceAuraIdRef = abilityIceAura.id;
            target.abilities.push(abilityIceAura);
            scaleAbilityIceAuraForCurseLevel(abilityIceAura, ice.level, target.faction);
        }
        ice.lastTickTime = game.state.time;
    }
}

