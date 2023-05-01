import { Ability, UpgradeOptionAbility } from "../ability.js";
import { AbilitySnipe } from "./abilitySnipe.js";

export const UPGRADE_SNIPE_ABILITY_DAMAGE_AND_RANGE = "Damage and Range";

export type AbilityUpgradeDamageAndRange = {
    damageMultiplier: number,
    rangeMultiplier: number,
}

export function getAbilityUpgradeDamageAndRange(): UpgradeOptionAbility {
    return {
        name: "+200% Damage, Range halved", probabilityFactor: 1, upgrade: (a: Ability) => {
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
            up.rangeMultiplier /= 2;
            up.damageMultiplier += 2;
        }
    }
}

export function abilityUpgradeDamageAndRangeDamageFactor(abilitySnipe: AbilitySnipe) {
    let upgrades: AbilityUpgradeDamageAndRange | undefined = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_DAMAGE_AND_RANGE];
    let factor = 1;
    if (upgrades?.damageMultiplier) {
        factor = upgrades.damageMultiplier;
    }
    return factor;
}

export function abilityUpgradeDamageAndRangeRangeFactor(abilitySnipe: AbilitySnipe) {
    let upgrades: AbilityUpgradeDamageAndRange | undefined = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_DAMAGE_AND_RANGE];
    let factor = 1;
    if (upgrades?.rangeMultiplier) {
        factor = upgrades.rangeMultiplier;
    }
    return factor;
}