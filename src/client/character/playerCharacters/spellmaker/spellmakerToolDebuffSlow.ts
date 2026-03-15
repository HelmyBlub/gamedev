import { AbilityOwner } from "../../../ability/ability.js";
import { calculateDirection, calculateDistance, findClientInfoByCharacterId } from "../../../game.js";
import { Position, Game, ClientInfo } from "../../../gameModel.js";
import { AbilitySpellmaker, AbilitySpellmakerObject, SpellmakerCreateToolMoveAttachment as SpellmakerCreateToolDebuffAttachment, SpellmakerCreateToolObjectData } from "./abilitySpellmaker.js";
import { SPELLMAKER_DEBUFF_TOOLS_FUNCTIONS, SpellmakerCreateTool } from "./spellmakerTool.js";
import { createDebuffSlow } from "../../../debuff/debuffSlow.js";
import { Debuff } from "../../../debuff/debuff.js";
import { IMAGE_ATTACH } from "./spellmakerToolAttach.js";
import { GAME_IMAGES } from "../../../imageLoad.js";

export type SpellmakerCreateToolDebuffAttachmentSlow = SpellmakerCreateToolDebuffAttachment & {
    startPosition: Position,
    slowAmount: number,
}

export type SpellmakerCreateToolDebuffSlow = SpellmakerCreateTool & {
    workInProgress?: SpellmakerCreateToolDebuffAttachmentSlow,
}

export const SPELLMAKER_TOOL_DEBUFF_SLOW = "Slow";
const IMAGE_SLOW_ICON = "slugIcon";
GAME_IMAGES[IMAGE_SLOW_ICON] = {
    imagePath: "/images/slugIcon.png",
    spriteRowHeights: [],
    spriteRowWidths: [],
};

export function addSpellmakerToolDebuffSlow() {
    SPELLMAKER_DEBUFF_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_DEBUFF_SLOW] = {
        createTool: createTool,
        onKeyDown: onKeyDown,
        onKeyUp: onKeyUp,
        onTick: onTick,
        paint: paint,
        getDebuffAttachment: getDebuffAttachment,
        getDebuff: getDebuff,
        description: [
            "Debuff Tool: Slow",
            "Attaches to close object",
            "Damage applies slow to enemy",
        ],
        learnedThroughUpgrade: true,
    };
}


function onKeyDown(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, attachedToTarget: SpellmakerCreateToolObjectData, castPositionRelativeToCharacter: Position, game: Game) {
    const moveTool = tool as SpellmakerCreateToolDebuffSlow;
    const debuffAttachmentSLow: SpellmakerCreateToolDebuffAttachmentSlow = {
        type: SPELLMAKER_TOOL_DEBUFF_SLOW,
        startPosition: { x: castPositionRelativeToCharacter.x, y: castPositionRelativeToCharacter.y },
        slowAmount: 1,
    }
    moveTool.workInProgress = debuffAttachmentSLow;
}

function createTool(ctx: CanvasRenderingContext2D): SpellmakerCreateTool {
    return {
        type: SPELLMAKER_TOOL_DEBUFF_SLOW,
        subType: "debuff",
        level: 0,
        totalDamage: 0,
        buttonImage: IMAGE_SLOW_ICON,
    };
}

function onKeyUp(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game): SpellmakerCreateToolDebuffAttachment | undefined {
    const moveTool = tool as SpellmakerCreateToolDebuffSlow;
    if (moveTool.workInProgress) {
        const slow = moveTool.workInProgress as SpellmakerCreateToolDebuffAttachmentSlow;
        slow.slowAmount = Math.max(1.1, Math.min((1 + calculateDistance(slow.startPosition, castPositionRelativeToCharacter) / 200)), 3);
        moveTool.workInProgress = undefined;
        return slow;
    }
    return undefined;
}

function onTick(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game) {
    const clientInfo: ClientInfo | undefined = findClientInfoByCharacterId(abilityOwner.id, game);
    if (clientInfo) {
        const moveTool = tool as SpellmakerCreateToolDebuffSlow;
        if (moveTool.workInProgress) {
            const slow = moveTool.workInProgress as SpellmakerCreateToolDebuffAttachmentSlow;
            const relativPos: Position = {
                x: clientInfo.lastMousePosition.x - abilityOwner.x,
                y: clientInfo.lastMousePosition.y - abilityOwner.y,
            };
            slow.slowAmount = Math.max(1.1, Math.min((1 + calculateDistance(slow.startPosition, relativPos) / 200)), 3);
        }
    }
}

function paint(ctx: CanvasRenderingContext2D, debuffAttachment: SpellmakerCreateToolDebuffAttachment, paintPos: Position, ability: AbilitySpellmaker, game: Game) {
    const slow = debuffAttachment as SpellmakerCreateToolDebuffAttachmentSlow;
    ctx.fillStyle = "black";
    ctx.font = "20px Arial";
    ctx.fillText("slow", paintPos.x + slow.startPosition.x, paintPos.y + slow.startPosition.y);
}

function getDebuffAttachment(createObject: SpellmakerCreateToolObjectData, game: Game): SpellmakerCreateToolDebuffAttachment {
    const slow = createObject.debuffAttachment as SpellmakerCreateToolDebuffAttachmentSlow;
    const slowAttach: SpellmakerCreateToolDebuffAttachmentSlow = {
        slowAmount: slow.slowAmount,
        startPosition: { x: 0, y: 0 },
        type: SPELLMAKER_TOOL_DEBUFF_SLOW,
    };
    return slowAttach;
}

function getDebuff(debuffAttach: SpellmakerCreateToolDebuffAttachment, abilityObject: AbilitySpellmakerObject, game: Game): Debuff {
    const seeker = debuffAttach as SpellmakerCreateToolDebuffAttachmentSlow;
    return createDebuffSlow(seeker.slowAmount, 2000, game.state.time);
}
