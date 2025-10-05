import { AbilityOwner } from "../../../ability/ability.js";
import { Game, Position } from "../../../gameModel.js";
import { AbilitySpellmaker } from "./abilitySpellmaker.js";

export type SpellmakerToolFunctions = {
    onKeyDown?: (abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) => void,
    onKeyUp?: (abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) => void,
    onTick?: (abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game) => void,
}

export type SpellmakerToolsFunctions = {
    [key: string]: SpellmakerToolFunctions,
}

export const SPELLMAKER_TOOLS_FUNCTIONS: SpellmakerToolsFunctions = {};