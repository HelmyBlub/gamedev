import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade } from "../abilityUpgrade.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilityObjectSnipe, AbilitySnipe, getOptionsSnipeUpgrade } from "./abilitySnipe.js";

export const ABILITY_SNIPE_UPGRADE_NO_MISS_CHAIN = "No Miss Chain";
const DAMAGE_CAP = 200;
const DAMAGE_UP_PER_HIT = 0.04;

export type AbilityUpgradeNoMissChain = AbilityUpgrade & {
    noMissChainCounter: number,
    noMissCounterCap: number,
    noMissBonusDamageFactorAdd: number,
    upgradeSynergy: boolean,
}

export function addAbilitySnipeUpgradeNoMissChain() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[ABILITY_SNIPE_UPGRADE_NO_MISS_CHAIN] = {
        getStatsDisplayText: getAbilityUpgradeNoMissChainUiText,
        getLongExplainText: getAbilityUpgradeNoMissChainUiTextLong,
        getDamageFactor: getAbilityUpgradeNoMissChainDamageFactor,
        getOptions: getOptionsNoMissChain,
        executeOption: executeOptionNoMissChain,
    }
}

export function abilityUpgradeNoMissChainOnObjectSnipeDamageDone(abilitySnipe: AbilitySnipe, abilityObjectSnipe: AbilityObjectSnipe) {
    let upgrades: AbilityUpgradeNoMissChain | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_NO_MISS_CHAIN];
    let isPlayerTriggeredMainShot = abilityObjectSnipe.triggeredByPlayer;
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

function getOptionsNoMissChain(ability: Ability): UpgradeOptionAndProbability[] {
    let options = getOptionsSnipeUpgrade(ability, ABILITY_SNIPE_UPGRADE_NO_MISS_CHAIN);
    return options;
}

function executeOptionNoMissChain(ability: Ability, option: AbilityUpgradeOption) {
    let as = ability as AbilitySnipe;
    let up: AbilityUpgradeNoMissChain;
    if (option.additionalInfo === "Synergy") {
        up = as.upgrades[ABILITY_SNIPE_UPGRADE_NO_MISS_CHAIN];
        up.upgradeSynergy = true;
    } else {
        if (as.upgrades[ABILITY_SNIPE_UPGRADE_NO_MISS_CHAIN] === undefined) {
            up = {
                level: 0,
                noMissChainCounter: 0,
                noMissBonusDamageFactorAdd: 0,
                noMissCounterCap: DAMAGE_CAP,
                upgradeSynergy: false,
            }
            as.upgrades[ABILITY_SNIPE_UPGRADE_NO_MISS_CHAIN] = up;
        } else {
            up = as.upgrades[ABILITY_SNIPE_UPGRADE_NO_MISS_CHAIN];
        }
        up.level++;
        up.noMissBonusDamageFactorAdd += DAMAGE_UP_PER_HIT;
    }
}

function getAbilityUpgradeNoMissChainUiText(ability: Ability): string {
    let abilitySnipe = ability as AbilitySnipe;
    let upgrade: AbilityUpgradeNoMissChain = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_NO_MISS_CHAIN];
    return "Chain Bonus: " + (upgrade.noMissChainCounter * upgrade.noMissBonusDamageFactorAdd * 100).toFixed() + "%" + (upgrade.upgradeSynergy ? " (Synergy)" : "");
}

function getAbilityUpgradeNoMissChainUiTextLong(ability: Ability, option: AbilityUpgradeOption): string[] {
    const abilitySnipe = ability as AbilitySnipe;
    const upgrade: AbilityUpgradeNoMissChain | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_NO_MISS_CHAIN];

    const textLines: string[] = [];
    if (option.additionalInfo && option.additionalInfo === "Synergy") {
        textLines.push(`All other upgrades will benefit`);
        textLines.push(`from no miss chain bonus damage.`);
    } else {
        textLines.push(`Hiting an Enemy increases damage by ${DAMAGE_UP_PER_HIT * 100}% per shot.`);
        textLines.push(`Not hitting any enemy with a shot resets it to 0%.`);
        textLines.push(`Bonus damage is capped at ${DAMAGE_CAP}%.`);
        textLines.push(`Only main shot damage is increased without synergy.`);
    }

    return textLines;
}

function getAbilityUpgradeNoMissChainDamageFactor(ability: Ability, playerTriggered: boolean): number {
    let abilitySnipe = ability as AbilitySnipe;
    let upgrade: AbilityUpgradeNoMissChain | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_NO_MISS_CHAIN];
    let factor = 1;
    if (upgrade?.noMissChainCounter && (playerTriggered || upgrade.upgradeSynergy)) {
        factor = 1 + (upgrade.noMissChainCounter * upgrade.noMissBonusDamageFactorAdd);
    }
    return factor;

}
