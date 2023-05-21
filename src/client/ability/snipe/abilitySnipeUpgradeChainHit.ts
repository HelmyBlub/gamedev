import { text } from "stream/consumers";
import { Ability, AbilityUpgradeOption } from "../ability.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilityObjectSnipe, AbilitySnipe } from "./abilitySnipe.js";

export const UPGRADE_SNIPE_ABILITY_NO_MISS_CHAIN = "No Miss Chain";
const DAMAGE_CAP = 50;
const DAMAGE_UP_PER_HIT = 0.01;

export type AbilityUpgradeChainHit = {
    noMissChainCounter: number,
    noMissCounterCap: number,
    noMissBonusDamageFactorAdd: number,
}

export function addAbilitySnipeUpgradeNoMissChain() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[UPGRADE_SNIPE_ABILITY_NO_MISS_CHAIN] = {
        getAbilityUpgradeUiText: getAbilityUpgradeNoMissChainUiText,
        getAbilityUpgradeUiTextLong: getAbilityUpgradeNoMissChainUiTextLong,
        pushAbilityUpgradeOption: pushAbilityUpgradeNoMissChain,
        getAbilityUpgradeDamageFactor: getAbilityUpgradeNoMissChainDamageFactor,
    }
}

export function abilityUpgradeNoMissChainOnObjectSnipeDamageDone(abilitySnipe: AbilitySnipe, abilityObjectSnipe: AbilityObjectSnipe) {
    let upgrades: AbilityUpgradeChainHit | undefined = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_NO_MISS_CHAIN];
    let isPlayerTriggeredMainShot = !abilityObjectSnipe.preventSplitOnHit && abilityObjectSnipe.triggeredByPlayer;
    if (upgrades && upgrades.noMissChainCounter !== undefined && abilityObjectSnipe.remainingRange === undefined && isPlayerTriggeredMainShot) {
        if (abilityObjectSnipe.hitSomething) {
            if (upgrades.noMissChainCounter < upgrades.noMissCounterCap!) {
                upgrades.noMissChainCounter++;
            }
        } else {
            upgrades.noMissChainCounter = 0;
        }
    }
}

function pushAbilityUpgradeNoMissChain(ability: Ability, upgradeOptions: AbilityUpgradeOption[]) {
    upgradeOptions.push({
        name: UPGRADE_SNIPE_ABILITY_NO_MISS_CHAIN, probabilityFactor: 1, upgrade: (a: Ability) => {
            const as = a as AbilitySnipe;
            let up: AbilityUpgradeChainHit;
            if (as.upgrades[UPGRADE_SNIPE_ABILITY_NO_MISS_CHAIN] === undefined) {
                up = {
                    noMissChainCounter: 0,
                    noMissBonusDamageFactorAdd: 0,
                    noMissCounterCap: DAMAGE_CAP,
                }
                as.upgrades[UPGRADE_SNIPE_ABILITY_NO_MISS_CHAIN] = up;
            } else {
                up = as.upgrades[UPGRADE_SNIPE_ABILITY_NO_MISS_CHAIN];
            }
            if (up.noMissBonusDamageFactorAdd !== undefined) {
                up.noMissBonusDamageFactorAdd += DAMAGE_UP_PER_HIT;
            }
        }
    });
}

function getAbilityUpgradeNoMissChainUiText(ability: Ability): string {
    let abilitySnipe = ability as AbilitySnipe;
    let upgrades: AbilityUpgradeChainHit | undefined = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_NO_MISS_CHAIN];
    if (upgrades) {
        return "Chain Bonus: " + (upgrades.noMissChainCounter * upgrades.noMissBonusDamageFactorAdd * 100).toFixed() + "%";
    }

    return "";
}

function getAbilityUpgradeNoMissChainUiTextLong(ability: Ability): string[] {
    let abilitySnipe = ability as AbilitySnipe;
    let upgrades: AbilityUpgradeChainHit | undefined = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_NO_MISS_CHAIN];
    const textLines: string[] = [];
    textLines.push(UPGRADE_SNIPE_ABILITY_NO_MISS_CHAIN);
    textLines.push(`Hiting an Enemy increases damage by ${DAMAGE_UP_PER_HIT*100}% per shot.`);
    textLines.push(`Not hitting any enemy with a shot resets it to 0%.`);
    textLines.push(`Bonus damage is capped at ${DAMAGE_CAP}%.`);

    return textLines;
}

function getAbilityUpgradeNoMissChainDamageFactor(ability: Ability): number {
    let abilitySnipe = ability as AbilitySnipe;
    let upgrades: AbilityUpgradeChainHit | undefined = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_NO_MISS_CHAIN];
    let factor = 1;
    if (upgrades?.noMissChainCounter) {
        factor = 1 + (upgrades.noMissChainCounter * upgrades.noMissBonusDamageFactorAdd);
    }
    return factor;

}
