import { create } from "domain";
import { AbilityOwner } from "../../../ability/ability.js";
import { calculateDistance, calculateDistancePointToLine, findClientInfoByCharacterId } from "../../../game.js";
import { Position, Game, ClientInfo } from "../../../gameModel.js";
import { AbilitySpellmaker, SpellmakerCreateToolMoveAttachment, SpellmakerCreateToolObjectData } from "./abilitySpellmaker.js";
import { SPELLMAKER_TOOLS_FUNCTIONS, SpellmakerCreateTool } from "./spellmakerTool.js";

export type SpellmakerCreateToolMoveAttachmentLine = SpellmakerCreateToolMoveAttachment & {
    moveTo: Position[],
}

export type SpellmakerCreateToolMove = SpellmakerCreateTool & {
    startPosition?: Position,
    attachToIndex?: number,
}

export const SPELLMAKER_TOOL_MOVE = "Move";

export function addSpellmakerToolMove() {
    SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_MOVE] = {
        onKeyDown: onKeyDown,
        onKeyUp: onKeyUp,
        onTick: onTick,
        paint: paint,
        getMoveAttachment: getMoveAttachment,
    };
}


function onKeyDown(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) {
    console.log("down");
    const moveTool = tool as SpellmakerCreateToolMove;
    let closestDistance = 0;
    let closestIndex: number | undefined = undefined;
    for (let objectIndex = 0; objectIndex < ability.createdObjects.length; objectIndex++) {
        const object = ability.createdObjects[objectIndex];
        const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[object.type];
        if (toolFunctions.calculateDistance) {
            const tempDistance = toolFunctions.calculateDistance(castPositionRelativeToCharacter, object);
            if (closestIndex == undefined || tempDistance < closestDistance) {
                closestDistance = tempDistance;
                closestIndex = objectIndex;
            }
        }
    }
    if (closestIndex != undefined) {
        moveTool.attachToIndex = closestIndex;
        moveTool.startPosition = castPositionRelativeToCharacter;
        console.log("index");
    } else {
        moveTool.attachToIndex = undefined;
        moveTool.startPosition = undefined;
    }
}

function onKeyUp(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) {
    console.log("up");
    const moveTool = tool as SpellmakerCreateToolMove;
    if (moveTool.startPosition && moveTool.attachToIndex != undefined) {
        const createdObject = ability.createdObjects[moveTool.attachToIndex];
        if (!createdObject.moveAttachment) {
            const moveAttach: SpellmakerCreateToolMoveAttachmentLine = {
                type: SPELLMAKER_TOOL_MOVE,
                moveTo: [moveTool.startPosition],
            }
            createdObject.moveAttachment = moveAttach;
        }
        const moveTo = createdObject.moveAttachment as SpellmakerCreateToolMoveAttachmentLine;
        console.log("attached");
        moveTo.moveTo.push(castPositionRelativeToCharacter);
    }
}

function onTick(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game) {
    const clientInfo: ClientInfo | undefined = findClientInfoByCharacterId(abilityOwner.id, game);
    if (clientInfo) {
        const moveTool = tool as SpellmakerCreateToolMove;
        if (moveTool.startPosition && moveTool.attachToIndex != undefined) {
            console.log("tick");
            const createdObject = ability.createdObjects[moveTool.attachToIndex];
            if (!createdObject.moveAttachment) {
                const moveAttach: SpellmakerCreateToolMoveAttachmentLine = {
                    type: SPELLMAKER_TOOL_MOVE,
                    moveTo: [moveTool.startPosition],
                }
                createdObject.moveAttachment = moveAttach;
            }
            const end: Position = {
                x: clientInfo.lastMousePosition.x - abilityOwner.x,
                y: clientInfo.lastMousePosition.y - abilityOwner.y,
            };
            const moveTo = createdObject.moveAttachment as SpellmakerCreateToolMoveAttachmentLine;
            const startPos = moveTo.moveTo[moveTo.moveTo.length - 1];
            const distance = calculateDistance(startPos, end);
            if (distance > 40) {
                moveTo.moveTo.push(end);
            }
        }
    }
}

function paint(ctx: CanvasRenderingContext2D, createObject: SpellmakerCreateToolObjectData, ownerPaintPos: Position, ability: AbilitySpellmaker, game: Game) {
    const moveToPositions = createObject.moveAttachment as SpellmakerCreateToolMoveAttachmentLine;
    if (moveToPositions.moveTo.length >= 2) {
        ctx.strokeStyle = "black";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ownerPaintPos.x + moveToPositions.moveTo[0].x, ownerPaintPos.y + moveToPositions.moveTo[0].y);
        for (let i = 1; i < moveToPositions.moveTo.length; i++) {
            ctx.lineTo(ownerPaintPos.x + moveToPositions.moveTo[i].x, ownerPaintPos.y + moveToPositions.moveTo[i].y);
        }
        ctx.stroke();
    }
}

function getMoveAttachment(createObject: SpellmakerCreateToolObjectData, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPosition: Position, game: Game): SpellmakerCreateToolMoveAttachment {
    const moveTo: Position[] = [];
    const moveToPositions = createObject.moveAttachment as SpellmakerCreateToolMoveAttachmentLine;
    if (moveToPositions.moveTo.length >= 2) {
        for (let i = 1; i < moveToPositions.moveTo.length; i++) {
            moveTo.push({ x: moveToPositions.moveTo[i].x - moveToPositions.moveTo[i - 1].x, y: moveToPositions.moveTo[i].y - moveToPositions.moveTo[i - 1].y });
        }
    }
    const moveAttach: SpellmakerCreateToolMoveAttachmentLine = { type: SPELLMAKER_TOOL_MOVE, moveTo: moveTo };
    return moveAttach;
}