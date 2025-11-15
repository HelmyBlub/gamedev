import { AbilityObject, AbilityOwner, findAbilityOwnerById } from "../../../ability/ability.js";
import { calculateDirection, calculateDistance, findClientInfoByCharacterId } from "../../../game.js";
import { Position, Game, ClientInfo } from "../../../gameModel.js";
import { AbilitySpellmaker, SpellmakerCreateToolMoveAttachment, SpellmakerCreateToolObjectData } from "./abilitySpellmaker.js";
import { SPELLMAKER_MOVE_TOOLS_FUNCTIONS, SpellmakerCreateTool } from "./spellmakerTool.js";
import { calculateMovePosition } from "../../../map/map.js";
import { createMoreInfosPart } from "../../../moreInfo.js";

export type SpellmakerCreateToolMoveAttachmentOrbiter = SpellmakerCreateToolMoveAttachment & {
    angle: number,
    orbitRadius: number,
    directionClockwise: boolean,
    speed: number,
    startPos: Position,
}

export type SpellmakerCreateObjectMoveAttachmentOrbiter = SpellmakerCreateToolMoveAttachment & {
    angle: number,
    orbitRadius: number,
    angleTickChange: number,
}


export type SpellmakerCreateToolOrbiter = SpellmakerCreateTool & {
    workInProgress?: SpellmakerCreateToolMoveAttachmentOrbiter,
}

export const SPELLMAKER_TOOL_ORBITER = "Orbiter";

export function addSpellmakerToolOrbiter() {
    SPELLMAKER_MOVE_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_ORBITER] = {
        createTool: createTool,
        onKeyDown: onKeyDown,
        onKeyUp: onKeyUp,
        onTick: onTick,
        paint: paint,
        getMoveAttachment: getMoveAttachment,
        getMoveAttachmentNextMoveByAmount: getMoveAttachmentNextMoveByAmount,
    };
}


function createTool(ctx: CanvasRenderingContext2D): SpellmakerCreateTool {
    return {
        type: SPELLMAKER_TOOL_ORBITER,
        subType: "move",
        description: createMoreInfosPart(ctx, [
            "Move Tool: Orbiter",
            "Attaches to close object",
            "Orbits around attached object",
        ]),
    };
}

function onKeyDown(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) {
    const moveTool = tool as SpellmakerCreateToolOrbiter;
    const workInProgress: SpellmakerCreateToolMoveAttachmentOrbiter = {
        type: SPELLMAKER_TOOL_ORBITER,
        speed: 1,
        startPos: { x: castPositionRelativeToCharacter.x, y: castPositionRelativeToCharacter.y },
        angle: 0,
        directionClockwise: true,
        orbitRadius: 0,
    }
    workInProgress.orbitRadius = calculateDistance(workInProgress.startPos, { x: 0, y: 0 });
    workInProgress.angle = calculateDirection({ x: 0, y: 0 }, workInProgress.startPos);
    moveTool.workInProgress = workInProgress;
}

function onKeyUp(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game): SpellmakerCreateToolMoveAttachment | undefined {
    const moveTool = tool as SpellmakerCreateToolOrbiter;
    if (moveTool.workInProgress) {
        const orbiter = moveTool.workInProgress as SpellmakerCreateToolMoveAttachmentOrbiter;
        orbiter.speed = Math.max(1, Math.min(10, calculateDistance(orbiter.startPos, castPositionRelativeToCharacter) / 10));
        orbiter.directionClockwise = (orbiter.angle - calculateDirection({ x: 0, y: 0 }, orbiter.startPos)) < 0;
        moveTool.workInProgress = undefined;
        return orbiter;
    }
    return undefined;
}

function onTick(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game) {
    const clientInfo: ClientInfo | undefined = findClientInfoByCharacterId(abilityOwner.id, game);
    if (clientInfo) {
        const moveTool = tool as SpellmakerCreateToolOrbiter;
        if (moveTool.workInProgress) {
            const orbiter = moveTool.workInProgress;
            const relativPos: Position = {
                x: clientInfo.lastMousePosition.x - abilityOwner.x,
                y: clientInfo.lastMousePosition.y - abilityOwner.y,
            };
            orbiter.speed = Math.max(1, Math.min(10, calculateDistance(orbiter.startPos, relativPos) / 10));
            orbiter.directionClockwise = (orbiter.angle - calculateDirection({ x: 0, y: 0 }, relativPos)) < 0;
        }
    }
}

function paint(ctx: CanvasRenderingContext2D, moveAttachment: SpellmakerCreateToolMoveAttachment, ownerPaintPos: Position, ability: AbilitySpellmaker, game: Game) {
    const orbiter = moveAttachment as SpellmakerCreateToolMoveAttachmentOrbiter;
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const sign = orbiter.directionClockwise ? 1 : -1;
    const moveTo = calculateMovePosition({ x: 0, y: 0 }, orbiter.angle + (sign * orbiter.speed / 10), orbiter.orbitRadius, false);
    ctx.moveTo(ownerPaintPos.x + orbiter.startPos.x, ownerPaintPos.y + orbiter.startPos.y);
    ctx.lineTo(ownerPaintPos.x + moveTo.x, ownerPaintPos.y + moveTo.y);
    ctx.stroke();
}

function getMoveAttachment(createObject: SpellmakerCreateToolObjectData, castPosition: Position, game: Game): SpellmakerCreateObjectMoveAttachmentOrbiter {
    const orbiter = createObject.moveAttachment as SpellmakerCreateToolMoveAttachmentOrbiter;
    const angleTickChange = orbiter.speed / (orbiter.orbitRadius * Math.PI) * (orbiter.directionClockwise ? 1 : -1);
    const moveAttach: SpellmakerCreateObjectMoveAttachmentOrbiter = {
        type: SPELLMAKER_TOOL_ORBITER,
        angleTickChange: angleTickChange,
        angle: orbiter.angle,
        orbitRadius: orbiter.orbitRadius,
    };
    return moveAttach;
}

function getMoveAttachmentNextMoveByAmount(moveAttach: SpellmakerCreateToolMoveAttachment, abilityObject: AbilityObject, game: Game): Position {
    const orbiter = moveAttach as SpellmakerCreateObjectMoveAttachmentOrbiter;
    if (abilityObject.abilityIdRef === undefined) return { x: 0, y: 0 };
    const owner = findAbilityOwnerById(abilityObject.abilityIdRef, game);
    if (owner === undefined) return { x: 0, y: 0 };
    orbiter.angle += orbiter.angleTickChange;
    const newPosition: Position = calculateMovePosition(owner, orbiter.angle, orbiter.orbitRadius, false);
    return { x: newPosition.x - abilityObject.x, y: newPosition.y - abilityObject.y };
}
