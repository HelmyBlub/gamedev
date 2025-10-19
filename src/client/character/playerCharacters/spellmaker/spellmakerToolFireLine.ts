import { create } from "domain";
import { Ability, AbilityOwner } from "../../../ability/ability.js";
import { calculateDistance, calculateDistancePointToLine, findClientInfoByCharacterId } from "../../../game.js";
import { Position, Game, ClientInfo } from "../../../gameModel.js";
import { AbilitySpellmaker, abilitySpellmakerCalculateManaCost, SpellmakerCreateToolMoveAttachment, SpellmakerCreateToolObjectData } from "./abilitySpellmaker.js";
import { SPELLMAKER_TOOLS_FUNCTIONS, SpellmakerCreateTool } from "./spellmakerTool.js";
import { SpellmakerCreateToolMoveAttachmentLine } from "./spellmakerToolMove.js";
import { createAbilityObjectSpellmakerFireLine } from "./abilitySpellmakerFireLine.js";

type CreateToolObjectFireLineData = SpellmakerCreateToolObjectData & {
    positions: Position[],
}

export type SpellmakerCreateToolFireLine = SpellmakerCreateTool & {
    startPosition?: Position,
    attachToIndex?: number,
}

export const SPELLMAKER_TOOL_FIRELINE = "FireLine";

export function addSpellmakerToolFireline() {
    SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_FIRELINE] = {
        calculateDistance: calculateDistanceFireLine,
        calculateManaCost: calculateManaCost,
        onKeyDown: onKeyDown,
        onKeyUp: onKeyUp,
        onTick: onTick,
        paint: paint,
        spellCast: spellCast,
    };
}

function createObjectFireLine(): CreateToolObjectFireLineData {
    return {
        type: SPELLMAKER_TOOL_FIRELINE,
        positions: [],
    }
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
    toolFireLine.startPosition = { x: castPositionRelativeToCharacter.x, y: castPositionRelativeToCharacter.y };
    toolFireLine.attachToIndex = undefined;
}

function onKeyUp(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) {
    const toolFireLine = tool as SpellmakerCreateToolFireLine;
    if (toolFireLine.startPosition) {
        if (toolFireLine.attachToIndex === undefined) {
            ability.createdObjects.push(createObjectFireLine());
            toolFireLine.attachToIndex = ability.createdObjects.length - 1;
        }
        const fireLine = ability.createdObjects[toolFireLine.attachToIndex] as CreateToolObjectFireLineData;
        if (fireLine.positions.length === 0) {
            fireLine.positions.push(toolFireLine.startPosition);
        }
        fireLine.positions.push(castPositionRelativeToCharacter);
        abilitySpellmakerCalculateManaCost(ability);
        toolFireLine.startPosition = undefined;
    }
}

function onTick(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game) {
    const clientInfo: ClientInfo | undefined = findClientInfoByCharacterId(abilityOwner.id, game);
    if (clientInfo) {
        const toolFireLine = tool as SpellmakerCreateToolFireLine;
        if (toolFireLine.startPosition) {
            if (toolFireLine.attachToIndex === undefined) {
                ability.createdObjects.push(createObjectFireLine());
                toolFireLine.attachToIndex = ability.createdObjects.length - 1;
            }
            const fireLine = ability.createdObjects[toolFireLine.attachToIndex] as CreateToolObjectFireLineData;
            if (fireLine.positions.length === 0) {
                fireLine.positions.push(toolFireLine.startPosition);
            }
            const end: Position = {
                x: clientInfo.lastMousePosition.x - abilityOwner.x,
                y: clientInfo.lastMousePosition.y - abilityOwner.y,
            };
            fireLine.positions.push(end);
            abilitySpellmakerCalculateManaCost(ability);
        }
    }
}

function spellCast(createObject: SpellmakerCreateToolObjectData, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPosition: Position, game: Game) {
    const fireline = createObject as CreateToolObjectFireLineData;
    if (fireline.positions.length < 2) return;
    const damage = ability.level!.level * 100;
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
        const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[fireline.moveAttachment.type];
        if (toolFunctions.getMoveAttachment) moveAttachment = toolFunctions.getMoveAttachment(createObject, abilityOwner, ability, castPosition, game);
    }
    const moveSpeed = 2;
    const width = 10;
    const duration = 5000;
    const tickInterval = 250;
    const objectFireLine = createAbilityObjectSpellmakerFireLine(abilityOwner.faction, start, joints, moveAttachment, damage, width, duration, moveSpeed, tickInterval, "red", ability.id, game);
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
    if (fireline.moveAttachment) {
        const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[fireline.moveAttachment.type];
        toolFunctions.paint(ctx, createdObject, ownerPaintPos, ability, game);
    }
}
