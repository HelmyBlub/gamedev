import { ABILITIES_FUNCTIONS, Ability, ABILITY_DEFAULT_SMALL_GROUP, AbilityOwner, getAbilityNameUiText, paintAbilityUiDefault } from "../../../ability/ability.js";
import { IMAGE_NAME_SWITCH } from "../../../ability/musician/abilityMusicSheetChangeInstrument.js";
import { getNextId } from "../../../game.js";
import { Game, IdCounter, Position } from "../../../gameModel.js";
import { PlayerAbilityActionData, playerInputBindingToDisplayValue } from "../../../input/playerInput.js";
import { MoreInfoPart, createMoreInfosPart } from "../../../moreInfo.js";
import { Character } from "../../characterModel.js";
import { ABILITY_NAME_SPELLMAKER, AbilitySpellmaker } from "./abilitySpellmaker.js";

export type AbilitySpellmakerSwitchSpell = Ability & {
}

export const ABILITY_NAME_SPELLMAKER_SWITCH_SPELL = "Switch Spell";

export function addAbilitySpellmakerSwitchSpell() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_SPELLMAKER_SWITCH_SPELL] = {
        activeAbilityCast: castAbility,
        createAbility: createAbility,
        createAbilityMoreInfos: createAbilityMoreInfos,
        paintAbilityUI: paintAbilityUI,
        omitCastPosition: true,
    };
}
export function createAbility(idCounter: IdCounter, playerInputBinding?: string): AbilitySpellmakerSwitchSpell {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_SPELLMAKER_SWITCH_SPELL,
        playerInputBinding: playerInputBinding,
        passive: false,
        upgrades: {},
        unique: true,
        tradable: true,
    }
}

function paintAbilityUI(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    const char = abilityOwner as Character;
    const abilitySmOpt = char.abilities.find(a => a.name === ABILITY_NAME_SPELLMAKER);
    if (!abilitySmOpt) return;
    const abilitySm = abilitySmOpt as AbilitySpellmaker;
    paintAbilityUiDefault(ctx, ability, drawStartX, drawStartY, size, game, IMAGE_NAME_SWITCH, 0, abilitySm.spellIndex + 1);
}

function castAbility(abilityOwner: AbilityOwner, ability: Ability, data: PlayerAbilityActionData, game: Game) {
    if (!data.isKeydown) return;
    if (!abilityOwner.abilities) return;
    for (let abilityIter of abilityOwner.abilities) {
        if (abilityIter.name === ABILITY_NAME_SPELLMAKER) {
            const spellmaker = abilityIter as AbilitySpellmaker;
            spellmaker.spellIndex = (spellmaker.spellIndex + 1) % spellmaker.spells.length;
            if (spellmaker.spells.length > 1) spellmaker.spellmakeStage = 0;
        }
    }
}

function createAbilityMoreInfos(ctx: CanvasRenderingContext2D, ability: Ability, game: Game): MoreInfoPart {
    const abilitySwitch = ability as AbilitySpellmakerSwitchSpell;
    const textLines: string[] = getAbilityNameUiText(ability);
    textLines.push(
        `Key: ${playerInputBindingToDisplayValue(abilitySwitch.playerInputBinding!, game)}`,
    );

    return createMoreInfosPart(ctx, textLines, ABILITY_DEFAULT_SMALL_GROUP);
}