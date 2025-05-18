import { Character } from "../../character/characterModel.js";
import { UpgradeOptionAndProbability, AbilityUpgradeOption } from "../../character/upgrade.js";
import { applyDebuff } from "../../debuff/debuff.js";
import { createDebuffSlow, debuffSlowGetSlowAmountAsPerCentText } from "../../debuff/debuffSlow.js";
import { Game } from "../../gameModel.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS, AbilityMusicSheets } from "./abilityMusicSheet.js";

export type AbilityMusicSheetUpgradeSlow = AbilityUpgrade & {
}
export const ABILITY_MUSIC_SHEET_UPGRADE_SLOW = "Slow on hit";
const SLOW_FACTOR_PER_LEVEL = 1;
const BASEDURATION = 2000;

export function addAbilityMusicSheetUpgradeSlow() {
    ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS[ABILITY_MUSIC_SHEET_UPGRADE_SLOW] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getMoreInfoIncreaseOneLevelText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
        reset: reset,
    }
}

export function abilityMusicSheetsUpgradeSlowApplySlow(ability: AbilityMusicSheets, target: Character, game: Game) {
    const slow = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_SLOW] as AbilityMusicSheetUpgradeSlow;
    if (slow === undefined) return;
    const debuffSlow = createDebuffSlow(getSlowFactor(slow), BASEDURATION, game.state.time);
    applyDebuff(debuffSlow, target, game);
}

function reset(ability: Ability) {
}

function getSlowFactor(up: AbilityMusicSheetUpgradeSlow): number {
    return 1 + up.level * SLOW_FACTOR_PER_LEVEL;
}

function getOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_MUSIC_SHEET_UPGRADE_SLOW);
    options[0].option.displayMoreInfoText = getAbilityUpgradeUiTextLong(ability);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption) {
    const musicSheet = ability as AbilityMusicSheets;
    let up: AbilityMusicSheetUpgradeSlow;
    if (musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_SLOW] === undefined) {
        up = { level: 0 };
        musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_SLOW] = up;
    } else {
        up = musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_SLOW];
    }
    up.level++;
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityMusicSheetUpgradeSlow = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_SLOW];
    const currentSlowAmount = debuffSlowGetSlowAmountAsPerCentText(getSlowFactor(up));
    return `${ABILITY_MUSIC_SHEET_UPGRADE_SLOW}: Level ${up.level}, ${currentSlowAmount}%`;
}

function getAbilityUpgradeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityMusicSheetUpgradeSlow | undefined = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_SLOW];
    if (upgrade) {
        const currentSlowAmount = debuffSlowGetSlowAmountAsPerCentText(getSlowFactor(upgrade));
        const newSlowAmount = debuffSlowGetSlowAmountAsPerCentText(getSlowFactor(upgrade) + SLOW_FACTOR_PER_LEVEL);
        textLines.push(`Slow enemies on hit.`);
        textLines.push(`Increase slow from ${currentSlowAmount}% to ${newSlowAmount}%.`);
        textLines.push(`Slow lasts ${(BASEDURATION) / 1000}s.`);
    } else {
        const slowAmount = debuffSlowGetSlowAmountAsPerCentText(1 + SLOW_FACTOR_PER_LEVEL);
        textLines.push(`Slow enemies on hit.`);
        textLines.push(`Slow enemies by ${slowAmount}% for ${(BASEDURATION) / 1000}s.`);
    }
    return textLines;
}
