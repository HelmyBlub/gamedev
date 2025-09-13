import { Character } from "../../character/characterModel.js";
import { UpgradeOptionAndProbability, AbilityUpgradeOption } from "../../character/upgrade.js";
import { applyDebuff } from "../../debuff/debuff.js";
import { createDebuffDamageOverTime } from "../../debuff/debuffDamageOverTime.js";
import { FACTION_ENEMY, FACTION_PLAYER, Game } from "../../gameModel.js";
import { Ability, AbilityObject } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS, AbilityMusicSheets } from "./abilityMusicSheet.js";
import { ABILITY_MUSIC_SHEET_UPGRADE_CRIT, AbilityMusicSheetUpgradeCrit } from "./abilityMusicSheetUpgradeCrit.js";

export type AbilityMusicSheetUpgradeDamageOverTime = AbilityUpgrade & {
}
export const ABILITY_MUSIC_SHEET_UPGRADE_DAMAGE_OVER_TIME = "Damage Over Time on Hit";

export function addAbilityMusicSheetUpgradeDamageOverTime() {
    ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS[ABILITY_MUSIC_SHEET_UPGRADE_DAMAGE_OVER_TIME] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getMoreInfoExplainText: getExplainText,
        getMoreInfoIncreaseOneLevelText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
        reset: reset,
    }
}

export function abilityMusicSheetsUpgradeDamageOverTimeApply(ability: AbilityMusicSheets, abilityObject: AbilityObject, target: Character, game: Game) {
    const up = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_DAMAGE_OVER_TIME] as AbilityMusicSheetUpgradeDamageOverTime;
    if (up === undefined) return;
    let damage = abilityObject.damage;
    if (abilityObject.faction === FACTION_PLAYER) {
        damage *= up.level;
    } else {
        damage *= 1 + up.level / 5;
    }
    const upCrit = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_CRIT] as AbilityMusicSheetUpgradeCrit;
    let critBonusFactor = 1;
    if (upCrit) {
        critBonusFactor += upCrit.level;
    }
    const debuffDamageOverTime = createDebuffDamageOverTime(damage, ability.damagePerSecond * up.level * 40 * critBonusFactor, ability.id);
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
    return `${ABILITY_MUSIC_SHEET_UPGRADE_DAMAGE_OVER_TIME}: Level ${up.level}`;
}

function getExplainText(ability: Ability, upgrade: AbilityUpgrade): string[] {
    const up = upgrade as AbilityMusicSheetUpgradeDamageOverTime;
    const textLines: string[] = [];
    textLines.push(`Apply permanent damage over time effect on hit.`);
    textLines.push(`Damage Per Second: ${upgrade.level * 100}% of Base DPS.`);
    return textLines;
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
