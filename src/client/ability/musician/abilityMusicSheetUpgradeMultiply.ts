import { UpgradeOptionAndProbability, AbilityUpgradeOption } from "../../character/upgrade.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS, AbilityMusicSheets } from "./abilityMusicSheet.js";

export type AbilityMusicSheetUpgradeMultiply = AbilityUpgrade & {
}

export const ABILITY_MUSIC_SHEET_UPGRADE_MULTIPLY = "Multiply";

export function addAbilityMusicSheetUpgradeMultiply() {
    ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS[ABILITY_MUSIC_SHEET_UPGRADE_MULTIPLY] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getMoreInfoIncreaseOneLevelText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
        reset: reset,
    }
}

export function getAbilityMusicSheetsUpgradeMultiplyAmount(ability: AbilityMusicSheets): number {
    const up: AbilityMusicSheetUpgradeMultiply = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_MULTIPLY];
    if (!up) return 1;
    return up.level + 1;
}

function reset(ability: Ability) {
}

function getOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_MUSIC_SHEET_UPGRADE_MULTIPLY);
    options[0].option.displayMoreInfoText = getAbilityUpgradeUiTextLong(ability);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption) {
    const musicSheet = ability as AbilityMusicSheets;
    let up: AbilityMusicSheetUpgradeMultiply;
    if (musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_MULTIPLY] === undefined) {
        up = { level: 0 };
        musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_MULTIPLY] = up;
    } else {
        up = musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_MULTIPLY];
    }
    up.level++;
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityMusicSheetUpgradeMultiply = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_MULTIPLY];
    return `${ABILITY_MUSIC_SHEET_UPGRADE_MULTIPLY}: ${up.level}`;
}

function getAbilityUpgradeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityMusicSheetUpgradeMultiply | undefined = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_MULTIPLY];
    if (upgrade) {
        textLines.push(
            `Increase effect amount further.`,
            `Additional amount increase from ${upgrade.level} to ${(upgrade.level + 1)}.`,
        );
    } else {
        textLines.push(
            `Increase effect amount by 1.`,
        );
    }
    return textLines;
}
