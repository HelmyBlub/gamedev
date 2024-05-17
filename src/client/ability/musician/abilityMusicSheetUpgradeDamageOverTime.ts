import { Character } from "../../character/characterModel.js";
import { UpgradeOptionAndProbability, AbilityUpgradeOption } from "../../character/upgrade.js";
import { applyDebuff } from "../../debuff/debuff.js";
import { createDebuffDamageOverTime } from "../../debuff/debuffDamageOverTime.js";
import { FACTION_PLAYER, Game } from "../../gameModel.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS, AbilityMusicSheets } from "./abilityMusicSheet.js";

export type AbilityMusicSheetUpgradeDamageOverTime = AbilityUpgrade & {
}
export const ABILITY_MUSIC_SHEET_UPGRADE_DAMAGE_OVER_TIME = "Damage Over Time on Hit";

export function addAbilityMusicSheetUpgradeDamageOverTime() {
    ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS[ABILITY_MUSIC_SHEET_UPGRADE_DAMAGE_OVER_TIME] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getMoreInfoText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
        reset: reset,
    }
}

export function abilityMusicSheetsUpgradeDamageOverTimeApply(ability: AbilityMusicSheets, target: Character, game: Game) {
    const up = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_DAMAGE_OVER_TIME] as AbilityMusicSheetUpgradeDamageOverTime;
    if (up === undefined) return;
    const debuffDamageOverTime = createDebuffDamageOverTime(ability.damagePerSecond * up.level, ability.id);
    if (target.faction === FACTION_PLAYER) debuffDamageOverTime.removeTime = game.state.time + 2000;
    applyDebuff(debuffDamageOverTime, target, game);
}

function reset(ability: Ability) {
}

function getOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_MUSIC_SHEET_UPGRADE_DAMAGE_OVER_TIME);
    options[0].option.displayMoreInfoText = getAbilityUpgradeUiTextLong(ability);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption) {
    const musicSheet = ability as AbilityMusicSheets;
    let up: AbilityMusicSheetUpgradeDamageOverTime;
    if (musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_DAMAGE_OVER_TIME] === undefined) {
        up = { level: 0 };
        musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_DAMAGE_OVER_TIME] = up;
    } else {
        up = musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_DAMAGE_OVER_TIME];
    }
    up.level++;
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityMusicSheetUpgradeDamageOverTime = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_DAMAGE_OVER_TIME];
    return `${ABILITY_MUSIC_SHEET_UPGRADE_DAMAGE_OVER_TIME}: ${up.level}`;
}

function getAbilityUpgradeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityMusicSheetUpgradeDamageOverTime | undefined = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_DAMAGE_OVER_TIME];
    if (upgrade) {
        textLines.push(`Apply permanent damage over time effect on hit.`);
        textLines.push(`Damage increase from ${upgrade.level * 100}% to ${(upgrade.level + 1) * 100}%.`);
    } else {
        textLines.push(`Apply permanent damage over time effect on hit.`);
    }
    return textLines;
}
