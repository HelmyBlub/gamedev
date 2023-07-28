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
        getStatsDisplayText: getAbilityUpgradeDamageAndRangeUiText,
        getLongExplainText: getAbilityUpgradeDamageAndRangeUiTextLong,
        getDamageFactor: getAbilityUpgradeDamageAndRangeDamageFactor,
        getOptions: getOptionsDamageAndRange,
        executeOption: executeOptionDamageAndRange,
    }
}

export function abilityUpgradeDamageAndRangeRangeFactor(ability: Ability) {
    let abilitySnipe = ability as AbilitySnipe;
    let upgrades: AbilityUpgradeDamageAndRange | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_DAMAGE_AND_RANGE];
    let factor = 1;
    if (upgrades?.rangeMultiplier) {
        factor = upgrades.rangeMultiplier;
    }
    return factor;
}

function getOptionsDamageAndRange(ability: Ability): UpgradeOptionAndProbability[] {
    let options = getAbilityUpgradeOptionDefault(ability, ABILITY_SNIPE_UPGRADE_DAMAGE_AND_RANGE);
    const upgrade: AbilityUpgradeDamageAndRange | undefined = ability.upgrades[ABILITY_SNIPE_UPGRADE_DAMAGE_AND_RANGE];
    const levelText = upgrade === undefined ? "" : `(${upgrade.level})`;
    options[0].option.displayText += levelText;
    options[0].option.displayLongText = getAbilityUpgradeDamageAndRangeUiTextLong(ability);
    options[0].probability = 0.5;
    return options;
}

function getAbilityUpgradeDamageAndRangeUiText(ability: Ability): string {
    let abilitySnipe = ability as AbilitySnipe;
    let upgrade: AbilityUpgradeDamageAndRange = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_DAMAGE_AND_RANGE];
    return `${ABILITY_SNIPE_UPGRADE_DAMAGE_AND_RANGE}: Damage ${(upgrade.damageMultiplier - 1) * 100}%, Range ${(upgrade.rangeMultiplier - 1) * 100}%`
}

function getAbilityUpgradeDamageAndRangeUiTextLong(ability: Ability): string[] {
    let abilitySnipe = ability as AbilitySnipe;
    let upgrade: AbilityUpgradeDamageAndRange | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_DAMAGE_AND_RANGE];

    const textLines: string[] = [];
    textLines.push(`All Bonus damage +${DAMAGE_UP * 100}%.`);
    textLines.push(`Range is reduced by ${(1 / RANGE_DOWN * 100).toFixed(2)}%.`);

    return textLines;
}

function executeOptionDamageAndRange(ability: Ability, option: AbilityUpgradeOption) {
    let as = ability as AbilitySnipe;
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
    let abilitySnipe = ability as AbilitySnipe;
    let upgrades: AbilityUpgradeDamageAndRange | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_DAMAGE_AND_RANGE];
    let factor = 1;
    if (upgrades?.damageMultiplier) {
        factor = upgrades.damageMultiplier;
    }
    return factor;
}
