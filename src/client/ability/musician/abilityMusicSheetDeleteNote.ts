import { getNextId } from "../../game.js";
import { IdCounter, Game, Position } from "../../gameModel.js";
import { PlayerAbilityActionData, playerInputBindingToDisplayValue } from "../../input/playerInput.js";
import { MoreInfoPart, createMoreInfosPart } from "../../moreInfo.js";
import { ABILITIES_FUNCTIONS, ABILITY_DEFAULT_SMALL_GROUP, Ability, AbilityOwner, DefaultAbilityCastData, getAbilityNameUiText, paintAbilityUiDefault } from "../ability.js";
import { ABILITY_NAME_MUSIC_SHEET, AbilityMusicSheets, abilityMusicSheetsDeleteNoteClick } from "./abilityMusicSheet.js";
import { GAME_IMAGES } from "../../imageLoad.js";

export type AbilityMusicSheetDeleteNote = Ability & {
}

export const ABILITY_NAME_MUSIC_SHEET_DELETE_NOTE = "Delete Note";
export const IMAGE_NAME_DELETE = "delete";
GAME_IMAGES[IMAGE_NAME_DELETE] = {
    imagePath: "/images/delete.png",
    spriteRowHeights: [40],
    spriteRowWidths: [40],
};

export function addAbilityMusicSheetDeleteNote() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_MUSIC_SHEET_DELETE_NOTE] = {
        activeAbilityCast: castDeleteNote,
        createAbility: createAbility,
        createAbilityMoreInfos: createAbilityMoreInfos,
        paintAbilityUI: paintAbilityUI,
        sendRelativeCastPosition: true,
        omitCastPosition: true,
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

function paintAbilityUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    paintAbilityUiDefault(ctx, ability, drawStartX, drawStartY, size, game, IMAGE_NAME_DELETE);
}

function castDeleteNote(abilityOwner: AbilityOwner, ability: Ability, data: PlayerAbilityActionData, game: Game) {
    const castPositionRelativeToCharacter = (data as DefaultAbilityCastData).castPositionRelativeToCharacter;
    if (!data.isKeydown || !castPositionRelativeToCharacter) return;
    if (!abilityOwner.abilities) return;
    const abilityMusicSheets: AbilityMusicSheets | undefined = abilityOwner.abilities.find(a => a.name === ABILITY_NAME_MUSIC_SHEET) as AbilityMusicSheets;
    if (!abilityMusicSheets) return;
    const fixedCastPosition = {
        x: abilityOwner.x + castPositionRelativeToCharacter.x,
        y: abilityOwner.y + castPositionRelativeToCharacter.y,
    }
    abilityMusicSheetsDeleteNoteClick(abilityOwner, abilityMusicSheets, fixedCastPosition, game);
}

function createAbilityMoreInfos(ctx: CanvasRenderingContext2D, ability: Ability, game: Game): MoreInfoPart {
    const abilitySpeedBoost = ability as AbilityMusicSheetDeleteNote;
    const textLines: string[] = getAbilityNameUiText(ability);
    textLines.push(
        `Key: ${playerInputBindingToDisplayValue(abilitySpeedBoost.playerInputBinding!, game)}`,
    );

    return createMoreInfosPart(ctx, textLines, ABILITY_DEFAULT_SMALL_GROUP);
}