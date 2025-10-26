import { AbilityOwner } from "../../../ability/ability.js";
import { calculateDistance, findClientInfoByCharacterId } from "../../../game.js";
import { Position, Game, ClientInfo } from "../../../gameModel.js";
import { AbilitySpellmaker, SpellmakerCreateToolMoveAttachment, SpellmakerCreateToolObjectData } from "./abilitySpellmaker.js";
import { SPELLMAKER_MOVE_TOOLS_FUNCTIONS, SPELLMAKER_TOOLS_FUNCTIONS, SpellmakerCreateTool } from "./spellmakerTool.js";
import { createAbilityObjectSpellmakerProximity } from "./abilitySpellmakerProximity.js";

type CreateToolObjectProximityData = SpellmakerCreateToolObjectData & {
    radius: number,
    center: Position,
}

export type SpellmakerCreateToolProximity = SpellmakerCreateTool & {
    workInProgress?: CreateToolObjectProximityData,
}

export const SPELLMAKER_TOOL_PROXIMITY = "Proximity";

export function addSpellmakerToolProximity() {
    SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_PROXIMITY] = {
        calculateDistance: calculateDistanceProximity,
        calculateManaCost: calculateManaCost,
        onKeyDown: onKeyDown,
        onKeyUp: onKeyUp,
        onTick: onTick,
        paint: paint,
        spellCast: spellCast,
        canHaveMoveAttachment: true,
        canHaveNextStage: true,
    };
}

function createObjectProximity(center: Position): CreateToolObjectProximityData {
    return {
        type: SPELLMAKER_TOOL_PROXIMITY,
        center: center,
        radius: 5,
    }
}

function calculateDistanceProximity(relativePosition: Position, createObject: SpellmakerCreateToolObjectData): number {
    const object = createObject as CreateToolObjectProximityData;
    return Math.max(0, calculateDistance(relativePosition, object.center) - object.radius);
}

function calculateManaCost(createObject: SpellmakerCreateToolObjectData): number {
    const object = createObject as CreateToolObjectProximityData;
    let manaCost = 1;
    return manaCost;
}


function onKeyDown(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) {
    const toolProximity = tool as SpellmakerCreateToolProximity;
    toolProximity.workInProgress = createObjectProximity({ x: castPositionRelativeToCharacter.x, y: castPositionRelativeToCharacter.y });
}

function onKeyUp(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game): SpellmakerCreateToolObjectData | undefined {
    const toolProximity = tool as SpellmakerCreateToolProximity;
    if (toolProximity.workInProgress) {
        const proximity = toolProximity.workInProgress;
        proximity.radius = Math.max(5, Math.abs(castPositionRelativeToCharacter.x - proximity.center.x))
        toolProximity.workInProgress = undefined;
        return proximity;
    }
    return undefined;
}

function onTick(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game) {
    const clientInfo: ClientInfo | undefined = findClientInfoByCharacterId(abilityOwner.id, game);
    if (clientInfo) {
        const toolProximity = tool as SpellmakerCreateToolProximity;
        if (toolProximity.workInProgress) {
            const relativePos: Position = {
                x: clientInfo.lastMousePosition.x - abilityOwner.x,
                y: clientInfo.lastMousePosition.y - abilityOwner.y,
            };
            const proximity = toolProximity.workInProgress;
            proximity.radius = Math.max(5, Math.abs(relativePos.x - proximity.center.x))
        }
    }
}

function spellCast(createObject: SpellmakerCreateToolObjectData, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPosition: Position, game: Game) {
    const toolProximity = createObject as CreateToolObjectProximityData;
    const center: Position = {
        x: toolProximity.center.x + castPosition.x,
        y: toolProximity.center.y + castPosition.y,
    };
    let moveAttachment: SpellmakerCreateToolMoveAttachment | undefined = undefined;
    if (toolProximity.moveAttachment) {
        const toolFunctions = SPELLMAKER_MOVE_TOOLS_FUNCTIONS[toolProximity.moveAttachment.type];
        if (toolFunctions.getMoveAttachment) moveAttachment = toolFunctions.getMoveAttachment(createObject, abilityOwner, ability, castPosition, game);
    }

    const objectProximity = createAbilityObjectSpellmakerProximity(center, toolProximity.radius, moveAttachment, toolProximity.nextStage, abilityOwner.faction, ability.id);
    game.state.abilityObjects.push(objectProximity);
}

function paint(ctx: CanvasRenderingContext2D, createdObject: SpellmakerCreateToolObjectData, ownerPaintPos: Position, ability: AbilitySpellmaker, game: Game) {
    const proximity = createdObject as CreateToolObjectProximityData;
    ctx.strokeStyle = "red";
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(proximity.center.x + ownerPaintPos.x, proximity.center.y + ownerPaintPos.y, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(proximity.center.x + ownerPaintPos.x, proximity.center.y + ownerPaintPos.y, proximity.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
}
