import { Ability, UpgradeOptionAbility } from "../ability.js";
import { AbilityObjectSnipe, AbilitySnipe } from "./abilitySnipe.js";

export const UPGRADE_SNIPE_ABILITY_NO_MISS_CHAIN = "Snipe No Miss Chain";

export type AbilityUpgradeChainHit = {
    noMissChainCounter: number,
    noMissCounterCap: number,
    noMissBonusDamageFactorAdd: number,
}

export function getAbilityUpgradeNoMissChain(): UpgradeOptionAbility {
    return {
        name: "No Miss Chain-> damage 0%-50% bonus damage", probabilityFactor: 1, upgrade: (a: Ability) => {
            const as = a as AbilitySnipe;
            let up: AbilityUpgradeChainHit;
            if (as.upgrades[UPGRADE_SNIPE_ABILITY_NO_MISS_CHAIN] === undefined) {
                up = {
                    noMissChainCounter: 0,
                    noMissBonusDamageFactorAdd: 0,
                    noMissCounterCap: 50,
                }
                as.upgrades[UPGRADE_SNIPE_ABILITY_NO_MISS_CHAIN] = up;
            } else {
                up = as.upgrades[UPGRADE_SNIPE_ABILITY_NO_MISS_CHAIN];
            }
            if (up.noMissBonusDamageFactorAdd !== undefined) {
                up.noMissBonusDamageFactorAdd += 0.01;
            }
        }
    }
}

export function abilityUpgradeNoMissChainUiText(abilitySnipe: AbilitySnipe): string {
    let upgrades: AbilityUpgradeChainHit | undefined = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_NO_MISS_CHAIN];
    if (upgrades) {
        return "Chain Bonus: " + (upgrades.noMissChainCounter * upgrades.noMissBonusDamageFactorAdd * 100).toFixed() + "%";
    }

    return "";
}

export function abilityUpgradeNoMissChainDamageFactor(abilitySnipe: AbilitySnipe) {
    let upgrades: AbilityUpgradeChainHit | undefined = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_NO_MISS_CHAIN];
    let factor = 1;
    if (upgrades?.noMissChainCounter) {
        factor = 1 + (upgrades.noMissChainCounter * upgrades.noMissBonusDamageFactorAdd);
    }
    return factor;

}

export function abilityUpgradeNoMissChainOnObjectSnipeDamageDone(abilitySnipe: AbilitySnipe, abilityObjectSnipe: AbilityObjectSnipe) {
    let upgrades: AbilityUpgradeChainHit | undefined = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_NO_MISS_CHAIN];
    if (upgrades && upgrades.noMissChainCounter !== undefined && abilityObjectSnipe.remainingRange === undefined && !abilityObjectSnipe.preventSplitOnHit) {
        if (abilityObjectSnipe.hitSomething) {
            if (upgrades.noMissChainCounter < upgrades.noMissCounterCap!) {
                upgrades.noMissChainCounter++;
            }
        } else {
            upgrades.noMissChainCounter = 0;
        }
    }
}