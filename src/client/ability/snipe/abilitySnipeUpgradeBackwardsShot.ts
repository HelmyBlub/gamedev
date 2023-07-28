import { UpgradeOptionAndProbability, AbilityUpgradeOption } from "../../character/upgrade.js";
import { calcNewPositionMovedInDirection, calculateDirection } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade } from "../abilityUpgrade.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilitySnipe, createAbilityObjectSnipeInitial, getOptionsSnipeUpgrade } from "./abilitySnipe.js";

export const ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT = "Backwards Shot";

export type AbilityUpgradeBackwardsShot = AbilityUpgrade & {
    upgradeSynergy: boolean,
}

export function addAbilitySnipeUpgradeBackwardsShot() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT] = {
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

function getOptionsBackwardsShot(ability: Ability): UpgradeOptionAndProbability[]{
    let options = getOptionsSnipeUpgrade(ability, ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT);
    return options;
}

function executeOptionBackwardsShot(ability: Ability, option: AbilityUpgradeOption){
    let as = ability as AbilitySnipe;
    let up: AbilityUpgradeBackwardsShot;
    if (option.additionalInfo === "Synergy") {
        up = as.upgrades[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT];
        up.upgradeSynergy = true;
    }else{
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
    let upgrade: AbilityUpgradeBackwardsShot = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT];
    return `${ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT} +${upgrade.level}` + (upgrade.upgradeSynergy ? " (Synergy)" : "");
}

function getAbilityUpgradeBackwardsShotUiTextLong(ability: Ability, option: AbilityUpgradeOption): string[] {
    const abilitySnipe = ability as AbilitySnipe;
    const upgrade: AbilityUpgradeBackwardsShot | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT];
    const textLines: string[] = [];
    if (option.additionalInfo && option.additionalInfo === "Synergy") {
        textLines.push(`List of synergies:`);
        textLines.push(`- After Image`);
        textLines.push(`- More Rifles`);
    } else {
        textLines.push(`Your main shot also shoots an additional`);
        textLines.push(`shot backwards.`);
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