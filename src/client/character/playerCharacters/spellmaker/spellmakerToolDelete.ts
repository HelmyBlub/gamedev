import { AbilityOwner } from "../../../ability/ability.js";
import { Position, Game } from "../../../gameModel.js";
import { AbilitySpellmaker, abilitySpellmakerCalculateManaCostWithLevelFactor, SpellmakerCreateToolObjectData, spellmakerFindClosestAttachToIndex } from "./abilitySpellmaker.js";
import { SPELLMAKER_TOOLS_FUNCTIONS, SpellmakerCreateTool } from "./spellmakerTool.js";
import { IMAGE_EXPLOSION } from "../../enemy/god/abilityTileExplosions.js";
import { GAME_IMAGES } from "../../../imageLoad.js";

export type CreateToolObjectDeleteData = SpellmakerCreateToolObjectData & {
    center: Position,
}

export const SPELLMAKER_TOOL_DELETE = "Delete";
const IMAGE_ICON_ERASER = "iconEraser";
GAME_IMAGES[IMAGE_ICON_ERASER] = {
    imagePath: "/images/eraser.png",
    spriteRowHeights: [],
    spriteRowWidths: [],
};

export function addSpellmakerToolDelete() {
    SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_DELETE] = {
        createTool: createTool,
        onKeyDown: onKeyDown,
        onKeyUp: onKeyUp,
        description: [
            "Tool: Delete",
            "Delete object closest to click",
            "Delete Order:",
            "    1. Debuff Attachment",
            "    2. Move Attachment",
            "    3. Object",
        ],
        learnedThroughUpgrade: false,
        availableFromTheStart: true,
    };
}

function createTool(): SpellmakerCreateTool {
    return {
        type: SPELLMAKER_TOOL_DELETE,
        subType: "default",
        level: 0,
        totalDamage: 0,
        buttonImage: IMAGE_ICON_ERASER,
    };
}

function onKeyDown(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) {
    tool.workInProgress = true;
}

function onKeyUp(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game): SpellmakerCreateToolObjectData | undefined {
    if (tool.workInProgress) {
        const closest = spellmakerFindClosestAttachToIndex(ability, castPositionRelativeToCharacter, "any");
        if (closest) {
            let createdObjects = ability.spells[ability.spellIndex].createdObjects;
            for (let index = 0; index < closest.length - 1; index++) {
                createdObjects = createdObjects[closest[index]].nextStage;
            }
            const currentObjectIndex = closest[closest.length - 1];
            const currentObject = createdObjects[currentObjectIndex];
            if (currentObject.debuffAttachment) {
                currentObject.debuffAttachment = undefined;
            } else if (currentObject.moveAttachment) {
                currentObject.moveAttachment = undefined;
            } else {
                createdObjects.splice(currentObjectIndex, 1);
            }
            abilitySpellmakerCalculateManaCostWithLevelFactor(ability, ability.spells[ability.spellIndex]);
        }
        tool.workInProgress = undefined;
    }
    return undefined;
}
