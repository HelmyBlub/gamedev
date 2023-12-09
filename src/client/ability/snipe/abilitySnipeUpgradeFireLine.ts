import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { calcNewPositionMovedInDirection, calculateDirection } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { Ability } from "../ability.js";
import { createAbilityObjectFireLine } from "../abilityFireLine.js";
import { AbilityUpgrade } from "../abilityUpgrade.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilitySnipe, getAbilitySnipeDamage, getOptionsSnipeUpgrade } from "./abilitySnipe.js";
import { ABILITY_SNIPE_UPGRADE_AFTER_IMAGE } from "./abilitySnipeUpgradeAfterImage.js";
import { ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT } from "./abilitySnipeUpgradeBackwardsShot.js";
import { ABILITY_SNIPE_UPGRADE_MORE_RIFLES } from "./abilitySnipeUpgradeMoreRifle.js";

export const ABILITY_SNIPE_UPGRADE_FIRE_LINE = "Fire Line";
const DURATION = 4000;
const DAMAGE_PER_SECOND_PER_LEVEL_FACTOR = 1;

export type AbilityUpgradeFireLine = AbilityUpgrade & {
    duration: number,
    damagePerSecondFactor: number,
    tickInterval: number,
    range: number,
    upgradeSynergy: boolean,
}

export function addAbilitySnipeUpgradeFireLine() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[ABILITY_SNIPE_UPGRADE_FIRE_LINE] = {
        addSynergyUpgradeOption: addSynergyUpgradeOption,
        getStatsDisplayText: getAbilityUpgradeFireLineUiText,
        getLongExplainText: getAbilityUpgradeFireLineUiTextLong,
        getOptions: getOptionsFireLine,
        executeOption: executeOptionFireLine,
    }
}

export function castSnipeFireLine(startPosition: Position, faction: string, abilitySnipe: AbilitySnipe, castPosition: Position, playerTriggered: boolean, game: Game) {
    const upgradeFireLine: AbilityUpgradeFireLine = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_FIRE_LINE];
    if (!upgradeFireLine || (!playerTriggered && !upgradeFireLine.upgradeSynergy)) return;
    const direction = calculateDirection(startPosition, castPosition);
    const endPosition = calcNewPositionMovedInDirection(startPosition, direction, upgradeFireLine.range);
    const dps = upgradeFireLine.damagePerSecondFactor * getAbilitySnipeDamage(abilitySnipe, abilitySnipe.baseDamage, false, 0);
    const damagePerTick = dps * (upgradeFireLine.tickInterval / 1000);
    const width = 10;
    const color = "red";
    game.state.abilityObjects.push(createAbilityObjectFireLine(faction, startPosition, endPosition, damagePerTick, width, upgradeFireLine.duration, upgradeFireLine.tickInterval, color, abilitySnipe.id, game));
}

function getOptionsFireLine(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getOptionsSnipeUpgrade(ability, ABILITY_SNIPE_UPGRADE_FIRE_LINE);
    return options;
}

function executeOptionFireLine(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilitySnipe;
    let up: AbilityUpgradeFireLine;
    if (option.additionalInfo === "Synergy") {
        up = as.upgrades[ABILITY_SNIPE_UPGRADE_FIRE_LINE];
        up.upgradeSynergy = true;
    } else {
        if (as.upgrades[ABILITY_SNIPE_UPGRADE_FIRE_LINE] === undefined) {
            up = {
                level: 0,
                duration: DURATION,
                damagePerSecondFactor: 0,
                tickInterval: 200,
                range: 150,
                upgradeSynergy: false,
            }
            as.upgrades[ABILITY_SNIPE_UPGRADE_FIRE_LINE] = up;
        } else {
            up = as.upgrades[ABILITY_SNIPE_UPGRADE_FIRE_LINE];
        }
        up.level++;
        up.damagePerSecondFactor += DAMAGE_PER_SECOND_PER_LEVEL_FACTOR;
    }
}

function getAbilityUpgradeFireLineUiText(ability: Ability): string {
    const abilitySnipe = ability as AbilitySnipe;
    const upgrade: AbilityUpgradeFireLine = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_FIRE_LINE];
    return `${ABILITY_SNIPE_UPGRADE_FIRE_LINE}: ${upgrade.damagePerSecondFactor * 100}% damage per second. Duration: ${(upgrade.duration / 1000).toFixed()}s` + (upgrade.upgradeSynergy ? " (Synergy)" : "");
}

function addSynergyUpgradeOption(ability: Ability): boolean{
    if(ability.upgrades[ABILITY_SNIPE_UPGRADE_AFTER_IMAGE]
        || ability.upgrades[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT]
        || ability.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES]){
        return true;
    }
    return false;
}

function getAbilityUpgradeFireLineUiTextLong(ability: Ability, option: AbilityUpgradeOption): string[] {
    const textLines: string[] = [];
    if (option.additionalInfo && option.additionalInfo === "Synergy") {
        textLines.push(`List of synergies:`);
        textLines.push(`- ${ABILITY_SNIPE_UPGRADE_AFTER_IMAGE}`);
        textLines.push(`- ${ABILITY_SNIPE_UPGRADE_MORE_RIFLES}`);
        textLines.push(`- ${ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT}`);
    } else {
        const upgrade: AbilityUpgradeFireLine | undefined = ability.upgrades[ABILITY_SNIPE_UPGRADE_FIRE_LINE];
        textLines.push(`The main shot create a fire line.`);
        textLines.push(`It stays on the ground for ${DURATION / 1000}s.`);
        if (upgrade) {
            textLines.push(`Damage per second from ${DAMAGE_PER_SECOND_PER_LEVEL_FACTOR * 100 * upgrade.level}% to ${DAMAGE_PER_SECOND_PER_LEVEL_FACTOR * 100 * (upgrade.level + 1)}%.`);
        } else {
            textLines.push(`It does ${DAMAGE_PER_SECOND_PER_LEVEL_FACTOR * 100}% damage per second.`);
        }
    }

    return textLines;
}
