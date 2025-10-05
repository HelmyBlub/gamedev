import { ABILITIES_FUNCTIONS, Ability, ABILITY_DEFAULT_SMALL_GROUP, AbilityOwner, getAbilityNameUiText, paintAbilityUiDefault } from "../../../ability/ability.js";
import { IMAGE_NAME_SWITCH } from "../../../ability/musician/abilityMusicSheetChangeInstrument.js";
import { getNextId } from "../../../game.js";
import { Game, IdCounter, Position } from "../../../gameModel.js";
import { playerInputBindingToDisplayValue } from "../../../input/playerInput.js";
import { MoreInfoPart, createMoreInfosPart } from "../../../moreInfo.js";
import { ABILITY_NAME_SPELLMAKER, AbilitySpellmaker } from "./abilitySpellmaker.js";

export type AbilitySpellmakerReset = Ability & {
}

export const ABILITY_NAME_SPELLMAKER_RESET = "Spellmaker Reset";

export function addAbilitySpellmakerReset() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_SPELLMAKER_RESET] = {
        activeAbilityCast: castAbility,
        createAbility: createAbility,
        createAbilityMoreInfos: createAbilityMoreInfos,
        paintAbilityUI: paintAbilityUI,
        positionNotRquired: true,
    };
}
export function createAbility(idCounter: IdCounter, playerInputBinding?: string): AbilitySpellmakerReset {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_SPELLMAKER_RESET,
        playerInputBinding: playerInputBinding,
        passive: false,
        upgrades: {},
        unique: true,
        tradable: true,
    }
}

function paintAbilityUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    paintAbilityUiDefault(ctx, ability, drawStartX, drawStartY, size, game, IMAGE_NAME_SWITCH);
}

function castAbility(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, castPositionRelativeToCharacter: Position | undefined, isKeydown: boolean, game: Game) {
    if (!isKeydown) return;
    if (!abilityOwner.abilities) return;
    for (let abilityIter of abilityOwner.abilities) {
        if (abilityIter.name === ABILITY_NAME_SPELLMAKER) {
            const spellmaker = abilityIter as AbilitySpellmaker;
            spellmaker.fireLines = [{ moveToPositions: [], positions: [] }];
        }
    }
}

function createAbilityMoreInfos(ctx: CanvasRenderingContext2D, ability: Ability, game: Game): MoreInfoPart {
    const abilityReset = ability as AbilitySpellmakerReset;
    const textLines: string[] = getAbilityNameUiText(ability);
    textLines.push(
        `Key: ${playerInputBindingToDisplayValue(abilityReset.playerInputBinding!, game)}`,
    );

    return createMoreInfosPart(ctx, textLines, ABILITY_DEFAULT_SMALL_GROUP);
}