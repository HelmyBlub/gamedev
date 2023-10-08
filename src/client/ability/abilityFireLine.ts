import { characterTakeDamage, getCharactersTouchingLine } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { getCameraPosition, getNextId } from "../game.js";
import { Position, Game, IdCounter, FACTION_PLAYER } from "../gameModel.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, PaintOrderAbility } from "./ability.js";

export type AbilityFireLine = Ability & {
    tickInterval: number,
    nextTickTime?: number,
    width: number,
    duration: number,
}

type AbilityObjectFireLine = AbilityObject & {
    endPosition: Position,
    endTime: number,
    tickInterval: number,
    nextTickTime?: number,
    width: number,
}

export const ABILITY_NAME_FIRE_LINE = "Fire Line";

export function addAbilityFireLine() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_FIRE_LINE] = {
        tickAbilityObject: tickAbilityObjectFireLine,
        createAbility: createAbilityFireLine,
        deleteAbilityObject: deleteAbilityObjectFireLine,
        paintAbilityObject: paintAbilityObjectFireLine,
    };
}

export function createAbilityObjectFireLine(
    faction: string,
    startPosition: Position,
    endPosition: Position,
    damage: number,
    width: number,
    duration: number,
    tickInterval: number,
    color: string,
    abilityRefId: number | undefined,
    game: Game
): AbilityObjectFireLine {
    return {
        type: ABILITY_NAME_FIRE_LINE,
        width: width,
        tickInterval: tickInterval,
        color: color,
        damage: damage,
        faction: faction,
        x: startPosition.x,
        y: startPosition.y,
        endPosition: endPosition,
        endTime: game.state.time + duration,
        abilityRefId: abilityRefId,
    };
}

function createAbilityFireLine(
    idCounter: IdCounter,
): AbilityFireLine {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_FIRE_LINE,
        width: 10,
        passive: true,
        tickInterval: 100,
        duration: 3000,
        upgrades: {},
    };
}

function deleteAbilityObjectFireLine(abilityObject: AbilityObject, game: Game): boolean {
    const abilityObjectFireLine = abilityObject as AbilityObjectFireLine;
    return abilityObjectFireLine.endTime <= game.state.time;
}

function paintAbilityObjectFireLine(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "beforeCharacterPaint") return;
    const abilityObjectFireLine = abilityObject as AbilityObjectFireLine;
    const cameraPosition = getCameraPosition(game);
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;

    ctx.globalAlpha = 0.50;
    const color = abilityObject.faction === FACTION_PLAYER ? "red" : "black";
    ctx.strokeStyle = color;
    ctx.lineWidth = abilityObjectFireLine.width;
    ctx.beginPath();
    let paintX = Math.floor(abilityObjectFireLine.x - cameraPosition.x + centerX);
    let paintY = Math.floor(abilityObjectFireLine.y - cameraPosition.y + centerY);
    ctx.moveTo(paintX, paintY);
    paintX = Math.floor(abilityObjectFireLine.endPosition.x - cameraPosition.x + centerX);
    paintY = Math.floor(abilityObjectFireLine.endPosition.y - cameraPosition.y + centerY);
    ctx.lineTo(paintX, paintY);
    ctx.stroke();
    ctx.globalAlpha = 1;
}

function tickAbilityObjectFireLine(abilityObject: AbilityObject, game: Game) {
    const abilityObjectFireLine = abilityObject as AbilityObjectFireLine;

    if (abilityObjectFireLine.nextTickTime === undefined) {
        abilityObjectFireLine.nextTickTime = game.state.time + abilityObjectFireLine.tickInterval;
    }
    if (abilityObjectFireLine.nextTickTime <= game.state.time) {
        const characters: Character[] = getCharactersTouchingLine(game, abilityObjectFireLine, abilityObjectFireLine.endPosition, abilityObject.faction, abilityObjectFireLine.width);
        for (let char of characters) {
            characterTakeDamage(char, abilityObjectFireLine.damage, game, abilityObjectFireLine.abilityRefId);
        }
    }
}
