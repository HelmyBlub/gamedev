import { AbilityObject, AbilityOwner, findAbilityOwnerById } from "../../../ability/ability.js";
import { calculateDirection, calculateDistance, findClientInfoByCharacterId } from "../../../game.js";
import { Position, Game, ClientInfo } from "../../../gameModel.js";
import { AbilitySpellmaker, AbilitySpellmakerObject, SpellmakerCreateToolMoveAttachment, SpellmakerCreateToolObjectData } from "./abilitySpellmaker.js";
import { SPELLMAKER_MOVE_TOOLS_FUNCTIONS, SPELLMAKER_TOOLS_FUNCTIONS, SpellmakerCreateTool } from "./spellmakerTool.js";
import { calculateMovePosition } from "../../../map/map.js";
import { createMoreInfosPart } from "../../../moreInfo.js";
import { GAME_IMAGES } from "../../../imageLoad.js";

const REF_BEFORE_INDEX = -1;
export type SpellmakerCreateToolMoveAttachmentOrbiter = SpellmakerCreateToolMoveAttachment & {
    startPos: Position,
    center: Position,
    refIndex: number,
}

export type SpellmakerCreateObjectMoveAttachmentOrbiter = SpellmakerCreateToolMoveAttachment & {
    angle: number,
    orbitRadius: number,
    angleTickChange: number,
    center: Position,
    stageIdRef?: number,
    stageIndexRef?: number,
    refNotFound?: boolean,
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

    const orbitCenter = determineClosestOrbitCenter(tool, ability, castPositionRelativeToCharacter);
    const workInProgress: SpellmakerCreateToolMoveAttachmentOrbiter = {
        type: SPELLMAKER_TOOL_ORBITER,
        startPos: startPosition,
        center: orbitCenter.pos,
        refIndex: orbitCenter.orbitIndex,
    }
    moveTool.workInProgress = workInProgress;
}

function onKeyUp(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game): SpellmakerCreateToolMoveAttachment | undefined {
    const orbiterTool = tool as SpellmakerCreateToolOrbiter;
    if (orbiterTool.workInProgress) {
        const orbiter = orbiterTool.workInProgress as SpellmakerCreateToolMoveAttachmentOrbiter;
        orbiterTool.workInProgress = undefined;
        return orbiter;
    }
    return undefined;
}

function onTick(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game) {
    const clientInfo: ClientInfo | undefined = findClientInfoByCharacterId(abilityOwner.id, game);
    if (clientInfo) {
        const moveTool = tool as SpellmakerCreateToolOrbiter;
        if (moveTool.workInProgress) {
            const orbiter = moveTool.workInProgress as SpellmakerCreateToolMoveAttachmentOrbiter;
            const relativPos: Position = {
                x: clientInfo.lastMousePosition.x - abilityOwner.x,
                y: clientInfo.lastMousePosition.y - abilityOwner.y,
            };
            const orbitCenter = determineClosestOrbitCenter(tool, ability, relativPos);
            orbiter.center = orbitCenter.pos;
            orbiter.refIndex = orbitCenter.orbitIndex;
        }
    }
}

function paint(ctx: CanvasRenderingContext2D, moveAttachment: SpellmakerCreateToolMoveAttachment, paintPos: Position, ability: AbilitySpellmaker, game: Game) {
    const orbiter = moveAttachment as SpellmakerCreateToolMoveAttachmentOrbiter;
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    const radius = calculateDistance(orbiter.center, orbiter.startPos);
    if (radius <= 0) return;
    const startAngle = calculateDirection(orbiter.center, orbiter.startPos);
    const orbitPaintPos: Position = {
        x: paintPos.x + orbiter.center.x,
        y: paintPos.y + orbiter.center.y,
    }
    ctx.beginPath();
    const angleReduction = Math.max(0.8, (2 * Math.PI * radius - 20) / (2 * Math.PI * radius));
    const endAngle = startAngle + Math.PI * 2 * angleReduction;
    ctx.arc(orbitPaintPos.x, orbitPaintPos.y, radius, startAngle, endAngle);
    const orbitEnd = calculateMovePosition(orbitPaintPos, endAngle, radius, false);
    const arrowPoint1 = calculateMovePosition(orbitEnd, endAngle + 0.5 - Math.PI / 2, 15, false);
    const arrowPoint2 = calculateMovePosition(orbitEnd, endAngle - 0.5 - Math.PI / 2, 15, false);
    ctx.lineTo(arrowPoint1.x, arrowPoint1.y);
    ctx.moveTo(orbitEnd.x, orbitEnd.y);
    ctx.lineTo(arrowPoint2.x, arrowPoint2.y);
    ctx.stroke();
}

function getMoveAttachment(createObject: SpellmakerCreateToolObjectData, preStageAbilityObject: AbilitySpellmakerObject | undefined, stageId: number, castPosition: Position, game: Game): SpellmakerCreateObjectMoveAttachmentOrbiter {
    const orbiter = createObject.moveAttachment as SpellmakerCreateToolMoveAttachmentOrbiter;
    const radius = calculateDistance(orbiter.center, orbiter.startPos);
    const angleTickChange = 2 / (radius * Math.PI);
    const isPlayerCast = !preStageAbilityObject;
    const isPlayerCenter = isPlayerCast && orbiter.refIndex === -1;
    const stageIdRef = isPlayerCenter ? undefined : (isPlayerCast || orbiter.refIndex !== -1 ? stageId : preStageAbilityObject.stageId);
    const stageIndexRef = isPlayerCenter ? undefined : (isPlayerCast || orbiter.refIndex !== -1 ? orbiter.refIndex : preStageAbilityObject.stageIndex);
    const moveAttach: SpellmakerCreateObjectMoveAttachmentOrbiter = {
        type: SPELLMAKER_TOOL_ORBITER,
        angleTickChange: angleTickChange,
        angle: calculateDirection(orbiter.center, orbiter.startPos),
        orbitRadius: radius,
        stageIdRef: stageIdRef,
        stageIndexRef: stageIndexRef,
        center: preStageAbilityObject ? { x: preStageAbilityObject.x, y: preStageAbilityObject.y } : { x: 0, y: 0 },
    };
    return moveAttach;
}

function getMoveAttachmentNextMoveByAmount(moveAttach: SpellmakerCreateToolMoveAttachment, abilityObject: AbilitySpellmakerObject, game: Game): Position {
    const orbiter = moveAttach as SpellmakerCreateObjectMoveAttachmentOrbiter;
    if (orbiter.stageIdRef === undefined || orbiter.stageIndexRef === undefined) {
        if (abilityObject.abilityIdRef === undefined) return { x: 0, y: 0 };
        const owner = findAbilityOwnerById(abilityObject.abilityIdRef, game);
        if (owner === undefined) {
            return { x: 0, y: 0 };
        }
        orbiter.center = { x: owner.x, y: owner.y };
    } else if (!orbiter.refNotFound) {
        const centerObject = game.state.abilityObjects.find((o) => {
            const stageIdRef = (o as any).stageId;
            if (stageIdRef === orbiter.stageIdRef) {
                const stageIndexRef = (o as any).stageIndex;
                if (stageIndexRef === orbiter.stageIndexRef) return true;
            }
            return false;
        });
        if (centerObject) orbiter.center = { x: centerObject.x, y: centerObject.y }
        else {
            orbiter.refNotFound = true;
        };
    }
    orbiter.angle += orbiter.angleTickChange;
    const newPosition: Position = calculateMovePosition(orbiter.center, orbiter.angle, orbiter.orbitRadius, false);
    return { x: newPosition.x - abilityObject.x, y: newPosition.y - abilityObject.y };
}


function determineClosestOrbitCenter(tool: SpellmakerCreateTool, ability: AbilitySpellmaker, relativePosition: Position): { pos: Position, orbitIndex: number } {
    let orbitCenter: Position = { x: 0, y: 0 };
    let currentObjects = ability.spells[ability.spellIndex].createdObjects;
    let orbitIndex = REF_BEFORE_INDEX;
    if (ability.attachToIndex === undefined) {
        return { pos: orbitCenter, orbitIndex };
    }
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
            orbitIndex = i;
            if (objectFunctions.getClosestCenter) {
                orbitCenter = objectFunctions.getClosestCenter(object, relativePosition);
            } else {
                orbitCenter = relativePosition;
            }
        }
    }
    return { pos: orbitCenter, orbitIndex };
}
