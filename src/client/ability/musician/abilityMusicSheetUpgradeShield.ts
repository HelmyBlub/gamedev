import { characterAddShield } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { UpgradeOptionAndProbability, AbilityUpgradeOption } from "../../character/upgrade.js";
import { Ability, AbilityOwner } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS, AbilityMusicSheets } from "./abilityMusicSheet.js";

export type AbilityMusicSheetUpgradeShield = AbilityUpgrade & {
    lastShieldGainTime?: number,
}

export const ABILITY_MUSIC_SHEET_UPGRADE_SHIELD = "Shield Gain";
const SHIELD_GAIN_AMOUNT_PER_LEVEL = 50;
const SHIELD_GAIN_INTERVAL = 4000;

export function addAbilityMusicSheetUpgradeShield() {
    ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS[ABILITY_MUSIC_SHEET_UPGRADE_SHIELD] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getMoreInfoIncreaseOneLevelText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
        reset: reset,
    }
}

export function executeAbilityMusicSheetsUpgradeShield(ability: AbilityMusicSheets, abilityOwner: AbilityOwner, gameTime: number) {
    const up: AbilityMusicSheetUpgradeShield = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_SHIELD];
    if (!up) return 0;
    if (up.lastShieldGainTime === undefined || up.lastShieldGainTime <= gameTime) {
        up.lastShieldGainTime = gameTime + SHIELD_GAIN_INTERVAL;
        characterAddShield(abilityOwner as Character, up.level * SHIELD_GAIN_AMOUNT_PER_LEVEL);
    }
}

function reset(ability: Ability) {
    const up: AbilityMusicSheetUpgradeShield = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_SHIELD];
    if (!up) return;
    up.lastShieldGainTime = undefined;

}

function getOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_MUSIC_SHEET_UPGRADE_SHIELD);
    options[0].option.displayMoreInfoText = getAbilityUpgradeUiTextLong(ability);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption) {
    const musicSheet = ability as AbilityMusicSheets;
    let up: AbilityMusicSheetUpgradeShield;
    if (musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_SHIELD] === undefined) {
        up = { level: 0 };
        musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_SHIELD] = up;
    } else {
        up = musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_SHIELD];
    }
    up.level++;
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityMusicSheetUpgradeShield = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_SHIELD];
    return `${ABILITY_MUSIC_SHEET_UPGRADE_SHIELD}: ${up.level}`;
}

function getAbilityUpgradeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityMusicSheetUpgradeShield | undefined = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_SHIELD];
    if (upgrade) {
        textLines.push(
            `Gain shield when note played.`,
            `Cooldown of ${(SHIELD_GAIN_INTERVAL / 1000).toFixed(0)}s.`,
            `Increase shield amount from ${SHIELD_GAIN_AMOUNT_PER_LEVEL * upgrade.level} to ${SHIELD_GAIN_AMOUNT_PER_LEVEL * (upgrade.level + 1)}.`,
        );
    } else {
        textLines.push(
            `Gain ${SHIELD_GAIN_AMOUNT_PER_LEVEL} shield when note played.`,
            `Cooldown of ${(SHIELD_GAIN_INTERVAL / 1000).toFixed(0)}s.`,
        );
    }
    return textLines;
}
