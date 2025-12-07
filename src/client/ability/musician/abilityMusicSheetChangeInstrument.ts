import { getNextId } from "../../game.js";
import { IdCounter, Game, Position } from "../../gameModel.js";
import { PlayerAbilityActionData, playerInputBindingToDisplayValue } from "../../input/playerInput.js";
import { MoreInfoPart, createMoreInfosPart } from "../../moreInfo.js";
import { ABILITIES_FUNCTIONS, ABILITY_DEFAULT_SMALL_GROUP, Ability, AbilityOwner, getAbilityNameUiText, paintAbilityUiDefault } from "../ability.js";
import { ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS, ABILITY_NAME_MUSIC_SHEET, AbilityMusicSheets, AbilityUpgradeFunctionsMusicSheets } from "./abilityMusicSheet.js";
import { GAME_IMAGES } from "../../imageLoad.js";

export type AbilityMusicSheetChangeInstrument = Ability & {
}

export const ABILITY_NAME_MUSIC_SHEET_CHANGE_INSTRUMENT = "Change Instrument";
export const IMAGE_NAME_SWITCH = "switch";
GAME_IMAGES[IMAGE_NAME_SWITCH] = {
    imagePath: "/images/switch.png",
    spriteRowHeights: [40],
    spriteRowWidths: [40],
};

export function addAbilityMusicSheetChangeInstrument() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_MUSIC_SHEET_CHANGE_INSTRUMENT] = {
        activeAbilityCast: castInstrumentChange,
        createAbility: createAbility,
        createAbilityMoreInfos: createAbilityMoreInfos,
        paintAbilityUI: paintAbilityUI,
        omitCastPosition: true,
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

function paintAbilityUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    paintAbilityUiDefault(ctx, ability, drawStartX, drawStartY, size, game, IMAGE_NAME_SWITCH);
}

function castInstrumentChange(abilityOwner: AbilityOwner, ability: Ability, data: PlayerAbilityActionData, game: Game) {
    if (!data.isKeydown) return;
    if (!abilityOwner.abilities) return;
    for (let abilityIter of abilityOwner.abilities) {
        if (abilityIter.name === ABILITY_NAME_MUSIC_SHEET) {
            const musicSheets = abilityIter as AbilityMusicSheets;
            const instruments = Object.keys(musicSheets.upgrades);
            if (instruments.length > 1) {
                const startIndex = instruments.findIndex(i => i === musicSheets.selectedInstrument);
                if (startIndex > -1) {
                    let currentIndex = startIndex;
                    do {
                        currentIndex = (currentIndex + 1) % instruments.length;
                        const instrumentUpgradeFunctions = ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS[instruments[currentIndex]] as AbilityUpgradeFunctionsMusicSheets;
                        if (instrumentUpgradeFunctions.executeNoteDamage) {
                            musicSheets.selectedInstrument = instruments[currentIndex];
                            return;
                        }
                    } while (currentIndex !== startIndex);
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

    return createMoreInfosPart(ctx, textLines, ABILITY_DEFAULT_SMALL_GROUP);
}