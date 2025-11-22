import { Ability, AbilityObject, AbilityOwner } from "../../../ability/ability.js";
import { deepCopy } from "../../../game.js";
import { Game, Position } from "../../../gameModel.js";
import { paintTextWithOutline } from "../../../gamePaint.js";
import { createMoreInfosPart, MoreInfoPart } from "../../../moreInfo.js";
import { AbilitySpellmaker, SPELLMAKER_SPELLTYPE_AUTOCAST, SPELLMAKER_SPELLTYPE_INSTANT, SPELLMAKER_SPELLTYPES, SpellmakerCreateToolMoveAttachment, SpellmakerCreateToolObjectData } from "./abilitySpellmaker.js";

export type SpellmakerCreateToolsData = {
    selectedToolIndex: number,
    position: Position,
    size: number,
    createTools: SpellmakerCreateTool[],
}

export type SpellmakerCreateTool = {
    type: string,
    subType: "default" | "move",
    workInProgress?: any,
    description: MoreInfoPart,
}

export type SpellmakerMoveToolFunctions = {
    calculateManaCost?: (createObject: SpellmakerCreateToolObjectData) => number,
    createTool: (ctx: CanvasRenderingContext2D) => SpellmakerCreateTool,
    getMoveAttachment: (createObject: SpellmakerCreateToolObjectData, castPosition: Position, game: Game) => SpellmakerCreateToolMoveAttachment,
    getMoveAttachmentNextMoveByAmount: (moveAttach: SpellmakerCreateToolMoveAttachment, abilityObject: AbilityObject, game: Game) => Position,
    onKeyDown: (tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) => void,
    onKeyUp: (tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) => SpellmakerCreateToolMoveAttachment | undefined,
    onTick: (tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game) => void,
    paint: (ctx: CanvasRenderingContext2D, moveAttachment: SpellmakerCreateToolMoveAttachment, ownerPaintPos: Position, ability: AbilitySpellmaker, game: Game) => void,
    description: string[],
    learnedThroughUpgrade?: boolean,
}

export type SpellmakerToolFunctions = {
    calculateManaCost?: (createObject: SpellmakerCreateToolObjectData) => number,
    calculateDistance?: (relativePosition: Position, createObject: SpellmakerCreateToolObjectData) => number,
    createTool: (ctx: CanvasRenderingContext2D) => SpellmakerCreateTool,
    onKeyDown?: (tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) => void,
    onKeyUp?: (tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) => SpellmakerCreateToolObjectData | undefined,
    onTick?: (tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game) => void,
    onToolSelect?: (tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game) => boolean, // return false if it should no be selectable
    paint?: (ctx: CanvasRenderingContext2D, createObject: SpellmakerCreateToolObjectData, ownerPaintPos: Position, ability: AbilitySpellmaker, game: Game) => void,
    paintButton?: (ctx: CanvasRenderingContext2D, buttonPaintPos: Position, ability: AbilitySpellmaker, game: Game) => void,
    spellCast?: (createObject: SpellmakerCreateToolObjectData, level: number, faction: string, abilityId: number, castPosition: Position, game: Game) => void,
    calculateManaCostIncludesNextStage?: boolean,
    canHaveNextStage?: boolean,
    canHaveMoveAttachment?: boolean,
    description: string[],
    learnedThroughUpgrade?: boolean,
    availableFromTheStart?: boolean,
    availableOnFirstUpgradeChoice?: boolean,
}

export type SpellmakerToolsFunctions = {
    [key: string]: SpellmakerToolFunctions,
}

export type SpellmakerMoveToolsFunctions = {
    [key: string]: SpellmakerMoveToolFunctions,
}

export const SPELLMAKER_TOOLS_FUNCTIONS: SpellmakerToolsFunctions = {};
export const SPELLMAKER_MOVE_TOOLS_FUNCTIONS: SpellmakerMoveToolsFunctions = {};
export const SPELLMAKER_TOOL_SWITCH_STAGE = "Staging";
export const SPELLMAKER_TOOL_RESET = "Reset";
export const SPELLMAKER_TOOL_NEW = "New Spell";
export const SPELLMAKER_TOOL_DELETE = "Delete Spell";
export const SPELLMAKER_TOOL_SPELL_TYPE = "Change Spell Type";

export function addSpellmakerToolsDefault() {
    SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_SWITCH_STAGE] = {
        onToolSelect: onToolSelectStaging,
        createTool: createToolStage,
        paintButton: paintButtonStage,
        description: [
            "Staging Tool",
            "Change Stage when clicking",
            "Loops over available stages",
            "displays current stage",
        ],
    };
    SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_RESET] = {
        onToolSelect: onToolSelectReset,
        createTool: createToolReset,
        paintButton: paintButtonReset,
        description: [
            "Reset Tool",
            "Resets Current Spell",
            "Displays current spells mana cost",
        ],
        availableFromTheStart: true,
    };
    SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_NEW] = {
        onToolSelect: onToolSelectNew,
        createTool: createToolNew,
        paintButton: paintButtonNew,
        description: [
            "New Spell Tool",
            "Add a new spell",
            "displays current spell count",
        ],
        availableFromTheStart: true,
    };
    SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_DELETE] = {
        onToolSelect: onToolSelectDelete,
        createTool: createToolDelete,
        description: [
            "Delete Tool",
            "Delete current selected spell",
        ],
        availableFromTheStart: true,
    };
    SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_SPELL_TYPE] = {
        onToolSelect: onToolSelectSpellType,
        createTool: createToolSpellType,
        paintButton: paintButtonSpellType,
        description: [
            "Change Spell Type Tool",
            "Switchtes between available spell types",
            `${SPELLMAKER_SPELLTYPES[0].name}: ${SPELLMAKER_SPELLTYPES[0].description}`,
        ],
    };
}

export function spellmakerNextStageSetup(nextStage: SpellmakerCreateToolObjectData[] | undefined, level: number, castOffset: Position): SpellmakerCreateToolObjectData[] {
    if (!nextStage) return [];
    const copy = deepCopy(nextStage) as SpellmakerCreateToolObjectData[];
    for (let object of copy) {
        object.level = level;
        object.castPosOffset = { x: -castOffset.x, y: -castOffset.y };
    }
    return copy;
}

function createToolStage(ctx: CanvasRenderingContext2D): SpellmakerCreateTool {
    return {
        type: SPELLMAKER_TOOL_SWITCH_STAGE,
        subType: "default",
        description: createMoreInfosPart(ctx, SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_SWITCH_STAGE].description),
    };
}

function createToolReset(ctx: CanvasRenderingContext2D): SpellmakerCreateTool {
    return {
        type: SPELLMAKER_TOOL_RESET,
        subType: "default",
        description: createMoreInfosPart(ctx, SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_RESET].description),
    };
}

function createToolNew(ctx: CanvasRenderingContext2D): SpellmakerCreateTool {
    return {
        type: SPELLMAKER_TOOL_NEW,
        subType: "default",
        description: createMoreInfosPart(ctx, SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_NEW].description),
    };
}
function createToolDelete(ctx: CanvasRenderingContext2D): SpellmakerCreateTool {
    return {
        type: SPELLMAKER_TOOL_DELETE,
        subType: "default",
        description: createMoreInfosPart(ctx, SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_DELETE].description),
    };
}

function createToolSpellType(ctx: CanvasRenderingContext2D): SpellmakerCreateTool {
    return {
        type: SPELLMAKER_TOOL_SPELL_TYPE,
        subType: "default",
        description: createMoreInfosPart(ctx, SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_SPELL_TYPE].description),
    };
}

function paintButtonStage(ctx: CanvasRenderingContext2D, buttonPaintPos: Position, ability: AbilitySpellmaker, game: Game) {
    paintTextWithOutline(ctx, "white", "black", ability.spellmakeStage.toString(), buttonPaintPos.x + ability.createTools.size / 2, buttonPaintPos.y + ability.createTools.size * 0.9, true, 1);
}

function paintButtonReset(ctx: CanvasRenderingContext2D, buttonPaintPos: Position, ability: AbilitySpellmaker, game: Game) {
    const manaCost = ability.spells[ability.spellIndex].spellManaCost;
    paintTextWithOutline(ctx, "white", "black", manaCost.toFixed(0), buttonPaintPos.x + ability.createTools.size / 2, buttonPaintPos.y + ability.createTools.size * 0.9, true, 1);
}

function paintButtonNew(ctx: CanvasRenderingContext2D, buttonPaintPos: Position, ability: AbilitySpellmaker, game: Game) {
    paintTextWithOutline(ctx, "white", "black", ability.spells.length.toFixed(), buttonPaintPos.x + ability.createTools.size / 2, buttonPaintPos.y + ability.createTools.size * 0.9, true, 1);
}

function paintButtonSpellType(ctx: CanvasRenderingContext2D, buttonPaintPos: Position, ability: AbilitySpellmaker, game: Game) {
    const spelltype = ability.spells[ability.spellIndex].spellType;
    paintTextWithOutline(ctx, "white", "black", spelltype.substring(0, 2), buttonPaintPos.x + ability.createTools.size / 2, buttonPaintPos.y + ability.createTools.size * 0.9, true, 1);
}

function onToolSelectStaging(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game): boolean {
    ability.spellmakeStage += 1;
    const currentSpell = ability.spells[ability.spellIndex];
    let highestStage = getHighestStageRecusive(currentSpell.createdObjects);
    if (highestStage < ability.spellmakeStage) ability.spellmakeStage = 0;
    return false;
}

function onToolSelectReset(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game): boolean {
    ability.spells[ability.spellIndex].createdObjects = [];
    ability.spells[ability.spellIndex].spellManaCost = 0;
    ability.spellmakeStage = 0;
    return false;
}

function onToolSelectNew(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game): boolean {
    ability.spells.push({ createdObjects: [], spellManaCost: 0, spellType: SPELLMAKER_SPELLTYPE_INSTANT });
    return false;
}

function onToolSelectSpellType(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game): boolean {
    const currentSpell = ability.spells[ability.spellIndex];
    const spellTypeIndex = ability.availableSpellTypes.findIndex(t => t === currentSpell.spellType);
    if (spellTypeIndex === -1) {
        currentSpell.spellType = ability.availableSpellTypes[0];
    } else {
        currentSpell.spellType = ability.availableSpellTypes[(spellTypeIndex + 1) % ability.availableSpellTypes.length];
    }
    if (currentSpell.spellType === SPELLMAKER_SPELLTYPE_AUTOCAST && ability.autoCastSpellIndex === undefined) {
        ability.autoCastSpellIndex = ability.spellIndex;
    } else if (ability.autoCastSpellIndex !== undefined && ability.spells[ability.autoCastSpellIndex].spellType !== SPELLMAKER_SPELLTYPE_AUTOCAST) {
        let foundAutocast = false;
        for (let i = 0; i < ability.spells.length; i++) {
            if (ability.spells[i].spellType === SPELLMAKER_SPELLTYPE_AUTOCAST) {
                foundAutocast = true;
                ability.autoCastSpellIndex = i;
                break;
            }
        }
        if (!foundAutocast) ability.attachToIndex = undefined;
    }
    return false;
}

function onToolSelectDelete(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game): boolean {
    if (ability.spells.length > 1) {
        ability.spells.splice(ability.spellIndex, 1);
    } else {
        onToolSelectReset(tool, abilityOwner, ability, game);
    }
    if (ability.spells.length <= ability.spellIndex) {
        ability.spellIndex = ability.spells.length - 1;
    }
    return false;
}

function getHighestStageRecusive(currentStage: SpellmakerCreateToolObjectData[]): number {
    let currentHighest = 0;
    for (let stageObject of currentStage) {
        if (stageObject.nextStage.length > 0) {
            const result = getHighestStageRecusive(stageObject.nextStage) + 1;
            if (currentHighest < result) currentHighest = result;
        } else {
            const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[stageObject.type];
            if (toolFunctions.canHaveNextStage) {
                currentHighest = 1;
            }
        }
    }
    return currentHighest;
}
