import { AbilityOwner } from "../../../ability/ability.js";
import { calculateDistance, findClientInfoByCharacterId } from "../../../game.js";
import { Position, Game, ClientInfo } from "../../../gameModel.js";
import { AbilitySpellmaker, SpellmakerCreateToolMoveAttachment, SpellmakerCreateToolObjectData } from "./abilitySpellmaker.js";
import { SPELLMAKER_MOVE_TOOLS_FUNCTIONS, SPELLMAKER_TOOLS_FUNCTIONS, SpellmakerCreateTool, spellmakerNextStageSetup } from "./spellmakerTool.js";
import { createAbilityObjectSpellmakerProximity } from "./abilitySpellmakerProximity.js";
import { createMoreInfosPart } from "../../../moreInfo.js";
import { GAME_IMAGES } from "../../../imageLoad.js";

type CreateToolObjectProximityData = SpellmakerCreateToolObjectData & {
    radius: number,
    center: Position,
}

export type SpellmakerCreateToolProximity = SpellmakerCreateTool & {
    workInProgress?: CreateToolObjectProximityData,
}

export const SPELLMAKER_TOOL_PROXIMITY = "Proximity";
export const IMAGE_PROXIMITY = "proximityIcon";
GAME_IMAGES[IMAGE_PROXIMITY] = {
    imagePath: "/images/proximityIcon.png",
    spriteRowHeights: [],
    spriteRowWidths: [],
};

export function addSpellmakerToolProximity() {
    SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_PROXIMITY] = {
        calculateDistance: calculateDistanceProximity,
        calculateManaCost: calculateManaCost,
        createTool: createTool,
        getClosestCenter: getClosestCenter,
        onKeyDown: onKeyDown,
        onKeyUp: onKeyUp,
        onTick: onTick,
        paint: paint,
        spellCast: spellCast,
        canHaveMoveAttachment: true,
        canHaveNextStage: true,
        description: [
            "Tool: Proximity",
            "Triggers next stage when enemy close",
            "Mouse move horizonzal: change trigger range",
            `can have move attach: Yes`,
            `can have next stage: Yes`,
        ],
        learnedThroughUpgrade: true,
    };
}

function createObjectProximity(center: Position): CreateToolObjectProximityData {
    return {
        type: SPELLMAKER_TOOL_PROXIMITY,
        center: center,
        radius: 5,
        baseDamage: 10,
        nextStage: [],
    }
}

function createTool(ctx: CanvasRenderingContext2D): SpellmakerCreateTool {
    return {
        type: SPELLMAKER_TOOL_PROXIMITY,
        subType: "default",
        level: 0,
        totalDamage: 0,
        buttonImage: IMAGE_PROXIMITY,
    };
}

function calculateDistanceProximity(relativePosition: Position, createObject: SpellmakerCreateToolObjectData): number {
    const object = createObject as CreateToolObjectProximityData;
    return Math.max(0, calculateDistance(relativePosition, object.center) - object.radius);
}

function getClosestCenter(createObject: SpellmakerCreateToolObjectData, position: Position): Position {
    const object = createObject as CreateToolObjectProximityData;
    return { x: object.center.x, y: object.center.y };
}

function calculateManaCost(createObject: SpellmakerCreateToolObjectData): number {
    const object = createObject as CreateToolObjectProximityData;
    let manaCost = 0.5;
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
        proximity.radius = Math.max(10, Math.abs(castPositionRelativeToCharacter.x - proximity.center.x))
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
            proximity.radius = Math.max(10, Math.abs(relativePos.x - proximity.center.x))
        }
    }
}

function spellCast(createObject: SpellmakerCreateToolObjectData, baseDamage: number, faction: string, abilityId: number, castPosition: Position, damageFactor: number, manaFactor: number, chargeFactor: number, toolChain: string[], stageId: number, stageIndex: number, game: Game) {
    const toolProximity = createObject as CreateToolObjectProximityData;
    const center: Position = {
        x: toolProximity.center.x + castPosition.x,
        y: toolProximity.center.y + castPosition.y,
    };
    const newToolChain: string[] = [...toolChain];
    let moveAttachment: SpellmakerCreateToolMoveAttachment | undefined = undefined;
    if (toolProximity.moveAttachment) {
        const toolFunctions = SPELLMAKER_MOVE_TOOLS_FUNCTIONS[toolProximity.moveAttachment.type];
        if (toolFunctions.getMoveAttachment) {
            if (!newToolChain.includes(toolProximity.moveAttachment.type)) newToolChain.push(toolProximity.moveAttachment.type);
            moveAttachment = toolFunctions.getMoveAttachment(createObject, undefined, stageId, castPosition, game);
        }
    }
    const nextStage = spellmakerNextStageSetup(toolProximity.nextStage, baseDamage, toolProximity.center);
    const objectProximity = createAbilityObjectSpellmakerProximity(center, toolProximity.radius, moveAttachment, nextStage, damageFactor, manaFactor, chargeFactor, newToolChain, faction, abilityId, stageId, stageIndex, game);
    game.state.abilityObjects.push(objectProximity);
}

function paint(ctx: CanvasRenderingContext2D, createdObject: SpellmakerCreateToolObjectData, ownerPaintPos: Position, ability: AbilitySpellmaker, chargeFactor: number, game: Game) {
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
