import { getNextId } from "../../game.js";
import { IdCounter, Game, Position } from "../../gameModel.js";
import { playerInputBindingToDisplayValue } from "../../playerInput.js";
import { MoreInfoPart, createMoreInfosPart } from "../../moreInfo.js";
import { ABILITIES_FUNCTIONS, ABILITY_DEFAULT_SMALL_GROUP, Ability, AbilityOwner, getAbilityNameUiText } from "../ability.js";
import { ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS, ABILITY_NAME_MUSIC_SHEET, AbilityMusicSheets, AbilityUpgradeFunctionsMusicSheets, abilityMusicSheetsDeleteNoteClick } from "./abilityMusicSheet.js";

export type AbilityMusicSheetDeleteNote = Ability & {
}

export const ABILITY_NAME_MUSIC_SHEET_DELETE_NOTE = "Delete Note";
export function addAbilityMusicSheetDeleteNote() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_MUSIC_SHEET_DELETE_NOTE] = {
        activeAbilityCast: castDeleteNote,
        createAbility: createAbility,
        createAbilityMoreInfos: createAbilityMoreInfos,
    };
}
export function createAbility(idCounter: IdCounter, playerInputBinding?: string): AbilityMusicSheetDeleteNote {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_MUSIC_SHEET_DELETE_NOTE,
        playerInputBinding: playerInputBinding,
        passive: false,
        upgrades: {},
        unique: true,
        tradable: true,
    }
}

function castDeleteNote(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, isKeydown: boolean, game: Game) {
    if (!isKeydown) return;
    if (!abilityOwner.abilities) return;
    const abilityMusicSheets: AbilityMusicSheets | undefined = abilityOwner.abilities.find(a => a.name === ABILITY_NAME_MUSIC_SHEET) as AbilityMusicSheets;
    if (!abilityMusicSheets) return;
    abilityMusicSheetsDeleteNoteClick(abilityOwner, abilityMusicSheets, castPosition);

}

function createAbilityMoreInfos(ctx: CanvasRenderingContext2D, ability: Ability, game: Game): MoreInfoPart {
    const abilitySpeedBoost = ability as AbilityMusicSheetDeleteNote;
    const textLines: string[] = getAbilityNameUiText(ability);
    textLines.push(
        `Key: ${playerInputBindingToDisplayValue(abilitySpeedBoost.playerInputBinding!, game)}`,
    );

    return createMoreInfosPart(ctx, textLines, ABILITY_DEFAULT_SMALL_GROUP);
}