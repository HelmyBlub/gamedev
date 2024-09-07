import { getCharactersTouchingLine } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { applyDebuff } from "../debuff/debuff.js";
import { createDebuffSlow } from "../debuff/debuffSlow.js";
import { getCameraPosition, getNextId } from "../game.js";
import { Position, Game, IdCounter } from "../gameModel.js";
import { getPointPaintPosition } from "../gamePaint.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, PaintOrderAbility } from "./ability.js";

export type AbilitySlowTrail = Ability & {
    slowFactor: number,
    tickInterval: number,
    nextTickTime?: number,
    width: number,
    duration: number,
    lastPosition?: Position,
}

type AbilityObjectSlowTrail = AbilityObject & {
    startPosition: Position,
    endPosition: Position,
    endTime: number,
    slowFactor: number,
    tickInterval: number,
    nextTickTime?: number,
    width: number,
}

const ABILITY_NAME_SLOW_TRAIL = "Slow Trail";

export function addAbilitySlowTrail() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_SLOW_TRAIL] = {
        tickAbility: tickAbilitySlowTrail,
        tickAbilityObject: tickAbilityObjectSlowTrail,
        createAbility: createAbilitySlowTrail,
        deleteAbilityObject: deleteAbilityObjectSlowTrail,
        paintAbilityObject: paintAbilityObjectSlowTrail,
    };
}

export function createAbilitySlowTrail(
    idCounter: IdCounter,
    playerInputBinding?: string,
    slowFactor: number = 1.5
): AbilitySlowTrail {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_SLOW_TRAIL,
        width: 10,
        slowFactor: slowFactor,
        passive: true,
        tickInterval: 500,
        duration: 30000,
        upgrades: {},
    };
}

function createAbilityObjectSlowTrail(
    abilitySlowTrail: AbilitySlowTrail,
    abilityOwner: AbilityOwner,
    startPosition: Position,
    endPosition: Position,
    game: Game
): AbilityObjectSlowTrail {
    return {
        type: ABILITY_NAME_SLOW_TRAIL,
        width: abilitySlowTrail.width,
        slowFactor: abilitySlowTrail.slowFactor,
        tickInterval: 100,
        color: "white",
        damage: 0,
        faction: abilityOwner.faction,
        x: 0,
        y: 0,
        startPosition: startPosition,
        endPosition: endPosition,
        endTime: game.state.time + abilitySlowTrail.duration
    };
}

function deleteAbilityObjectSlowTrail(abilityObject: AbilityObject, game: Game): boolean {
    const abilityObjectSlowTrail = abilityObject as AbilityObjectSlowTrail;
    return abilityObjectSlowTrail.endTime <= game.state.time;
}

function paintAbilityObjectSlowTrail(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "beforeCharacterPaint") return;
    const abilityObjectSlowTrail = abilityObject as AbilityObjectSlowTrail;
    const cameraPosition = getCameraPosition(game);

    ctx.globalAlpha = 0.50;
    ctx.strokeStyle = "white";
    ctx.lineWidth = abilityObjectSlowTrail.width;
    ctx.beginPath();
    let paintPos = getPointPaintPosition(ctx, abilityObjectSlowTrail.startPosition, cameraPosition, game.UI.zoom);
    ctx.moveTo(paintPos.x, paintPos.y);
    paintPos = getPointPaintPosition(ctx, abilityObjectSlowTrail.endPosition, cameraPosition, game.UI.zoom);
    ctx.lineTo(paintPos.x, paintPos.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
}

function onHitEffect(target: Character, abilityObjectSlowTrail: AbilityObjectSlowTrail, game: Game): boolean {
    const debuffSlow = createDebuffSlow(abilityObjectSlowTrail.slowFactor, 1000, game.state.time);
    applyDebuff(debuffSlow, target, game);
    return true;
}

function tickAbilitySlowTrail(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilitySlowTrail = ability as AbilitySlowTrail;

    if (abilitySlowTrail.nextTickTime === undefined) {
        abilitySlowTrail.nextTickTime = game.state.time + abilitySlowTrail.tickInterval;
        abilitySlowTrail.lastPosition = { x: abilityOwner.x, y: abilityOwner.y };
    }
    if (abilitySlowTrail.nextTickTime <= game.state.time) {
        placeNewSlowTrail(abilityOwner, abilitySlowTrail, game);

        abilitySlowTrail.nextTickTime += abilitySlowTrail.tickInterval;
        if (abilitySlowTrail.nextTickTime <= game.state.time) {
            abilitySlowTrail.nextTickTime = game.state.time + abilitySlowTrail.tickInterval;
        }
    }
}

function tickAbilityObjectSlowTrail(abilityObject: AbilityObject, game: Game) {
    const abilityObjectSlowTrail = abilityObject as AbilityObjectSlowTrail;

    if (abilityObjectSlowTrail.nextTickTime === undefined) {
        abilityObjectSlowTrail.nextTickTime = game.state.time + abilityObjectSlowTrail.tickInterval;
    }
    if (abilityObjectSlowTrail.nextTickTime <= game.state.time) {
        const characters: Character[] = getCharactersTouchingLine(game, abilityObjectSlowTrail.startPosition, abilityObjectSlowTrail.endPosition, abilityObject.faction, abilityObjectSlowTrail.width);
        for (let char of characters) {
            onHitEffect(char, abilityObjectSlowTrail, game);
        }
    }
}

function placeNewSlowTrail(abilityOwner: AbilityOwner, abilitySlowTrail: AbilitySlowTrail, game: Game) {
    const endPosition = { x: abilityOwner.x, y: abilityOwner.y };
    const slowTrail = createAbilityObjectSlowTrail(abilitySlowTrail, abilityOwner, abilitySlowTrail.lastPosition!, endPosition, game);
    game.state.abilityObjects.push(slowTrail);
    abilitySlowTrail.lastPosition = { x: abilityOwner.x, y: abilityOwner.y };
}
