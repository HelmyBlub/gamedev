import { Ability, AbilityOwner } from "../../../ability/ability.js";
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
}

export type SpellmakerToolFunctions = {
    calculateManaCost?: (createObject: SpellmakerCreateToolObjectData) => number,
    calculateDistance?: (relativePosition: Position, createObject: SpellmakerCreateToolObjectData) => number,
    onKeyDown?: (tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) => void,
    onKeyUp?: (tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) => void,
    onTick?: (tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game) => void,
    paint: (ctx: CanvasRenderingContext2D, createObject: SpellmakerCreateToolObjectData, ownerPaintPos: Position, ability: AbilitySpellmaker, game: Game) => void,
    spellCast?: (createObject: SpellmakerCreateToolObjectData, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPosition: Position, game: Game) => void,
    getMoveAttachment?: (createObject: SpellmakerCreateToolObjectData, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPosition: Position, game: Game) => SpellmakerCreateToolMoveAttachment,
}

export type SpellmakerToolsFunctions = {
    [key: string]: SpellmakerToolFunctions,
}

export const SPELLMAKER_TOOLS_FUNCTIONS: SpellmakerToolsFunctions = {};