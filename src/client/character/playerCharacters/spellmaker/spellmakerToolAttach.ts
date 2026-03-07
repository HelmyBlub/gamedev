import { AbilityOwner, findAbilityOwnerById } from "../../../ability/ability.js";
import { calculateDirection, calculateDistance, findClientInfoByCharacterId } from "../../../game.js";
import { Position, Game, ClientInfo } from "../../../gameModel.js";
import { AbilitySpellmaker, AbilitySpellmakerObject, SpellmakerCreateToolMoveAttachment, SpellmakerCreateToolObjectData } from "./abilitySpellmaker.js";
import { SPELLMAKER_MOVE_TOOLS_FUNCTIONS, SPELLMAKER_TOOLS_FUNCTIONS, spellmakerCreateObjectDetermineClosestCenter, SpellmakerCreateTool } from "./spellmakerTool.js";
import { calculateMovePosition } from "../../../map/map.js";
import { GAME_IMAGES } from "../../../imageLoad.js";

const REF_BEFORE_INDEX = -1;
export type SpellmakerCreateToolMoveAttachmentAttach = SpellmakerCreateToolMoveAttachment & {
    center: Position,
    attachCenter: Position,
    relativeOffset: Position,
    refIndex: number,
}

export type SpellmakerCreateObjectMoveAttachmentAttach = SpellmakerCreateToolMoveAttachment & {
    relativeOffset: Position,
    stageIdRef?: number,
    stageIndexRef?: number,
    refNotFound?: boolean,
}


export type SpellmakerCreateToolAttach = SpellmakerCreateTool & {
    workInProgress?: SpellmakerCreateToolMoveAttachmentAttach,
}

export const SPELLMAKER_TOOL_ATTACH = "Attach";
export const IMAGE_ATTACH = "orbitIcon";
// GAME_IMAGES[IMAGE_ATTACH] = {
//     imagePath: "/images/orbitIcon.png",
//     spriteRowHeights: [],
//     spriteRowWidths: [],
// };

export function addSpellmakerToolAttach() {
    SPELLMAKER_MOVE_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_ATTACH] = {
        createTool: createTool,
        onKeyDown: onKeyDown,
        onKeyUp: onKeyUp,
        onTick: onTick,
        paint: paint,
        getMoveAttachment: getMoveAttachment,
        getMoveAttachmentNextMoveByAmount: getMoveAttachmentNextMoveByAmount,
        description: [
            "Move Tool: Attach",
            "Attaches to close object",
            "Keeps position relative to attached object",
        ],
        learnedThroughUpgrade: true,
    };
}


function createTool(ctx: CanvasRenderingContext2D): SpellmakerCreateTool {
    return {
        type: SPELLMAKER_TOOL_ATTACH,
        subType: "move",
        level: 0,
        totalDamage: 0,
        buttonImage: IMAGE_ATTACH,
    };
}

function onKeyDown(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, attachedToTarget: SpellmakerCreateToolObjectData, castPositionRelativeToCharacter: Position, game: Game) {
    const moveTool = tool as SpellmakerCreateToolAttach;
    let startPosition = { x: castPositionRelativeToCharacter.x, y: castPositionRelativeToCharacter.y };
    const attachedTypeFunctions = SPELLMAKER_TOOLS_FUNCTIONS[attachedToTarget.type];
    if (attachedTypeFunctions && attachedTypeFunctions.getClosestCenter) startPosition = attachedTypeFunctions.getClosestCenter(attachedToTarget, startPosition);

    const closest = spellmakerCreateObjectDetermineClosestCenter(tool, ability, castPositionRelativeToCharacter);
    const workInProgress: SpellmakerCreateToolMoveAttachmentAttach = {
        type: SPELLMAKER_TOOL_ATTACH,
        center: startPosition,
        refIndex: closest.createObjectIndex,
        attachCenter: closest.pos,
        relativeOffset: { x: startPosition.x - closest.startPos.x, y: startPosition.y - closest.startPos.y },
    }
    moveTool.workInProgress = workInProgress;
}

function onKeyUp(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game): SpellmakerCreateToolMoveAttachment | undefined {
    const attachTool = tool as SpellmakerCreateToolAttach;
    if (attachTool.workInProgress) {
        const attach = attachTool.workInProgress as SpellmakerCreateToolMoveAttachmentAttach;
        attachTool.workInProgress = undefined;
        return attach;
    }
    return undefined;
}

function onTick(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game) {
    const clientInfo: ClientInfo | undefined = findClientInfoByCharacterId(abilityOwner.id, game);
    if (clientInfo) {
        const moveTool = tool as SpellmakerCreateToolAttach;
        if (moveTool.workInProgress) {
            const attach = moveTool.workInProgress as SpellmakerCreateToolMoveAttachmentAttach;
            const relativPos: Position = {
                x: clientInfo.lastMousePosition.x - abilityOwner.x,
                y: clientInfo.lastMousePosition.y - abilityOwner.y,
            };
            const closest = spellmakerCreateObjectDetermineClosestCenter(tool, ability, relativPos);
            attach.refIndex = closest.createObjectIndex;
            attach.attachCenter = closest.pos;
            attach.relativeOffset = { x: closest.startPos.x - attach.center.x, y: closest.startPos.y - attach.center.y };
        }
    }
}

function paint(ctx: CanvasRenderingContext2D, moveAttachment: SpellmakerCreateToolMoveAttachment, paintPos: Position, ability: AbilitySpellmaker, game: Game) {
    const attach = moveAttachment as SpellmakerCreateToolMoveAttachmentAttach;
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    const startPaintPos: Position = {
        x: paintPos.x + attach.center.x,
        y: paintPos.y + attach.center.y,
    }
    const endPaintPos: Position = {
        x: paintPos.x + attach.attachCenter.x,
        y: paintPos.y + attach.attachCenter.y,
    }
    ctx.beginPath();
    ctx.moveTo(startPaintPos.x, startPaintPos.y);
    ctx.lineTo(endPaintPos.x, endPaintPos.y);
    ctx.stroke();
}

function getMoveAttachment(createObject: SpellmakerCreateToolObjectData, preStageAbilityObject: AbilitySpellmakerObject | undefined, stageId: number, castPosition: Position, game: Game): SpellmakerCreateObjectMoveAttachmentAttach {
    const attach = createObject.moveAttachment as SpellmakerCreateToolMoveAttachmentAttach;
    const isPlayerCast = !preStageAbilityObject;
    const isPlayerCenter = isPlayerCast && attach.refIndex === -1;
    const stageIdRef = isPlayerCenter ? undefined : (isPlayerCast || attach.refIndex !== -1 ? stageId : preStageAbilityObject.stageId);
    const stageIndexRef = isPlayerCenter ? undefined : (isPlayerCast || attach.refIndex !== -1 ? attach.refIndex : preStageAbilityObject.stageIndex);
    const moveAttach: SpellmakerCreateObjectMoveAttachmentAttach = {
        type: SPELLMAKER_TOOL_ATTACH,
        stageIdRef: stageIdRef,
        stageIndexRef: stageIndexRef,
        relativeOffset: { x: attach.relativeOffset.x, y: attach.relativeOffset.y },
    };
    return moveAttach;
}

function getMoveAttachmentNextMoveByAmount(moveAttach: SpellmakerCreateToolMoveAttachment, abilityObject: AbilitySpellmakerObject, game: Game): Position {
    const attach = moveAttach as SpellmakerCreateObjectMoveAttachmentAttach;
    let attachPosition: Position = { x: 0, y: 0 };
    if (attach.stageIdRef === undefined || attach.stageIndexRef === undefined) {
        if (abilityObject.abilityIdRef === undefined) return { x: 0, y: 0 };
        const owner = findAbilityOwnerById(abilityObject.abilityIdRef, game);
        if (owner === undefined) {
            return { x: 0, y: 0 };
        }
        attachPosition = { x: owner.x, y: owner.y };
    } else if (!attach.refNotFound) {
        const centerObject = game.state.abilityObjects.find((o) => {
            const stageIdRef = (o as any).stageId;
            if (stageIdRef === attach.stageIdRef) {
                const stageIndexRef = (o as any).stageIndex;
                if (stageIndexRef === attach.stageIndexRef) return true;
            }
            return false;
        });
        if (centerObject) attachPosition = { x: centerObject.x, y: centerObject.y }
        else {
            attach.refNotFound = true;
        };
    }
    const newPosition: Position = { x: attachPosition.x - attach.relativeOffset.x, y: attachPosition.y - attach.relativeOffset.y };
    return { x: newPosition.x - abilityObject.x, y: newPosition.y - abilityObject.y };
}
