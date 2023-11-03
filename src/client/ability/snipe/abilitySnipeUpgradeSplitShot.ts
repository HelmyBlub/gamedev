import { UpgradeOptionAndProbability, AbilityUpgradeOption } from "../../character/upgrade.js";
import { calculateDistance } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade } from "../abilityUpgrade.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilityObjectSnipe, AbilitySnipe, createAbilityObjectSnipeBranch, getOptionsSnipeUpgrade } from "./abilitySnipe.js";
import { ABILITY_SNIPE_UPGRADE_AFTER_IMAGE } from "./abilitySnipeUpgradeAfterImage.js";
import { ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT } from "./abilitySnipeUpgradeBackwardsShot.js";
import { ABILITY_SNIPE_UPGRADE_MORE_RIFLES } from "./abilitySnipeUpgradeMoreRifle.js";

export const ABILITY_SNIPE_UPGRADE_SPLIT_SHOT = "Split Shot";

export type AbilityUpgradeSplitShot = AbilityUpgrade & {
    shotSplitsPerHit: number,
    upgradeSynergy: boolean,
}

export function addAbilitySnipeUpgradeSplitShot() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[ABILITY_SNIPE_UPGRADE_SPLIT_SHOT] = {
        addSynergyUpgradeOption: addSynergyUpgradeOption,
        getStatsDisplayText: getAbilityUpgradeSplitShotUiText,
        getLongExplainText: getAbilityUpgradeSplitShotUiTextLong,
        getOptions: getOptionsSplitShot,
        executeOption: executeOptionSplitShot,
    }
}

export function abilityUpgradeSplitShotOnSnipeHit(position: Position, abilitySnipe: AbilitySnipe | undefined, abilityObjectSnipe: AbilityObjectSnipe, game: Game) {
    const upgrades: AbilityUpgradeSplitShot | undefined = abilitySnipe?.upgrades[ABILITY_SNIPE_UPGRADE_SPLIT_SHOT];
    if (abilityObjectSnipe.canSplitOnHit && upgrades && abilitySnipe) {
        if (abilityObjectSnipe.triggeredByPlayer || upgrades.upgradeSynergy) {
            for (let i = 0; i < upgrades.shotSplitsPerHit!; i++) {
                const remainingRange = abilityObjectSnipe.remainingRange !== undefined ? abilityObjectSnipe.remainingRange : 0;
                const range = abilityObjectSnipe.range + remainingRange - calculateDistance(position, abilityObjectSnipe);
                const randomDirectionChange = nextRandom(game.state.randomSeed) / 2;
                const newDirection = abilityObjectSnipe.direction + randomDirectionChange;
                createAbilityObjectSnipeBranch(abilitySnipe, abilityObjectSnipe, position, newDirection, range, game);
            }
        }
    }
}

function getOptionsSplitShot(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getOptionsSnipeUpgrade(ability, ABILITY_SNIPE_UPGRADE_SPLIT_SHOT);
    return options;
}

function executeOptionSplitShot(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilitySnipe;
    let up: AbilityUpgradeSplitShot;
    if (option.additionalInfo === "Synergy") {
        up = as.upgrades[ABILITY_SNIPE_UPGRADE_SPLIT_SHOT];
        up.upgradeSynergy = true;
    } else {
        if (as.upgrades[ABILITY_SNIPE_UPGRADE_SPLIT_SHOT] === undefined) {
            up = {
                level: 0,
                shotSplitsPerHit: 0,
                upgradeSynergy: false,
            }
            as.upgrades[ABILITY_SNIPE_UPGRADE_SPLIT_SHOT] = up;
        } else {
            up = as.upgrades[ABILITY_SNIPE_UPGRADE_SPLIT_SHOT];
        }
        up.level++;
        up.shotSplitsPerHit++;
    }
}

function getAbilityUpgradeSplitShotUiText(ability: Ability): string {
    const abilitySnipe = ability as AbilitySnipe;
    const upgrade: AbilityUpgradeSplitShot = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_SPLIT_SHOT];
    return "Split On Hit +" + upgrade.shotSplitsPerHit + (upgrade.upgradeSynergy ? " (Synergy)" : "");
}

function addSynergyUpgradeOption(ability: Ability): boolean{
    if(ability.upgrades[ABILITY_SNIPE_UPGRADE_AFTER_IMAGE]
        || ability.upgrades[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT]
        || ability.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES]){
        return true;
    }
    return false;
}

function getAbilityUpgradeSplitShotUiTextLong(ability: Ability, option: AbilityUpgradeOption): string[] {
    const textLines: string[] = [];
    if (option.additionalInfo && option.additionalInfo === "Synergy") {
        textLines.push(`List of synergies:`);
        textLines.push(`- ${ABILITY_SNIPE_UPGRADE_AFTER_IMAGE}`);
        textLines.push(`- ${ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT}`);
        textLines.push(`- ${ABILITY_SNIPE_UPGRADE_MORE_RIFLES}`);
    } else {
        const upgrade: AbilityUpgradeSplitShot | undefined = ability.upgrades[ABILITY_SNIPE_UPGRADE_SPLIT_SHOT];
        textLines.push(`The main shot will split for every enemy hit.`);
        if (upgrade) {
            textLines.push(`Split count from ${upgrade.level} to ${upgrade.level + 1}.`);
        }
    }

    return textLines;
}