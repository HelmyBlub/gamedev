import { AbilityOwner } from "../../../ability/ability.js";
import { calculateDistance, calculateDistancePointToLine, deepCopy, findClientInfoByCharacterId } from "../../../game.js";
import { Position, Game, ClientInfo } from "../../../gameModel.js";
import { AbilitySpellmaker, AbilitySpellmakerObject, SPELLMAKER_MAX_CAST_RANGE, SpellmakerCreateToolMoveAttachment, SpellmakerCreateToolObjectData } from "./abilitySpellmaker.js";
import { SPELLMAKER_MOVE_TOOLS_FUNCTIONS, SPELLMAKER_TOOLS_FUNCTIONS, SpellmakerCreateTool } from "./spellmakerTool.js";
import { createAbilityObjectSpellmakerFireLine } from "./abilitySpellmakerFireLine.js";
import { createMoreInfosPart } from "../../../moreInfo.js";
import { GAME_IMAGES } from "../../../imageLoad.js";

export type CreateToolObjectFireLineData = SpellmakerCreateToolObjectData & {
    positions: Position[],
}

export type SpellmakerCreateToolFireLine = SpellmakerCreateTool & {
    workInProgress?: CreateToolObjectFireLineData,
}

export const SPELLMAKER_TOOL_FIRELINE = "FireLine";
const IMAGE_FIRE_LINE = "fireLineIcon";
GAME_IMAGES[IMAGE_FIRE_LINE] = {
    imagePath: "/images/fireLineIcon.png",
    spriteRowHeights: [],
    spriteRowWidths: [],
};


export function addSpellmakerToolFireline() {
    SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_FIRELINE] = {
        calculateDistance: calculateDistanceFireLine,
        calculateManaCost: calculateManaCost,
        createTool: createTool,
        getRelativeSpellmakePosition: getRelativeSpellmakePosition,
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
        learnedThroughUpgrade: true,
        doesDamage: true,
    };
}

function createObjectFireLine(typeUpgradedCount: number): CreateToolObjectFireLineData {
    return {
        type: SPELLMAKER_TOOL_FIRELINE,
        positions: [],
        baseDamage: 10,
        nextStage: [],
        typeUpgradedCount: typeUpgradedCount,
    }
}

function createTool(ctx: CanvasRenderingContext2D): SpellmakerCreateTool {
    return {
        type: SPELLMAKER_TOOL_FIRELINE,
        subType: "default",
        level: 0,
        totalDamage: 0,
        upgrades: 0,
        buttonImage: IMAGE_FIRE_LINE,
    };
}

function getRelativeSpellmakePosition(createObject: SpellmakerCreateToolObjectData): Position {
    const object = createObject as CreateToolObjectFireLineData;
    return { x: object.positions[0].x, y: object.positions[0].y };
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
        const distance = calculateDistance(fireLine.positions[i - 1], fireLine.positions[i]) / 100;
        manaCost += distance;
    }
    return manaCost;
}


function onKeyDown(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) {
    const toolFireLine = tool as SpellmakerCreateToolFireLine;
    toolFireLine.workInProgress = createObjectFireLine(tool.upgrades!);
    toolFireLine.workInProgress.positions.push({ x: castPositionRelativeToCharacter.x, y: castPositionRelativeToCharacter.y });
}

function onKeyUp(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game): SpellmakerCreateToolObjectData | undefined {
    const toolFireLine = tool as SpellmakerCreateToolFireLine;
    if (toolFireLine.workInProgress) {
        const fireLine = toolFireLine.workInProgress as CreateToolObjectFireLineData;
        if (fireLine.positions.length == 1) {
            if (calculateDistance(castPositionRelativeToCharacter, fireLine.positions[0]) <= 5) {
                toolFireLine.workInProgress = undefined;
                return undefined;
            }
        }
        if (calculateDistance(fireLine.positions[fireLine.positions.length - 1], castPositionRelativeToCharacter) > 5) {
            const distanceToCenter = calculateDistance({ x: 0, y: 0 }, castPositionRelativeToCharacter);
            if (distanceToCenter < SPELLMAKER_MAX_CAST_RANGE) {
                fireLine.positions.push(castPositionRelativeToCharacter);
            }
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
            const fireLine = toolFireLine.workInProgress as CreateToolObjectFireLineData;
            const end: Position = {
                x: clientInfo.lastMousePosition.x - abilityOwner.x,
                y: clientInfo.lastMousePosition.y - abilityOwner.y,
            };
            const distanceToCenter = calculateDistance({ x: 0, y: 0 }, end);
            if (distanceToCenter < SPELLMAKER_MAX_CAST_RANGE && calculateDistance(fireLine.positions[fireLine.positions.length - 1], end) > 10) {
                fireLine.positions.push(end);
            }
        }
    }
}

function spellCast(createObject: SpellmakerCreateToolObjectData, baseDamage: number, faction: string, abilityId: number, castPosition: Position, damageFactor: number, manaFactor: number, chargeFactor: number, toolChain: string[], stageId: number, stageIndex: number, game: Game, preStageAbilityObject?: AbilitySpellmakerObject) {
    const fireline = createObject as CreateToolObjectFireLineData;
    if (fireline.positions.length < 2) return;
    const tickInterval = 200;
    const chargedValues = getValuesWithCharge(chargeFactor);
    const typeUpgradeCount = createObject.typeUpgradedCount ?? 0;
    const typeUpgradeCountDamageFactor = 1 + typeUpgradeCount / 10;
    const damage = baseDamage * damageFactor * tickInterval / 250 * chargedValues.damageFactor * typeUpgradeCountDamageFactor;
    const newToolChain: string[] = [...toolChain];
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
        if (toolFunctions.getMoveAttachment) {
            moveAttachment = toolFunctions.getMoveAttachment(createObject, preStageAbilityObject, stageId, castPosition, game);
        }
    }
    const width = 10;
    const duration = 5000 * chargedValues.durationFactor;
    const objectFireLine = createAbilityObjectSpellmakerFireLine(faction, start, joints, moveAttachment, damage, width, duration, tickInterval, "red", damageFactor, manaFactor, chargeFactor, newToolChain, abilityId, stageId, stageIndex, game);
    if (createObject.debuffAttachment) {
        objectFireLine.debuffAttachment = deepCopy(createObject.debuffAttachment);
    }

    game.state.abilityObjects.push(objectFireLine);
}

function paint(ctx: CanvasRenderingContext2D, createdObject: SpellmakerCreateToolObjectData, paintPos: Position, ability: AbilitySpellmaker, chargeFactor: number, game: Game) {
    const fireline = createdObject as CreateToolObjectFireLineData;
    if (fireline.positions.length >= 2) {
        ctx.globalAlpha = Math.min(0.9, 0.50 * Math.sqrt(chargeFactor));
        ctx.strokeStyle = "red";
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(paintPos.x + fireline.positions[0].x, paintPos.y + fireline.positions[0].y);
        for (let i = 1; i < fireline.positions.length; i++) {
            ctx.lineTo(paintPos.x + fireline.positions[i].x, paintPos.y + fireline.positions[i].y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
}

function getValuesWithCharge(chargeFactor: number): { durationFactor: number, damageFactor: number } {
    const newDurationFactor = Math.min(12, Math.sqrt(chargeFactor));
    return {
        damageFactor: chargeFactor / newDurationFactor,
        durationFactor: newDurationFactor,
    };
}

