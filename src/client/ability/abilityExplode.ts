import { getCameraPosition, getNextId } from "../game.js";
import { FACTION_ENEMY, FACTION_PLAYER, Game, IdCounter, Position } from "../gameModel.js";
import { getPointPaintPosition } from "../gamePaint.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, PaintOrderAbility, detectAbilityObjectCircleToCharacterHit, AbilityObjectCircle } from "./ability.js";

export type AbilityExplode = Ability & {
    radius: number,
    damage: number,
}

type AbilityObjectExplode = AbilityObjectCircle & {
    damage: number,
    hasDamageDone: boolean,
    removeTime?: number,
    explodeTime: number,
    explodeDelay: number,
}

export const ABILITY_NAME_EXPLODE = "Explode";
const PAINT_FADE_TIME = 500;

export function addAbilityExplode() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_EXPLODE] = {
        tickAbilityObject: tickAbilityObjectExplode,
        createAbility: createAbilityExplode,
        deleteAbilityObject: deleteAbilityObjectExplode,
        paintAbilityObject: paintAbilityObjectExplode,
    };
}

export function createAbilityObjectExplode(
    position: Position,
    damage: number,
    radius: number,
    faction: string,
    abilityIdRef: number | undefined,
    explodeDelay: number,
    game: Game
): AbilityObjectExplode {
    return {
        type: ABILITY_NAME_EXPLODE,
        color: "red",
        damage: damage,
        faction: faction,
        x: position.x,
        y: position.y,
        hasDamageDone: false,
        radius: radius,
        abilityIdRef: abilityIdRef,
        explodeTime: explodeDelay + game.state.time,
        explodeDelay: explodeDelay,
    };
}

function createAbilityExplode(
    idCounter: IdCounter,
    playerInputBinding?: string,
    damage: number = 100,
): AbilityExplode {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_EXPLODE,
        radius: 20,
        passive: true,
        damage: damage,
        upgrades: {},
    };
}

function deleteAbilityObjectExplode(abilityObject: AbilityObject, game: Game): boolean {
    const abilityObjectExplode = abilityObject as AbilityObjectExplode;
    return abilityObjectExplode.removeTime !== undefined && abilityObjectExplode.removeTime <= game.state.time;
}

function paintAbilityObjectExplode(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "beforeCharacterPaint") return;
    const abilityObjectExplode = abilityObject as AbilityObjectExplode;
    const cameraPosition = getCameraPosition(game);
    const paintPos = getPointPaintPosition(ctx, abilityObject, cameraPosition, game.UI.zoom);
    ctx.fillStyle = abilityObject.faction === FACTION_ENEMY ? "black" : abilityObject.color;
    if (abilityObjectExplode.removeTime === undefined) {
        if (abilityObject.faction === FACTION_PLAYER) ctx.globalAlpha *= game.UI.playerGlobalAlphaMultiplier;
        ctx.strokeStyle = abilityObject.faction === FACTION_ENEMY ? "black" : abilityObject.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
            paintPos.x,
            paintPos.y,
            abilityObjectExplode.radius, 0, 2 * Math.PI
        );
        ctx.stroke();
        const fillFactor = Math.min(1, (1 - (abilityObjectExplode.explodeTime - game.state.time) / abilityObjectExplode.explodeDelay) * 0.9);
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(
            paintPos.x,
            paintPos.y,
            abilityObjectExplode.radius, - Math.PI * fillFactor + Math.PI / 2, Math.PI * fillFactor + Math.PI / 2
        );
        ctx.fill();
        ctx.globalAlpha = 1;
    } else {
        const fadeFactor = (abilityObjectExplode.removeTime - game.state.time) / PAINT_FADE_TIME;
        ctx.globalAlpha = 0.75 * fadeFactor;
        if (abilityObject.faction === FACTION_PLAYER) ctx.globalAlpha *= game.UI.playerGlobalAlphaMultiplier;
        ctx.beginPath();
        ctx.arc(
            paintPos.x,
            paintPos.y,
            abilityObjectExplode.radius, 0, 2 * Math.PI
        );
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function tickAbilityObjectExplode(abilityObject: AbilityObject, game: Game) {
    const abilityObjectExplode = abilityObject as AbilityObjectExplode;
    if (abilityObjectExplode.hasDamageDone) return;
    if (abilityObjectExplode.explodeTime <= game.state.time) {
        abilityObjectExplode.hasDamageDone = true;
        abilityObjectExplode.removeTime = game.state.time + PAINT_FADE_TIME;
        detectAbilityObjectCircleToCharacterHit(game.state.map, abilityObjectExplode, game);
    }
}
