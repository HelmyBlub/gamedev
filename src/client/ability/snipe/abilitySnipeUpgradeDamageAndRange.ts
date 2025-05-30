import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilitySnipe } from "./abilitySnipe.js";

export const ABILITY_SNIPE_UPGRADE_DAMAGE_AND_RANGE = "+Damage and -Range";
const DAMAGE_UP = 2;
const RANGE_DOWN = 2;

export type AbilityUpgradeDamageAndRange = AbilityUpgrade & {
    damageMultiplier: number,
    rangeMultiplier: number,
}

export function addAbilitySnipeUpgradeDamageAndRange() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[ABILITY_SNIPE_UPGRADE_DAMAGE_AND_RANGE] = {
        getMoreInfoIncreaseOneLevelText: getAbilityUpgradeDamageAndRangeUiTextLong,
        getMoreInfoExplainText: getExplainText,
        getDamageFactor: getAbilityUpgradeDamageAndRangeDamageFactor,
        getOptions: getOptionsDamageAndRange,
        executeOption: executeOptionDamageAndRange,
    }
}

export function abilityUpgradeDamageAndRangeRangeFactor(ability: Ability) {
    const abilitySnipe = ability as AbilitySnipe;
    const upgrades: AbilityUpgradeDamageAndRange | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_DAMAGE_AND_RANGE];
    let factor = 1;
    if (upgrades?.rangeMultiplier) {
        factor = upgrades.rangeMultiplier;
    }
    return factor;
}

function getOptionsDamageAndRange(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_SNIPE_UPGRADE_DAMAGE_AND_RANGE);
    options[0].option.displayMoreInfoText = getAbilityUpgradeDamageAndRangeUiTextLong(ability);
    options[0].probability = 0.5;
    return options;
}

function getExplainText(ability: Ability, upgrade: AbilityUpgrade): string[] {
    const afterImageUpgrade = upgrade as AbilityUpgradeDamageAndRange;
    const textLines: string[] = [];
    textLines.push(`All damage bonus: ${DAMAGE_UP * 100 * afterImageUpgrade.level}%.`);
    textLines.push(`Range reduction: ${(1 / Math.pow(RANGE_DOWN, upgrade.level) * 100).toFixed(2)}%.`);
    return textLines;
}

function getAbilityUpgradeDamageAndRangeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityUpgradeDamageAndRange | undefined = ability.upgrades[ABILITY_SNIPE_UPGRADE_DAMAGE_AND_RANGE];
    if (upgrade) {
        textLines.push(`All damage bonus from ${DAMAGE_UP * 100 * upgrade.level}% to ${DAMAGE_UP * 100 * (upgrade.level + 1)}%`);
        textLines.push(`Range reduction from ${(1 / Math.pow(RANGE_DOWN, upgrade.level) * 100).toFixed(2)}% to ${(1 / Math.pow(RANGE_DOWN, upgrade.level + 1) * 100).toFixed(2)}%.`);
    } else {
        textLines.push(`All damage +${DAMAGE_UP * 100}%.`);
        textLines.push(`Range is reduced by ${(1 / RANGE_DOWN * 100).toFixed(2)}%.`);
    }

    return textLines;
}

function executeOptionDamageAndRange(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilitySnipe;
    let up: AbilityUpgradeDamageAndRange;
    if (as.upgrades[ABILITY_SNIPE_UPGRADE_DAMAGE_AND_RANGE] === undefined) {
        up = {
            level: 0,
            damageMultiplier: 1,
            rangeMultiplier: 1,
        }
        as.upgrades[ABILITY_SNIPE_UPGRADE_DAMAGE_AND_RANGE] = up;
    } else {
        up = as.upgrades[ABILITY_SNIPE_UPGRADE_DAMAGE_AND_RANGE];
    }
    up.level++;
    up.rangeMultiplier /= RANGE_DOWN;
    up.damageMultiplier += DAMAGE_UP;
}

function getAbilityUpgradeDamageAndRangeDamageFactor(ability: Ability): number {
    const abilitySnipe = ability as AbilitySnipe;
    const upgrades: AbilityUpgradeDamageAndRange | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_DAMAGE_AND_RANGE];
    let factor = 1;
    if (upgrades?.damageMultiplier) {
        factor = upgrades.damageMultiplier;
    }
    return factor;
}
