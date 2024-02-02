import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade } from "../abilityUpgrade.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilityObjectSnipe, AbilitySnipe, getOptionsSnipeUpgrade } from "./abilitySnipe.js";

export const ABILITY_SNIPE_UPGRADE_NO_MISS_CHAIN = "No Miss Chain";
const DAMAGE_COUNT_CAP = 50;
const DAMAGE_UP_PER_HIT = 0.04;
const COUNT_LOSS_ON_MISS = 3;

export type AbilityUpgradeNoMissChain = AbilityUpgrade & {
    noMissChainCounter: number,
    noMissCounterCap: number,
    noMissBonusDamageFactorAdd: number,
    upgradeSynergy: boolean,
}

export function addAbilitySnipeUpgradeNoMissChain() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[ABILITY_SNIPE_UPGRADE_NO_MISS_CHAIN] = {
        addSynergyUpgradeOption: addSynergyUpgradeOption,
        getStatsDisplayText: getAbilityUpgradeNoMissChainUiText,
        getLongExplainText: getAbilityUpgradeNoMissChainUiTextLong,
        getDamageFactor: getAbilityUpgradeNoMissChainDamageFactor,
        getOptions: getOptionsNoMissChain,
        executeOption: executeOptionNoMissChain,
        reset: reset,
    }
}

export function abilityUpgradeNoMissChainOnObjectSnipeDamageDone(abilitySnipe: AbilitySnipe, abilityObjectSnipe: AbilityObjectSnipe) {
    const upgrades: AbilityUpgradeNoMissChain | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_NO_MISS_CHAIN];
    const isPlayerTriggeredMainShot = abilityObjectSnipe.triggeredByPlayer;
    if (upgrades && upgrades.noMissChainCounter !== undefined && abilityObjectSnipe.remainingRange === undefined && isPlayerTriggeredMainShot) {
        if (abilityObjectSnipe.hitSomething) {
            if (upgrades.noMissChainCounter < upgrades.noMissCounterCap!) {
                upgrades.noMissChainCounter++;
            }
        } else {
            upgrades.noMissChainCounter -= COUNT_LOSS_ON_MISS;
            if (upgrades.noMissChainCounter < 0) upgrades.noMissChainCounter = 0;
        }
    }
}

function reset(ability: Ability) {
    const abilitySnipe = ability as AbilitySnipe;
    const upgrade: AbilityUpgradeNoMissChain | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_NO_MISS_CHAIN];
    if (!upgrade) return;
    upgrade.noMissChainCounter = 0;
}

function getOptionsNoMissChain(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getOptionsSnipeUpgrade(ability, ABILITY_SNIPE_UPGRADE_NO_MISS_CHAIN);
    return options;
}

function executeOptionNoMissChain(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilitySnipe;
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
                noMissCounterCap: DAMAGE_COUNT_CAP,
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
    const abilitySnipe = ability as AbilitySnipe;
    const upgrade: AbilityUpgradeNoMissChain = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_NO_MISS_CHAIN];
    return "Chain Bonus: " + (upgrade.noMissChainCounter * upgrade.noMissBonusDamageFactorAdd * 100).toFixed() + "%" + (upgrade.upgradeSynergy ? " (Synergy)" : "");
}

function addSynergyUpgradeOption(ability: Ability): boolean {
    if (Object.keys(ability.upgrades).length > 1) {
        return true;
    }
    return false;
}

function getAbilityUpgradeNoMissChainUiTextLong(ability: Ability, option: AbilityUpgradeOption): string[] {
    const textLines: string[] = [];
    if (option.additionalInfo && option.additionalInfo === "Synergy") {
        textLines.push(`All other upgrades will benefit`);
        textLines.push(`from no miss chain bonus damage.`);
    } else {
        const upgrade: AbilityUpgradeNoMissChain | undefined = ability.upgrades[ABILITY_SNIPE_UPGRADE_NO_MISS_CHAIN];
        if (upgrade) {
            textLines.push(`Hitting an enemy increases damage. Bonus from ${DAMAGE_UP_PER_HIT * upgrade.level * 100}% to ${DAMAGE_UP_PER_HIT * (upgrade.level + 1) * 100}%`);
            textLines.push(`Missing with a shot reduces damage. Reduction from ${DAMAGE_UP_PER_HIT * upgrade.level * COUNT_LOSS_ON_MISS * 100}% to ${DAMAGE_UP_PER_HIT * 100 * (upgrade.level + 1) * COUNT_LOSS_ON_MISS}%.`);
            textLines.push(`Bonus can not become negative.`);
            textLines.push(`Bonus damage cap from ${DAMAGE_COUNT_CAP * DAMAGE_UP_PER_HIT * upgrade.level * 100}% to ${DAMAGE_COUNT_CAP * DAMAGE_UP_PER_HIT * (upgrade.level + 1) * 100}%`);
            if (!upgrade.upgradeSynergy) textLines.push(`Only main shot damage is increased without synergy.`);
        } else {
            textLines.push(`Hitting an enemy increases damage by ${DAMAGE_UP_PER_HIT * 100}% per shot.`);
            textLines.push(`Missing with a shot reduces the damage bonus by ${DAMAGE_UP_PER_HIT * 100 * COUNT_LOSS_ON_MISS}%.`);
            textLines.push(`Bonus can not become negative.`);
            textLines.push(`Bonus damage is capped at ${DAMAGE_COUNT_CAP * DAMAGE_UP_PER_HIT * 100}%.`);
            textLines.push(`Only main shot damage is increased without synergy.`);
        }
    }

    return textLines;
}

function getAbilityUpgradeNoMissChainDamageFactor(ability: Ability, playerTriggered: boolean): number {
    const abilitySnipe = ability as AbilitySnipe;
    const upgrade: AbilityUpgradeNoMissChain | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_NO_MISS_CHAIN];
    let factor = 1;
    if (upgrade?.noMissChainCounter && (playerTriggered || upgrade.upgradeSynergy)) {
        factor = 1 + (upgrade.noMissChainCounter * upgrade.noMissBonusDamageFactorAdd);
    }
    return factor;
}
