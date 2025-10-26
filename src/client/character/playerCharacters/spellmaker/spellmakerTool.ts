import { Ability, AbilityObject, AbilityOwner } from "../../../ability/ability.js";
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
    getMoveAttachment: (createObject: SpellmakerCreateToolObjectData, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPosition: Position, game: Game) => SpellmakerCreateToolMoveAttachment,
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
    spellCast?: (createObject: SpellmakerCreateToolObjectData, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPosition: Position, game: Game) => void,
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

function onToolSelectStaging(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game): boolean {
    ability.spellmakeStage += 1;
    let highestStage = 0;
    for (let createObject of ability.createdObjects) {
        let currentHighestStage = 0;
        let currentObject = createObject;
        let toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[createObject.type];
        while (toolFunctions.canHaveNextStage) {
            currentHighestStage += 1;
            if (currentObject.nextStage) {
                currentObject = currentObject.nextStage;
                toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[createObject.type];
            } else {
                break;
            }
        }
        if (currentHighestStage > highestStage) highestStage = currentHighestStage;
    }
    if (highestStage < ability.spellmakeStage) ability.spellmakeStage = 0;
    console.log(`stage ${ability.spellmakeStage}`);
    return false;
}