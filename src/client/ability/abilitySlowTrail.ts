import { getCharactersTouchingLine } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { applyDebuff } from "../debuff/debuff.js";
import { createDebuffSlow } from "../debuff/debuffSlow.js";
import { getCameraPosition, getNextId } from "../game.js";
import { Position, Game, IdCounter } from "../gameModel.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, PaintOrderAbility, AbilityUpgradeOption, detectSomethingToCharacterHit } from "./ability.js";

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
        createAbilityUpgradeOptions: createAbilitySlowTrailUpgradeOptions,
        createAbility: createAbilitySlowTrail,
        deleteAbilityObject: deleteAbilityObjectSlowTrail,
        paintAbilityObject: paintAbilityObjectSlowTrail,
        isPassive: true,
        notInheritable: true,
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

function deleteAbilityObjectSlowTrail(abilityObject: AbilityObject, game: Game): boolean{
    let abilityObjectSlowTrail = abilityObject as AbilityObjectSlowTrail;
    return abilityObjectSlowTrail.endTime <= game.state.time;
}

function paintAbilityObjectSlowTrail(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game){
    if(paintOrder !== "beforeCharacterPaint") return;
    let abilityObjectSlowTrail = abilityObject as AbilityObjectSlowTrail;
    let cameraPosition = getCameraPosition(game);
    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;

    ctx.globalAlpha = 0.50;
    ctx.strokeStyle = "white";
    ctx.lineWidth = abilityObjectSlowTrail.width;
    ctx.beginPath();
    let paintX = Math.floor(abilityObjectSlowTrail.startPosition.x - cameraPosition.x + centerX);
    let paintY = Math.floor(abilityObjectSlowTrail.startPosition.y - cameraPosition.y + centerY);
    ctx.moveTo(paintX, paintY);
    paintX = Math.floor(abilityObjectSlowTrail.endPosition.x - cameraPosition.x + centerX);
    paintY = Math.floor(abilityObjectSlowTrail.endPosition.y - cameraPosition.y + centerY);
    ctx.lineTo(paintX, paintY);
    ctx.stroke();
    ctx.globalAlpha = 1;
}

function onHitEffect(target: Character, abilityObjectSlowTrail: AbilityObjectSlowTrail, game: Game): boolean {
    let debuffSlow = createDebuffSlow(abilityObjectSlowTrail.slowFactor, 1000, game.state.time);
    applyDebuff(debuffSlow, target, game);
    return true;
}

function tickAbilitySlowTrail(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    let abilitySlowTrail = ability as AbilitySlowTrail;

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

function tickAbilityObjectSlowTrail(abilityObject: AbilityObject, game: Game){
    let abilityObjectSlowTrail = abilityObject as AbilityObjectSlowTrail;

    if (abilityObjectSlowTrail.nextTickTime === undefined) {
        abilityObjectSlowTrail.nextTickTime = game.state.time + abilityObjectSlowTrail.tickInterval;
    }
    if (abilityObjectSlowTrail.nextTickTime <= game.state.time) {
        let characters: Character[] = getCharactersTouchingLine(game, abilityObjectSlowTrail.startPosition, abilityObjectSlowTrail.endPosition);
        for (let char of characters) {
            onHitEffect(char, abilityObjectSlowTrail, game);
        }
    }
}

function createAbilitySlowTrailUpgradeOptions(): AbilityUpgradeOption[] {
    let upgradeOptions: AbilityUpgradeOption[] = [];
    return upgradeOptions;
}

function placeNewSlowTrail(abilityOwner: AbilityOwner, abilitySlowTrail: AbilitySlowTrail, game: Game) {
    let endPosition = {x: abilityOwner.x, y: abilityOwner.y};
    let slowTrail = createAbilityObjectSlowTrail(abilitySlowTrail, abilityOwner, abilitySlowTrail.lastPosition!, endPosition, game);
    game.state.abilityObjects.push(slowTrail);
    abilitySlowTrail.lastPosition = { x: abilityOwner.x, y: abilityOwner.y };
}
