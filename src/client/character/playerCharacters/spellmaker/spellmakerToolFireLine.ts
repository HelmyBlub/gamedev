import { AbilityOwner } from "../../../ability/ability.js";
import { calculateDistance, calculateDistancePointToLine, findClientInfoByCharacterId } from "../../../game.js";
import { Position, Game, ClientInfo } from "../../../gameModel.js";
import { AbilitySpellmaker, SpellmakerCreateToolMoveAttachment, SpellmakerCreateToolObjectData } from "./abilitySpellmaker.js";
import { SPELLMAKER_MOVE_TOOLS_FUNCTIONS, SPELLMAKER_TOOLS_FUNCTIONS, SpellmakerCreateTool } from "./spellmakerTool.js";
import { createAbilityObjectSpellmakerFireLine } from "./abilitySpellmakerFireLine.js";
import { createMoreInfosPart } from "../../../moreInfo.js";

type CreateToolObjectFireLineData = SpellmakerCreateToolObjectData & {
    positions: Position[],
}

export type SpellmakerCreateToolFireLine = SpellmakerCreateTool & {
    workInProgress?: CreateToolObjectFireLineData,
}

export const SPELLMAKER_TOOL_FIRELINE = "FireLine";

export function addSpellmakerToolFireline() {
    SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_FIRELINE] = {
        calculateDistance: calculateDistanceFireLine,
        calculateManaCost: calculateManaCost,
        createTool: createTool,
        onKeyDown: onKeyDown,
        onKeyUp: onKeyUp,
        onTick: onTick,
        paint: paint,
        spellCast: spellCast,
        canHaveMoveAttachment: true,
        description: [
            "Tool: Fireline",
            "Hold button and drag mouse to paint path",
            `can have move attach: Yes`,
            `can have next stage: No`,
        ],
    };
}

function createObjectFireLine(): CreateToolObjectFireLineData {
    return {
        type: SPELLMAKER_TOOL_FIRELINE,
        positions: [],
        level: 1,
        nextStage: [],
    }
}

function createTool(ctx: CanvasRenderingContext2D): SpellmakerCreateTool {
    return {
        type: SPELLMAKER_TOOL_FIRELINE,
        subType: "default",
        description: createMoreInfosPart(ctx, SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_FIRELINE].description),
    };
}

function calculateDistanceFireLine(relativePosition: Position, createObject: SpellmakerCreateToolObjectData): number {
    const objectFireLine = createObject as CreateToolObjectFireLineData;
    let closestDistance = 0;
    for (let i = 1; i < objectFireLine.positions.length; i++) {
        const tempDistance = calculateDistancePointToLine(relativePosition, objectFireLine.positions[i - 1], objectFireLine.positions[i]);
        if (i === 1 || closestDistance > tempDistance) {
            closestDistance = tempDistance;
        }
    }
    return closestDistance;
}

function calculateManaCost(createObject: SpellmakerCreateToolObjectData): number {
    const fireLine = createObject as CreateToolObjectFireLineData;
    let manaCost = 0;
    for (let i = 1; i < fireLine.positions.length; i++) {
        const distance = calculateDistance(fireLine.positions[i - 1], fireLine.positions[i]) / 50;
        manaCost += distance;
    }
    return manaCost;
}


function onKeyDown(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) {
    const toolFireLine = tool as SpellmakerCreateToolFireLine;
    toolFireLine.workInProgress = createObjectFireLine();
    toolFireLine.workInProgress.positions.push({ x: castPositionRelativeToCharacter.x, y: castPositionRelativeToCharacter.y });
}

function onKeyUp(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game): SpellmakerCreateToolObjectData | undefined {
    const toolFireLine = tool as SpellmakerCreateToolFireLine;
    if (toolFireLine.workInProgress) {
        const fireLine = toolFireLine.workInProgress;
        if (fireLine.positions.length == 1) {
            if (calculateDistance(castPositionRelativeToCharacter, fireLine.positions[0]) <= 5) {
                toolFireLine.workInProgress = undefined;
                return undefined;
            }
        }
        if (calculateDistance(fireLine.positions[fireLine.positions.length - 1], castPositionRelativeToCharacter) > 5) {
            fireLine.positions.push(castPositionRelativeToCharacter);
        }
        toolFireLine.workInProgress = undefined;
        return fireLine;
    }
    return undefined;
}

function onTick(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game) {
    const clientInfo: ClientInfo | undefined = findClientInfoByCharacterId(abilityOwner.id, game);
    if (clientInfo) {
        const toolFireLine = tool as SpellmakerCreateToolFireLine;
        if (toolFireLine.workInProgress) {
            const fireLine = toolFireLine.workInProgress;
            const end: Position = {
                x: clientInfo.lastMousePosition.x - abilityOwner.x,
                y: clientInfo.lastMousePosition.y - abilityOwner.y,
            };
            if (calculateDistance(fireLine.positions[fireLine.positions.length - 1], end) > 10) {
                fireLine.positions.push(end);
            }
        }
    }
}

function spellCast(createObject: SpellmakerCreateToolObjectData, level: number, faction: string, abilityId: number, castPosition: Position, game: Game) {
    const fireline = createObject as CreateToolObjectFireLineData;
    if (fireline.positions.length < 2) return;
    const damage = level * 100;
    const start: Position = {
        x: fireline.positions[0].x + castPosition.x,
        y: fireline.positions[0].y + castPosition.y,
    };
    const joints: Position[] = [];
    for (let i = 1; i < fireline.positions.length; i++) {
        joints.push({ x: fireline.positions[i].x + castPosition.x, y: fireline.positions[i].y + castPosition.y });
    }
    let moveAttachment: SpellmakerCreateToolMoveAttachment | undefined = undefined;
    if (fireline.moveAttachment) {
        const toolFunctions = SPELLMAKER_MOVE_TOOLS_FUNCTIONS[fireline.moveAttachment.type];
        if (toolFunctions.getMoveAttachment) moveAttachment = toolFunctions.getMoveAttachment(createObject, castPosition, game);
    }
    const moveSpeed = 2;
    const width = 10;
    const duration = 5000;
    const tickInterval = 250;
    const objectFireLine = createAbilityObjectSpellmakerFireLine(faction, start, joints, moveAttachment, damage, width, duration, moveSpeed, tickInterval, "red", abilityId, game);
    game.state.abilityObjects.push(objectFireLine);
}

function paint(ctx: CanvasRenderingContext2D, createdObject: SpellmakerCreateToolObjectData, ownerPaintPos: Position, ability: AbilitySpellmaker, game: Game) {
    const fireline = createdObject as CreateToolObjectFireLineData;
    if (fireline.positions.length >= 2) {
        ctx.globalAlpha = 0.50;
        ctx.strokeStyle = "red";
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(ownerPaintPos.x + fireline.positions[0].x, ownerPaintPos.y + fireline.positions[0].y);
        for (let i = 1; i < fireline.positions.length; i++) {
            ctx.lineTo(ownerPaintPos.x + fireline.positions[i].x, ownerPaintPos.y + fireline.positions[i].y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;

    }
}
