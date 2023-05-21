import { Ability, AbilityUpgradeOption } from "../ability.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilitySnipe } from "./abilitySnipe.js";

export const UPGRADE_SNIPE_ABILITY_DAMAGE_AND_RANGE = "+Damage and -Range";
const DAMAGE_UP = 2;
const RANGE_DOWN = 2;

export type AbilityUpgradeDamageAndRange = {
    damageMultiplier: number,
    rangeMultiplier: number,
}

export function addAbilitySnipeUpgradeDamageAndRange() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[UPGRADE_SNIPE_ABILITY_DAMAGE_AND_RANGE] = {
        getAbilityUpgradeUiText: getAbilityUpgradeDamageAndRangeUiText,
        getAbilityUpgradeUiTextLong: getAbilityUpgradeDamageAndRangeUiTextLong,
        pushAbilityUpgradeOption: pushAbilityUpgradeDamageAndRange,
        getAbilityUpgradeDamageFactor: getAbilityUpgradeDamageAndRangeDamageFactor,
    }
}

export function abilityUpgradeDamageAndRangeRangeFactor(ability: Ability) {
    let abilitySnipe = ability as AbilitySnipe;
    let upgrades: AbilityUpgradeDamageAndRange | undefined = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_DAMAGE_AND_RANGE];
    let factor = 1;
    if (upgrades?.rangeMultiplier) {
        factor = upgrades.rangeMultiplier;
    }
    return factor;
}

function getAbilityUpgradeDamageAndRangeUiText(ability: Ability): string {
    let abilitySnipe = ability as AbilitySnipe;
    let upgrade: AbilityUpgradeDamageAndRange = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_DAMAGE_AND_RANGE];
    return `${UPGRADE_SNIPE_ABILITY_DAMAGE_AND_RANGE}: Damage ${(upgrade.damageMultiplier - 1) * 100}%, Range ${(upgrade.rangeMultiplier - 1) * 100}%`
}

function getAbilityUpgradeDamageAndRangeUiTextLong(ability: Ability): string[] {
    let abilitySnipe = ability as AbilitySnipe;
    let upgrades: AbilityUpgradeDamageAndRange | undefined = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_DAMAGE_AND_RANGE];
    const textLines: string[] = [];
    textLines.push(UPGRADE_SNIPE_ABILITY_DAMAGE_AND_RANGE);
    textLines.push(`Bonus damage is ${DAMAGE_UP * 100}%.`);
    textLines.push(`Range is reduced by ${(1 / RANGE_DOWN * 100).toFixed(2)}%.`);

    return textLines;
}

function pushAbilityUpgradeDamageAndRange(ability: Ability, upgradeOptions: AbilityUpgradeOption[]) {
    upgradeOptions.push({
        name: UPGRADE_SNIPE_ABILITY_DAMAGE_AND_RANGE, probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySnipe;
            let up: AbilityUpgradeDamageAndRange;
            if (as.upgrades[UPGRADE_SNIPE_ABILITY_DAMAGE_AND_RANGE] === undefined) {
                up = {
                    damageMultiplier: 1,
                    rangeMultiplier: 1,
                }
                as.upgrades[UPGRADE_SNIPE_ABILITY_DAMAGE_AND_RANGE] = up;
            } else {
                up = as.upgrades[UPGRADE_SNIPE_ABILITY_DAMAGE_AND_RANGE];
            }
            up.rangeMultiplier /= RANGE_DOWN;
            up.damageMultiplier += DAMAGE_UP;
        }
    });
}

function getAbilityUpgradeDamageAndRangeDamageFactor(ability: Ability): number {
    let abilitySnipe = ability as AbilitySnipe;
    let upgrades: AbilityUpgradeDamageAndRange | undefined = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_DAMAGE_AND_RANGE];
    let factor = 1;
    if (upgrades?.damageMultiplier) {
        factor = upgrades.damageMultiplier;
    }
    return factor;
}
