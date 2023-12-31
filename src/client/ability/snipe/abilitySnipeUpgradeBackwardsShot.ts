import { UpgradeOptionAndProbability, AbilityUpgradeOption } from "../../character/upgrade.js";
import { calcNewPositionMovedInDirection, calculateDirection } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade } from "../abilityUpgrade.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilitySnipe, createAbilityObjectSnipeInitial, getOptionsSnipeUpgrade } from "./abilitySnipe.js";
import { ABILITY_SNIPE_UPGRADE_AFTER_IMAGE } from "./abilitySnipeUpgradeAfterImage.js";
import { ABILITY_SNIPE_UPGRADE_MORE_RIFLES } from "./abilitySnipeUpgradeMoreRifle.js";

export const ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT = "Backwards Shot";

export type AbilityUpgradeBackwardsShot = AbilityUpgrade & {
    upgradeSynergy: boolean,
}

export function addAbilitySnipeUpgradeBackwardsShot() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT] = {
        addSynergyUpgradeOption: addSynergyUpgradeOption,
        getStatsDisplayText: getAbilityUpgradeBackwardsShotUiText,
        getLongExplainText: getAbilityUpgradeBackwardsShotUiTextLong,
        getOptions: getOptionsBackwardsShot,
        executeOption: executeOptionBackwardsShot,
    }
}

export function castSnipeBackwardsShot(startPosition: Position, faction: string, abilitySnipe: AbilitySnipe, castPosition: Position, playerTriggered: boolean, game: Game) {
    const upgradeBackwardsShot: AbilityUpgradeBackwardsShot = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT];
    if (!upgradeBackwardsShot) return;
    if (!playerTriggered && !upgradeBackwardsShot.upgradeSynergy) return;

    for (let i = 0; i < upgradeBackwardsShot.level; i++) {
        const newCastPosition = getBackwardsShotPosition(startPosition, castPosition, upgradeBackwardsShot, i);
        createAbilityObjectSnipeInitial(startPosition, faction, abilitySnipe, newCastPosition, false, true, game);
    }
}

function getOptionsBackwardsShot(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getOptionsSnipeUpgrade(ability, ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT);
    return options;
}

function executeOptionBackwardsShot(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilitySnipe;
    let up: AbilityUpgradeBackwardsShot;
    if (option.additionalInfo === "Synergy") {
        up = as.upgrades[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT];
        up.upgradeSynergy = true;
    } else {
        if (as.upgrades[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT] === undefined) {
            up = {
                level: 0,
                upgradeSynergy: false,
            }
            as.upgrades[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT] = up;
        } else {
            up = as.upgrades[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT];
        }
        up.level++;
    }
}

function getAbilityUpgradeBackwardsShotUiText(ability: Ability): string {
    const abilitySnipe = ability as AbilitySnipe;
    const upgrade: AbilityUpgradeBackwardsShot = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT];
    return `${ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT} +${upgrade.level}` + (upgrade.upgradeSynergy ? " (Synergy)" : "");
}

function addSynergyUpgradeOption(ability: Ability): boolean{
    if(ability.upgrades[ABILITY_SNIPE_UPGRADE_AFTER_IMAGE]
        || ability.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES]){
        return true;
    }
    return false;
}

function getAbilityUpgradeBackwardsShotUiTextLong(ability: Ability, option: AbilityUpgradeOption): string[] {
    const textLines: string[] = [];
    if (option.additionalInfo && option.additionalInfo === "Synergy") {
        textLines.push(`List of synergies:`);
        textLines.push(`- ${ABILITY_SNIPE_UPGRADE_AFTER_IMAGE}`);
        textLines.push(`- ${ABILITY_SNIPE_UPGRADE_MORE_RIFLES}`);
    } else {
        const upgrade: AbilityUpgradeBackwardsShot | undefined = ability.upgrades[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT];
        textLines.push(`Your main shot also shoots an additional`);
        textLines.push(`shot backwards.`);
        if (upgrade) {
            textLines.push(`Number ob backwards shots from ${upgrade.level} to ${upgrade.level + 1}.`);
        }
    }

    return textLines;
}

function getBackwardsShotPosition(startPosition: Position, castPosition: Position, upgrade: AbilityUpgradeBackwardsShot, backwardsShotNumber: number) {
    const originalDirection = calculateDirection(startPosition, castPosition);
    const shotAngleChange = 0.1;
    const shotsSpreadAngle = shotAngleChange * (upgrade.level - 1);
    const shotBackwardsAngleStart = originalDirection + Math.PI - shotsSpreadAngle / 2;
    const newDirection = shotBackwardsAngleStart + backwardsShotNumber * shotAngleChange;
    return calcNewPositionMovedInDirection(startPosition, newDirection, 40);
}