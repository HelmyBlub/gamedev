import { UpgradeOptionAndProbability, AbilityUpgradeOption } from "../../character/upgrade.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS, AbilityMusicSheets } from "./abilityMusicSheet.js";

export type AbilityMusicSheetUpgradeCrit = AbilityUpgrade & {
    noteCounter: number,
}

export const ABILITY_MUSIC_SHEET_UPGRADE_CRIT = "Crit";
const FACTOR_PER_LEVEL = 2;

export function addAbilityMusicSheetUpgradeCrit() {
    ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS[ABILITY_MUSIC_SHEET_UPGRADE_CRIT] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getMoreInfoIncreaseOneLevelText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
        reset: reset,
    }
}

export function getAbilityMusicSheetsUpgradeCritDamageFactor(ability: AbilityMusicSheets): number {
    const up: AbilityMusicSheetUpgradeCrit = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_CRIT];
    if (!up) return 1;
    up.noteCounter++;
    if (up.noteCounter > 1) {
        up.noteCounter = 0;
        return up.level * FACTOR_PER_LEVEL + 1;
    }
    return 1;
}

function reset(ability: Ability) {
    const up: AbilityMusicSheetUpgradeCrit = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_CRIT];
    if (!up) return;
    up.noteCounter = 0;
}

function getOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_MUSIC_SHEET_UPGRADE_CRIT);
    options[0].option.displayMoreInfoText = getAbilityUpgradeUiTextLong(ability);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption) {
    const musicSheet = ability as AbilityMusicSheets;
    let up: AbilityMusicSheetUpgradeCrit;
    if (musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_CRIT] === undefined) {
        up = { level: 0, noteCounter: 0 };
        musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_CRIT] = up;
    } else {
        up = musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_CRIT];
    }
    up.level++;
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityMusicSheetUpgradeCrit = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_CRIT];
    return `${ABILITY_MUSIC_SHEET_UPGRADE_CRIT}: Level ${up.level}`;
}

function getAbilityUpgradeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityMusicSheetUpgradeCrit | undefined = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_CRIT];
    if (upgrade) {
        textLines.push(
            `Every second note does increased damage.`,
            `Increase bonus damage from ${upgrade.level * 100 * FACTOR_PER_LEVEL}% to ${(upgrade.level + 1) * 100 * FACTOR_PER_LEVEL}%.`,
            `Also affects upgrade "Damage Over Time".`,
        );
    } else {
        textLines.push(
            `Every second note does ${100 * FACTOR_PER_LEVEL}% more damage.`,
            `Also affects upgrade "Damage Over Time".`,
        );
    }
    return textLines;
}
