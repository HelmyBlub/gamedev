import { Character } from "../character/characterModel.js"
import { LevelingCharacter } from "../character/levelingCharacters/levelingCharacterModel.js"
import { Game, Position } from "../gameModel.js"

export type Ability = {
    name: string,
    passive: boolean,
    playerInputBinding?: string,
}

export type AbilityFunctions = {
    tickAbility: (character: Character, ability: Ability, game: Game) => void,
    createAbiltiyUpgradeOptions: () => UpgradeOptionAbility[],
    paintAbility?: (ctx: CanvasRenderingContext2D, character: Character, ability: Ability, cameraPosition: Position) => void,
    activeAbilityCast?: (character: Character,  ability: Ability, castPosition: Position, game: Game) => void,
}

export type AbilitiesFunctions = {
    [key:string]: AbilityFunctions,
}

export type UpgradeOptionAbility = {
    name: string,
    upgrade: (ability: Ability) => void,
}

export const ABILITIES_FUNCTIONS: AbilitiesFunctions = {};

export function addAbilityToCharacter(character: Character, ability: Ability){
    character.abilities.push(ability);
    if(!ability.passive){
        ability.playerInputBinding = "ability1";
    }
}
