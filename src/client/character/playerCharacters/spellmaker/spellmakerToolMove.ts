import { AbilityObject, AbilityOwner } from "../../../ability/ability.js";
import { calculateDirection, calculateDistance, calculateDistancePointToLine, findClientInfoByCharacterId } from "../../../game.js";
import { Position, Game, ClientInfo } from "../../../gameModel.js";
import { AbilitySpellmaker, SpellmakerCreateToolMoveAttachment, SpellmakerCreateToolObjectData } from "./abilitySpellmaker.js";
import { SPELLMAKER_MOVE_TOOLS_FUNCTIONS, SPELLMAKER_TOOLS_FUNCTIONS, SpellmakerCreateTool } from "./spellmakerTool.js";
import { moveByDirectionAndDistance } from "../../../map/map.js";
import { createMoreInfosPart } from "../../../moreInfo.js";
import { GAME_IMAGES } from "../../../imageLoad.js";

export type SpellmakerCreateToolMoveAttachmentLine = SpellmakerCreateToolMoveAttachment & {
    moveTo: Position[],
    speed: number,
}

export type SpellmakerCreateToolMove = SpellmakerCreateTool & {
    workInProgress?: SpellmakerCreateToolMoveAttachmentLine,
}

export const SPELLMAKER_TOOL_MOVE = "Move";
export const IMAGE_ICON_MOVE = "moveIcon";
GAME_IMAGES[IMAGE_ICON_MOVE] = {
    imagePath: "/images/moveIcon.png",
    spriteRowHeights: [],
    spriteRowWidths: [],
};
const SPEED = 2;
export function addSpellmakerToolMove() {
    SPELLMAKER_MOVE_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_MOVE] = {
        createTool: createTool,
        onKeyDown: onKeyDown,
        onKeyUp: onKeyUp,
        onTick: onTick,
        paint: paint,
        getMoveAttachment: getMoveAttachment,
        getMoveAttachmentNextMoveByAmount: getMoveAttachmentNextMoveByAmount,
        description: [
            "Move Tool: Line",
            "Attaches to close object",
            "Hold button and drag mouse to paint path",
        ],
        learnedThroughUpgrade: true,
    };
}


function onKeyDown(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, attachedToTarget: SpellmakerCreateToolObjectData, castPositionRelativeToCharacter: Position, game: Game) {
    const moveTool = tool as SpellmakerCreateToolMove;
    moveTool.workInProgress = {
        type: SPELLMAKER_TOOL_MOVE,
        moveTo: [{ x: castPositionRelativeToCharacter.x, y: castPositionRelativeToCharacter.y }],
        speed: SPEED,
    }
}

function createTool(ctx: CanvasRenderingContext2D): SpellmakerCreateTool {
    return {
        type: SPELLMAKER_TOOL_MOVE,
        subType: "move",
        description: createMoreInfosPart(ctx, SPELLMAKER_MOVE_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_MOVE].description),
        level: 0,
        totalDamage: 0,
        buttonImage: IMAGE_ICON_MOVE,
    };
}

function onKeyUp(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game): SpellmakerCreateToolMoveAttachment | undefined {
    const moveTool = tool as SpellmakerCreateToolMove;
    if (moveTool.workInProgress) {
        const moveTo = moveTool.workInProgress;
        moveTo.moveTo.push(castPositionRelativeToCharacter);
        moveTool.workInProgress = undefined;
        return moveTo;
    }
    return undefined;
}

function onTick(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game) {
    const clientInfo: ClientInfo | undefined = findClientInfoByCharacterId(abilityOwner.id, game);
    if (clientInfo) {
        const moveTool = tool as SpellmakerCreateToolMove;
        if (moveTool.workInProgress) {
            const end: Position = {
                x: clientInfo.lastMousePosition.x - abilityOwner.x,
                y: clientInfo.lastMousePosition.y - abilityOwner.y,
            };
            const moveTo = moveTool.workInProgress;
            const beforePos = moveTo.moveTo[moveTo.moveTo.length - 1];
            const distance = calculateDistance(beforePos, end);
            if (distance > 20) {
                moveTo.moveTo.push(end);
            }
        }
    }
}

function paint(ctx: CanvasRenderingContext2D, moveAttachment: SpellmakerCreateToolMoveAttachment, ownerPaintPos: Position, ability: AbilitySpellmaker, game: Game) {
    const moveToPositions = moveAttachment as SpellmakerCreateToolMoveAttachmentLine;
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

function getMoveAttachment(createObject: SpellmakerCreateToolObjectData, castPosition: Position, game: Game): SpellmakerCreateToolMoveAttachment {
    const moveTo: Position[] = [];
    const moveToPositions = createObject.moveAttachment as SpellmakerCreateToolMoveAttachmentLine;
    if (moveToPositions.moveTo.length >= 2) {
        for (let i = 1; i < moveToPositions.moveTo.length; i++) {
            moveTo.push({ x: moveToPositions.moveTo[i].x - moveToPositions.moveTo[i - 1].x, y: moveToPositions.moveTo[i].y - moveToPositions.moveTo[i - 1].y });
        }
    }
    const moveAttach: SpellmakerCreateToolMoveAttachmentLine = { type: SPELLMAKER_TOOL_MOVE, moveTo: moveTo, speed: SPEED };
    return moveAttach;
}

function getMoveAttachmentNextMoveByAmount(moveAttach: SpellmakerCreateToolMoveAttachment, abilityObject: AbilityObject, game: Game): Position {
    const moveTo = moveAttach as SpellmakerCreateToolMoveAttachmentLine;
    if (moveTo.speed > 0 && moveTo.moveTo.length > 0) {
        const nextMoveTo = moveTo.moveTo[0];
        const direction = calculateDirection({ x: 0, y: 0 }, nextMoveTo);
        const moveXY: Position = { x: 0, y: 0 };
        moveByDirectionAndDistance(moveXY, direction, moveTo.speed, false);
        const distance = calculateDistance(moveXY, nextMoveTo);
        if (distance <= moveTo.speed * 1.1) {
            moveTo.moveTo.splice(0, 1);
        } else {
            nextMoveTo.x -= moveXY.x;
            nextMoveTo.y -= moveXY.y;
        }
        return moveXY;
    }
    return { x: 0, y: 0 };
}
