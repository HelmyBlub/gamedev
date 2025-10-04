import { ABILITIES_FUNCTIONS, Ability, AbilityObject, PaintOrderAbility } from "../../../ability/ability.js";
import { getNextId, getCameraPosition, deepCopy, calculateDistance, calculateDirection } from "../../../game.js";
import { FACTION_ENEMY, FACTION_PLAYER, Game, IdCounter, Position } from "../../../gameModel.js";
import { getPointPaintPosition } from "../../../gamePaint.js";
import { moveByDirectionAndDistance } from "../../../map/map.js";
import { getCharactersTouchingLine, characterTakeDamage } from "../../character.js";
import { Character } from "../../characterModel.js";

export type AbilitySpellmakerFireLine = Ability & {
}

type AbilityObjectSpellmakerFireLine = AbilityObject & {
    fireLineJoints: Position[],
    moveToPositions: Position[],
    moveSpeed: number,
    endTime: number,
    tickInterval: number,
    nextTickTime?: number,
    width: number,
}

export const ABILITY_NAME_SPELLMAKER_FIRE_LINE = "Spellmaker Fire Line";

export function addAbilitySpellmakerFireLine() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_SPELLMAKER_FIRE_LINE] = {
        tickAbilityObject: tickAbilityObject,
        createAbility: createAbility,
        deleteAbilityObject: deleteAbilityObject,
        paintAbilityObject: paintAbilityObject,
    };
}

export function createAbilityObjectSpellmakerFireLine(
    faction: string,
    startPosition: Position,
    fireLineJoints: Position[],
    moveToPositions: Position[],
    damage: number,
    width: number,
    duration: number,
    moveSpeed: number,
    tickInterval: number,
    color: string,
    abilityIdRef: number | undefined,
    game: Game
): AbilityObjectSpellmakerFireLine {
    return {
        type: ABILITY_NAME_SPELLMAKER_FIRE_LINE,
        width: width,
        tickInterval: tickInterval,
        color: color,
        damage: damage,
        faction: faction,
        x: startPosition.x,
        y: startPosition.y,
        moveSpeed: moveSpeed,
        fireLineJoints: deepCopy(fireLineJoints),
        moveToPositions: moveToPositions,
        endTime: game.state.time + duration,
        abilityIdRef: abilityIdRef,
    };
}

function createAbility(
    idCounter: IdCounter,
): AbilitySpellmakerFireLine {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_SPELLMAKER_FIRE_LINE,
        passive: true,
        upgrades: {},
    };
}

function deleteAbilityObject(abilityObject: AbilityObject, game: Game): boolean {
    const abilityObjectFireLine = abilityObject as AbilityObjectSpellmakerFireLine;
    return abilityObjectFireLine.endTime <= game.state.time;
}

function paintAbilityObject(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "beforeCharacterPaint") return;
    const objectFireLine = abilityObject as AbilityObjectSpellmakerFireLine;
    const cameraPosition = getCameraPosition(game);

    ctx.globalAlpha = 0.50;
    let color = "red";
    if (abilityObject.faction === FACTION_ENEMY) {
        color = "black";
        ctx.globalAlpha = 0.80;
    }
    if (abilityObject.faction === FACTION_PLAYER) ctx.globalAlpha *= game.UI.playerGlobalAlphaMultiplier;

    ctx.strokeStyle = color;
    ctx.lineWidth = objectFireLine.width;
    ctx.beginPath();
    let paintPos = getPointPaintPosition(ctx, abilityObject, cameraPosition, game.UI.zoom);
    ctx.moveTo(paintPos.x, paintPos.y);
    for (let joint of objectFireLine.fireLineJoints) {
        paintPos = getPointPaintPosition(ctx, joint, cameraPosition, game.UI.zoom);
        ctx.lineTo(paintPos.x, paintPos.y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
}

function tickAbilityObject(abilityObject: AbilityObject, game: Game) {
    const objectFireLine = abilityObject as AbilityObjectSpellmakerFireLine;

    if (objectFireLine.nextTickTime === undefined) {
        objectFireLine.nextTickTime = game.state.time + objectFireLine.tickInterval;
    }
    if (objectFireLine.moveSpeed > 0 && objectFireLine.moveToPositions.length > 0) {
        const nextMoveTo = objectFireLine.moveToPositions[0];
        const direction = calculateDirection({ x: 0, y: 0 }, nextMoveTo);
        const moveXY: Position = { x: 0, y: 0 };
        moveByDirectionAndDistance(moveXY, direction, objectFireLine.moveSpeed, false);
        objectFireLine.x += moveXY.x;
        objectFireLine.y += moveXY.y;
        for (let joint of objectFireLine.fireLineJoints) {
            joint.x += moveXY.x;
            joint.y += moveXY.y;
        }
        const distance = calculateDistance(moveXY, nextMoveTo);
        if (distance <= objectFireLine.moveSpeed * 1.1) {
            objectFireLine.moveToPositions.splice(0, 1);
        } else {
            nextMoveTo.x -= moveXY.x;
            nextMoveTo.y -= moveXY.y;
        }
    }
    if (objectFireLine.nextTickTime <= game.state.time) {

        let linePartStart: Position = { x: objectFireLine.x, y: objectFireLine.y };
        for (let joint of objectFireLine.fireLineJoints) {
            const characters: Character[] = getCharactersTouchingLine(game, linePartStart, joint, abilityObject.faction, objectFireLine.width);
            for (let char of characters) {
                characterTakeDamage(char, objectFireLine.damage, game, objectFireLine.abilityIdRef, abilityObject.type, objectFireLine);
            }
            linePartStart = joint;
        }
        objectFireLine.nextTickTime += objectFireLine.tickInterval;
        if (objectFireLine.nextTickTime <= game.state.time) {
            objectFireLine.nextTickTime = game.state.time + objectFireLine.tickInterval;
        }
    }
}
