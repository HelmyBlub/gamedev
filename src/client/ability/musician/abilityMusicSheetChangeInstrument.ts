import { getNextId } from "../../game.js";
import { IdCounter, Game, Position } from "../../gameModel.js";
import { playerInputBindingToDisplayValue } from "../../playerInput.js";
import { MoreInfoPart, createMoreInfosPart } from "../../moreInfo.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner, getAbilityNameUiText } from "../ability.js";
import { ABILITY_NAME_MUSIC_SHEET, AbilityMusicSheets } from "./abilityMusicSheet.js";

export type AbilityMusicSheetChangeInstrument = Ability & {
}

export const ABILITY_NAME_MUSIC_SHEET_CHANGE_INSTRUMENT = "Change Instrument";
export function addAbilityMusicSheetChangeInstrument() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_MUSIC_SHEET_CHANGE_INSTRUMENT] = {
        activeAbilityCast: castInstrumentChange,
        createAbility: createAbility,
        createAbilityMoreInfos: createAbilityMoreInfos,
    };
}
export function createAbility(idCounter: IdCounter, playerInputBinding?: string): AbilityMusicSheetChangeInstrument {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_MUSIC_SHEET_CHANGE_INSTRUMENT,
        playerInputBinding: playerInputBinding,
        passive: false,
        upgrades: {},
        unique: true,
        tradable: true,
    }
}

function castInstrumentChange(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, isKeydown: boolean, game: Game) {
    if (!isKeydown) return;
    if (!abilityOwner.abilities) return;
    for (let abilityIter of abilityOwner.abilities) {
        if (abilityIter.name === ABILITY_NAME_MUSIC_SHEET) {
            const musicSheets = abilityIter as AbilityMusicSheets;
            const instruments = Object.keys(musicSheets.upgrades);
            if (instruments.length > 1) {
                const currentIndex = instruments.findIndex(i => i === musicSheets.selectedInstrument);
                if (currentIndex > -1) {
                    musicSheets.selectedInstrument = instruments[(currentIndex + 1) % instruments.length];
                }
            }
        }
    }
}

function createAbilityMoreInfos(ctx: CanvasRenderingContext2D, ability: Ability, game: Game): MoreInfoPart {
    const abilitySpeedBoost = ability as AbilityMusicSheetChangeInstrument;
    const textLines: string[] = getAbilityNameUiText(ability);
    textLines.push(
        `Key: ${playerInputBindingToDisplayValue(abilitySpeedBoost.playerInputBinding!, game)}`,
    );

    return createMoreInfosPart(ctx, textLines);
}