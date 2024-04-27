import { UpgradeOptionAndProbability, AbilityUpgradeOption } from "../../character/upgrade.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS, AbilityMusicSheets } from "./abilityMusicSheet.js";

export type AbilityMusicSheetUpgradeSize = AbilityUpgrade & {
    areaFactor: number
}

export const ABILITY_MUSIC_SHEET_UPGRADE_SIZE = "Effect Size";

export function addAbilityMusicSheetUpgradeSize() {
    ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS[ABILITY_MUSIC_SHEET_UPGRADE_SIZE] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getMoreInfoText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
        reset: reset,
    }
}

export function getAbilityMusicSheetsUpgradeAreaFactor(ability: AbilityMusicSheets): number {
    const up: AbilityMusicSheetUpgradeSize = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_SIZE];
    if (!up) return 1;
    return up.areaFactor;
}

function reset(ability: Ability) {
}

function getOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_MUSIC_SHEET_UPGRADE_SIZE);
    options[0].option.displayMoreInfoText = getAbilityUpgradeUiTextLong(ability);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption) {
    const musicSheet = ability as AbilityMusicSheets;
    let up: AbilityMusicSheetUpgradeSize;
    if (musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_SIZE] === undefined) {
        up = { level: 0, areaFactor: 1 };
        musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_SIZE] = up;
    } else {
        up = musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_SIZE];
    }
    up.level++;
    up.areaFactor++;
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityMusicSheetUpgradeSize = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_SIZE];
    return `${ABILITY_MUSIC_SHEET_UPGRADE_SIZE}: ${up.level}`;
}

function getAbilityUpgradeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityMusicSheetUpgradeSize | undefined = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_SIZE];
    if (upgrade) {
        textLines.push(
            `Increase effect size further.`,
        );
    } else {
        textLines.push(
            `Increase effect size.`,
        );
    }
    return textLines;
}
