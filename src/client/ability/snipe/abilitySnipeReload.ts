import { getNextId } from "../../game.js";
import { IdCounter, Game, Position } from "../../gameModel.js";
import { playerInputBindingToDisplayValue } from "../../playerInput.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner, getAbilityNameUiText, paintDefaultAbilityStatsUI } from "../ability.js";
import { ABILITY_NAME_SNIPE, AbilitySnipe, abilitySnipeReload } from "./abilitySnipe.js";

export type AbilitySnipeReload = Ability & {
}

export const ABILITY_NAME_SNIPE_RELOAD = "Reload";
export function addAbilitySnipeReload() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_SNIPE_RELOAD] = {
        activeAbilityCast: castReload,
        createAbility: createAbility,
        paintAbilityStatsUI: paintAbilityStatsUI,
    };
}
export function createAbility(idCounter: IdCounter, playerInputBinding?: string): AbilitySnipeReload {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_SNIPE_RELOAD,
        playerInputBinding: playerInputBinding,
        passive: false,
        upgrades: {},
        unique: true,
        tradable: true,
    }
}

function castReload(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, isKeydown: boolean, game: Game) {
    if(!isKeydown) return;
    if(!abilityOwner.abilities) return;
    for(let abilityIter of abilityOwner.abilities){
        if(abilityIter.name === ABILITY_NAME_SNIPE){
            const snipe = abilityIter as AbilitySnipe;
            abilitySnipeReload(snipe, game.state.time);
        }
    }
}

function paintAbilityStatsUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, game: Game): { width: number, height: number } {
    const abilitySpeedBoost = ability as AbilitySnipeReload;
    const textLines: string[] = getAbilityNameUiText(ability);
    textLines.push(
        `Key: ${playerInputBindingToDisplayValue(abilitySpeedBoost.playerInputBinding!, game)}`,
    );

    return paintDefaultAbilityStatsUI(ctx, textLines, drawStartX, drawStartY);
}