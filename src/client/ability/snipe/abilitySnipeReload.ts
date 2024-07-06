import { getNextId } from "../../game.js";
import { IdCounter, Game, Position } from "../../gameModel.js";
import { playerInputBindingToDisplayValue } from "../../playerInput.js";
import { MoreInfoPart, createMoreInfosPart } from "../../moreInfo.js";
import { ABILITIES_FUNCTIONS, ABILITY_DEFAULT_SMALL_GROUP, Ability, AbilityOwner, getAbilityNameUiText, paintAbilityUiDefault } from "../ability.js";
import { ABILITY_NAME_SNIPE, AbilitySnipe, abilitySnipeReload, IMAGE_NAME_RELOAD } from "./abilitySnipe.js";

export type AbilitySnipeReload = Ability & {
}

export const ABILITY_NAME_SNIPE_RELOAD = "Reload";
export function addAbilitySnipeReload() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_SNIPE_RELOAD] = {
        activeAbilityCast: castReload,
        createAbility: createAbility,
        createAbilityMoreInfos: createAbilityMoreInfos,
        paintAbilityUI: paintAbilityUI,
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

function paintAbilityUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    paintAbilityUiDefault(ctx, ability, drawStartX, drawStartY, size, game, IMAGE_NAME_RELOAD);
}

function castReload(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, castPositionRelativeToCharacter: Position | undefined, isKeydown: boolean, game: Game) {
    if (!isKeydown) return;
    if (!abilityOwner.abilities) return;
    for (let abilityIter of abilityOwner.abilities) {
        if (abilityIter.name === ABILITY_NAME_SNIPE) {
            const snipe = abilityIter as AbilitySnipe;
            abilitySnipeReload(snipe, game.state.time);
        }
    }
}

function createAbilityMoreInfos(ctx: CanvasRenderingContext2D, ability: Ability, game: Game): MoreInfoPart {
    const abilitySpeedBoost = ability as AbilitySnipeReload;
    const textLines: string[] = getAbilityNameUiText(ability);
    textLines.push(
        `Key: ${playerInputBindingToDisplayValue(abilitySpeedBoost.playerInputBinding!, game)}`,
    );

    return createMoreInfosPart(ctx, textLines, ABILITY_DEFAULT_SMALL_GROUP);
}