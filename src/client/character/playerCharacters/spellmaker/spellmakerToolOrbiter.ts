import { AbilityObject, AbilityOwner, findAbilityOwnerById } from "../../../ability/ability.js";
import { calculateDirection, calculateDistance, findClientInfoByCharacterId } from "../../../game.js";
import { Position, Game, ClientInfo } from "../../../gameModel.js";
import { AbilitySpellmaker, SpellmakerCreateToolMoveAttachment, SpellmakerCreateToolObjectData } from "./abilitySpellmaker.js";
import { SPELLMAKER_MOVE_TOOLS_FUNCTIONS, SPELLMAKER_TOOLS_FUNCTIONS, SpellmakerCreateTool } from "./spellmakerTool.js";
import { calculateMovePosition } from "../../../map/map.js";
import { createMoreInfosPart } from "../../../moreInfo.js";
import { GAME_IMAGES } from "../../../imageLoad.js";

export type SpellmakerCreateToolMoveAttachmentOrbiter = SpellmakerCreateToolMoveAttachment & {
    startPos: Position,
    center: Position,
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
export const IMAGE_ORBIT = "orbitIcon";
GAME_IMAGES[IMAGE_ORBIT] = {
    imagePath: "/images/orbitIcon.png",
    spriteRowHeights: [],
    spriteRowWidths: [],
};

export function addSpellmakerToolOrbiter() {
    SPELLMAKER_MOVE_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_ORBITER] = {
        createTool: createTool,
        onKeyDown: onKeyDown,
        onKeyUp: onKeyUp,
        onTick: onTick,
        paint: paint,
        getMoveAttachment: getMoveAttachment,
        getMoveAttachmentNextMoveByAmount: getMoveAttachmentNextMoveByAmount,
        description: [
            "Move Tool: Orbiter",
            "Attaches to close object",
            "Orbits around attached object",
        ],
        learnedThroughUpgrade: true,
    };
}


function createTool(ctx: CanvasRenderingContext2D): SpellmakerCreateTool {
    return {
        type: SPELLMAKER_TOOL_ORBITER,
        subType: "move",
        description: createMoreInfosPart(ctx, SPELLMAKER_MOVE_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_ORBITER].description),
        level: 0,
        totalDamage: 0,
        buttonImage: IMAGE_ORBIT,
    };
}

function onKeyDown(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, attachedToTarget: SpellmakerCreateToolObjectData, castPositionRelativeToCharacter: Position, game: Game) {
    const moveTool = tool as SpellmakerCreateToolOrbiter;
    let startPosition = { x: castPositionRelativeToCharacter.x, y: castPositionRelativeToCharacter.y };
    const attachedTypeFunctions = SPELLMAKER_TOOLS_FUNCTIONS[attachedToTarget.type];
    if (attachedTypeFunctions && attachedTypeFunctions.getClosestCenter) startPosition = attachedTypeFunctions.getClosestCenter(attachedToTarget, startPosition);

    const workInProgress: SpellmakerCreateToolMoveAttachmentOrbiter = {
        type: SPELLMAKER_TOOL_ORBITER,
        startPos: startPosition,
        center: determineClosestOrbitCenter(tool, ability, castPositionRelativeToCharacter),
    }
    moveTool.workInProgress = workInProgress;
}

function onKeyUp(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game): SpellmakerCreateToolMoveAttachment | undefined {
    const moveTool = tool as SpellmakerCreateToolOrbiter;
    if (moveTool.workInProgress) {
        const orbiter = moveTool.workInProgress as SpellmakerCreateToolMoveAttachmentOrbiter;
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
            const relativPos: Position = {
                x: clientInfo.lastMousePosition.x - abilityOwner.x,
                y: clientInfo.lastMousePosition.y - abilityOwner.y,
            };
            moveTool.workInProgress.center = determineClosestOrbitCenter(tool, ability, relativPos);
        }
    }
}

function paint(ctx: CanvasRenderingContext2D, moveAttachment: SpellmakerCreateToolMoveAttachment, ownerPaintPos: Position, ability: AbilitySpellmaker, game: Game) {
    const orbiter = moveAttachment as SpellmakerCreateToolMoveAttachmentOrbiter;
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    const radius = calculateDistance(orbiter.center, orbiter.startPos);
    if (radius <= 0) return;
    const startAngle = calculateDirection(orbiter.center, orbiter.startPos);
    const paintPos: Position = {
        x: ownerPaintPos.x + orbiter.center.x,
        y: ownerPaintPos.y + orbiter.center.y,
    }
    ctx.beginPath();
    const angleReduction = Math.max(0.8, (2 * Math.PI * radius - 20) / (2 * Math.PI * radius));
    const endAngle = startAngle + Math.PI * 2 * angleReduction;
    ctx.arc(paintPos.x, paintPos.y, radius, startAngle, endAngle);
    const orbitEnd = calculateMovePosition(paintPos, endAngle, radius, false);
    const arrowPoint1 = calculateMovePosition(orbitEnd, endAngle + 0.5 - Math.PI / 2, 15, false);
    const arrowPoint2 = calculateMovePosition(orbitEnd, endAngle - 0.5 - Math.PI / 2, 15, false);
    ctx.lineTo(arrowPoint1.x, arrowPoint1.y);
    ctx.moveTo(orbitEnd.x, orbitEnd.y);
    ctx.lineTo(arrowPoint2.x, arrowPoint2.y);
    ctx.stroke();
}

function getMoveAttachment(createObject: SpellmakerCreateToolObjectData, castPosition: Position, game: Game): SpellmakerCreateObjectMoveAttachmentOrbiter {
    const orbiter = createObject.moveAttachment as SpellmakerCreateToolMoveAttachmentOrbiter;
    const radius = calculateDistance(orbiter.center, orbiter.startPos);
    const angleTickChange = 2 / (radius * Math.PI);
    const moveAttach: SpellmakerCreateObjectMoveAttachmentOrbiter = {
        type: SPELLMAKER_TOOL_ORBITER,
        angleTickChange: angleTickChange,
        angle: calculateDirection(orbiter.center, orbiter.startPos),
        orbitRadius: radius,
    };
    return moveAttach;
}

function getMoveAttachmentNextMoveByAmount(moveAttach: SpellmakerCreateToolMoveAttachment, abilityObject: AbilityObject, game: Game): Position {
    const orbiter = moveAttach as SpellmakerCreateObjectMoveAttachmentOrbiter;
    if (abilityObject.abilityIdRef === undefined) return { x: 0, y: 0 };
    const owner = findAbilityOwnerById(abilityObject.abilityIdRef, game);
    if (owner === undefined) {
        return { x: 0, y: 0 };
    }
    orbiter.angle += orbiter.angleTickChange;
    const newPosition: Position = calculateMovePosition(owner, orbiter.angle, orbiter.orbitRadius, false);
    return { x: newPosition.x - abilityObject.x, y: newPosition.y - abilityObject.y };
}


function determineClosestOrbitCenter(tool: SpellmakerCreateTool, ability: AbilitySpellmaker, relativePosition: Position): Position {
    let orbitCenter: Position = { x: 0, y: 0 };
    let currentObjects = ability.spells[ability.spellIndex].createdObjects;
    if (ability.attachToIndex === undefined) return orbitCenter;
    let currentStage = 0;
    while (currentStage < ability.spellmakeStage) {
        const attachedToObject = currentObjects[ability.attachToIndex[currentStage]];
        const attachedTypeFunctions = SPELLMAKER_TOOLS_FUNCTIONS[attachedToObject.type];
        if (attachedTypeFunctions && attachedTypeFunctions.getClosestCenter) {
            orbitCenter = attachedTypeFunctions.getClosestCenter(attachedToObject, relativePosition);
        }
        currentObjects = attachedToObject.nextStage;
        currentStage++;
    }

    let closestDistance = calculateDistance(orbitCenter, relativePosition);
    for (let i = 0; i < currentObjects.length; i++) {
        const object = currentObjects[i];
        if (i === ability.attachToIndex[ability.attachToIndex.length - 1]) continue;
        const objectFunctions = SPELLMAKER_TOOLS_FUNCTIONS[object.type];
        if (!objectFunctions.calculateDistance) continue;
        const tempDistance = objectFunctions.calculateDistance(relativePosition, object);
        if (tempDistance < 30 && tempDistance < closestDistance) {
            closestDistance = tempDistance;
            if (objectFunctions.getClosestCenter) {
                orbitCenter = objectFunctions.getClosestCenter(object, relativePosition);
            } else {
                orbitCenter = relativePosition;
            }
        }
    }
    return orbitCenter;
}
