import { Ability, AbilityObject, AbilityOwner } from "../../../ability/ability.js";
import { deepCopy } from "../../../game.js";
import { Game, Position } from "../../../gameModel.js";
import { AbilitySpellmaker, SpellmakerCreateToolMoveAttachment, SpellmakerCreateToolObjectData } from "./abilitySpellmaker.js";

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
}

export type SpellmakerMoveToolFunctions = {
    calculateManaCost?: (createObject: SpellmakerCreateToolObjectData) => number,
    getMoveAttachment: (createObject: SpellmakerCreateToolObjectData, castPosition: Position, game: Game) => SpellmakerCreateToolMoveAttachment,
    getMoveAttachmentNextMoveByAmount: (moveAttach: SpellmakerCreateToolMoveAttachment, abilityObject: AbilityObject, game: Game) => Position,
    onKeyDown: (tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) => void,
    onKeyUp: (tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) => SpellmakerCreateToolMoveAttachment | undefined,
    onTick: (tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game) => void,
    paint: (ctx: CanvasRenderingContext2D, moveAttachment: SpellmakerCreateToolMoveAttachment, ownerPaintPos: Position, ability: AbilitySpellmaker, game: Game) => void,
}

export type SpellmakerToolFunctions = {
    calculateManaCost?: (createObject: SpellmakerCreateToolObjectData) => number,
    calculateDistance?: (relativePosition: Position, createObject: SpellmakerCreateToolObjectData) => number,
    onKeyDown?: (tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) => void,
    onKeyUp?: (tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) => SpellmakerCreateToolObjectData | undefined,
    onTick?: (tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game) => void,
    paint?: (ctx: CanvasRenderingContext2D, createObject: SpellmakerCreateToolObjectData, ownerPaintPos: Position, ability: AbilitySpellmaker, game: Game) => void,
    spellCast?: (createObject: SpellmakerCreateToolObjectData, level: number, faction: string, abilityId: number, castPosition: Position, game: Game) => void,
    onToolSelect?: (tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game) => boolean, // return false if it should no be selectable
    canHaveNextStage?: boolean,
    canHaveMoveAttachment?: boolean,
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

export function addSpellmakerToolsDefault() {
    SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_SWITCH_STAGE] = {
        onToolSelect: onToolSelectStaging,
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

function onToolSelectStaging(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game): boolean {
    ability.spellmakeStage += 1;
    let highestStage = getHighestStageRecusive(ability.createdObjects);
    if (highestStage < ability.spellmakeStage) ability.spellmakeStage = 0;
    console.log(`stage ${ability.spellmakeStage}`);
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
