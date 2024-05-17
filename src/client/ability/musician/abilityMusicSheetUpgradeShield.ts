import { characterAddShield } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { UpgradeOptionAndProbability, AbilityUpgradeOption } from "../../character/upgrade.js";
import { Ability, AbilityOwner } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS, AbilityMusicSheets } from "./abilityMusicSheet.js";

export type AbilityMusicSheetUpgradeShield = AbilityUpgrade & {
}

export const ABILITY_MUSIC_SHEET_UPGRADE_SHIELD = "Shield per Note";
const SHIELD_GAIN_PER_NOTE = 5;

export function addAbilityMusicSheetUpgradeShield() {
    ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS[ABILITY_MUSIC_SHEET_UPGRADE_SHIELD] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getMoreInfoText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
        reset: reset,
    }
}

export function executeAbilityMusicSheetsUpgradeShield(ability: AbilityMusicSheets, abilityOwner: AbilityOwner, notesCount: number) {
    const up: AbilityMusicSheetUpgradeShield = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_SHIELD];
    if (!up) return 0;
    characterAddShield(abilityOwner as Character, up.level * SHIELD_GAIN_PER_NOTE * notesCount);
}

function reset(ability: Ability) {
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
            `Gain shield for every note played.`,
            `Increase from ${SHIELD_GAIN_PER_NOTE * upgrade.level} to ${SHIELD_GAIN_PER_NOTE * (upgrade.level + 1)}.`,
        );
    } else {
        textLines.push(
            `Gain ${SHIELD_GAIN_PER_NOTE} shield for every note played.`,
        );
    }
    return textLines;
}
