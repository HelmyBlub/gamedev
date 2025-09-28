import { ABILITIES_FUNCTIONS, Ability, ABILITY_DEFAULT_SMALL_GROUP, AbilityOwner, getAbilityNameUiText, paintAbilityUiDefault } from "../../../ability/ability.js";
import { IMAGE_NAME_SWITCH } from "../../../ability/musician/abilityMusicSheetChangeInstrument.js";
import { getNextId } from "../../../game.js";
import { Game, IdCounter, Position } from "../../../gameModel.js";
import { playerInputBindingToDisplayValue } from "../../../input/playerInput.js";
import { MoreInfoPart, createMoreInfosPart } from "../../../moreInfo.js";
import { ABILITY_NAME_SPELLMAKER, AbilitySpellmaker } from "./abilitySpellmaker.js";

export type AbilitySpellmakerChangeMode = Ability & {
}

export const ABILITY_NAME_SPELLMAKER_CHANGE_MODE = "Change Spellmaker Mode";

export function addAbilitySpellmakerChangeMode() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_SPELLMAKER_CHANGE_MODE] = {
        activeAbilityCast: castAbility,
        createAbility: createAbility,
        createAbilityMoreInfos: createAbilityMoreInfos,
        paintAbilityUI: paintAbilityUI,
        positionNotRquired: true,
    };
}
export function createAbility(idCounter: IdCounter, playerInputBinding?: string): AbilitySpellmakerChangeMode {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_SPELLMAKER_CHANGE_MODE,
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
            spellmaker.mode = spellmaker.mode === "spellcast" ? "spellmake" : "spellcast";
        }
    }
}

function createAbilityMoreInfos(ctx: CanvasRenderingContext2D, ability: Ability, game: Game): MoreInfoPart {
    const abilityChangeMode = ability as AbilitySpellmakerChangeMode;
    const textLines: string[] = getAbilityNameUiText(ability);
    textLines.push(
        `Key: ${playerInputBindingToDisplayValue(abilityChangeMode.playerInputBinding!, game)}`,
    );

    return createMoreInfosPart(ctx, textLines, ABILITY_DEFAULT_SMALL_GROUP);
}