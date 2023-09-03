import { UpgradeOptionAndProbability, AbilityUpgradeOption } from "../../character/upgrade.js";
import { Game } from "../../gameModel.js";
import { Ability, AbilityOwner } from "../ability.js";
import { AbilityUpgrade } from "../abilityUpgrade.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilitySnipe, getOptionsSnipeUpgrade } from "./abilitySnipe.js";

export const ABILITY_SNIPE_UPGRADE_STAY_STILL = "Stay Still";
const STAY_STILL_TIME = 2500;
const DAMAGE_FACTOR = 1;

export type AbilityUpgradeStayStill = AbilityUpgrade & {
    damageMultiplier: number,
    stayStillStartTime: number,
    damageMultiplierActive: boolean,
    stayStillTime: number,
    upgradeSynergy: boolean,
}

export function addAbilitySnipeUpgradeStayStill() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[ABILITY_SNIPE_UPGRADE_STAY_STILL] = {
        getStatsDisplayText: getAbilityUpgradeStayStillUiText,
        getLongExplainText: getAbilityUpgradeStayStillUiTextLong,
        getDamageFactor: getAbilityUpgradeStayStillDamageFactor,
        getOptions: getOptionsStayStill,
        executeOption: executeOptionStayStill,
        reset: reset,
    }
}

export function paintVisualizationStayStill(ctx: CanvasRenderingContext2D, abilitySnipe: AbilitySnipe, paintX: number, paintY: number, playerMainRifle: boolean, game: Game) {
    const upgradeStayStill: AbilityUpgradeStayStill = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_STAY_STILL];
    if (!upgradeStayStill) return;
    if (!playerMainRifle && !upgradeStayStill.upgradeSynergy) return;
    if (upgradeStayStill.damageMultiplierActive) {
        ctx.fillStyle = "blue";
        ctx.fillRect(paintX, paintY + 14, 40, 12);
    } else if (upgradeStayStill.stayStillStartTime > 0) {
        const filltPerCent = (game.state.time - upgradeStayStill.stayStillStartTime) / upgradeStayStill.stayStillTime;
        ctx.fillStyle = "black";
        ctx.fillRect(paintX, paintY + 5, Math.round(40 * filltPerCent), 4);
    }
}

export function tickAbilityUpgradeStayStill(abilitySnipe: AbilitySnipe, abilityOwner: AbilityOwner, game: Game) {
    let upgrade: AbilityUpgradeStayStill | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_STAY_STILL];
    if (!upgrade) return;
    if (abilitySnipe.shotNextAllowedTime || abilityOwner.isMoving || upgrade.stayStillStartTime < 0) {
        upgrade.stayStillStartTime = game.state.time;
    } else if (upgrade.stayStillStartTime + upgrade.stayStillTime <= game.state.time) {
        upgrade.damageMultiplierActive = true;
    }
    if (abilitySnipe.currentCharges === 0) {
        upgrade.damageMultiplierActive = false;
        upgrade.stayStillStartTime = game.state.time;
    }
}

function reset(ability: Ability) {
    const abilitySnipe = ability as AbilitySnipe;
    let upgrade: AbilityUpgradeStayStill | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_STAY_STILL];
    if (!upgrade) return;
    upgrade.damageMultiplierActive = false;
    upgrade.stayStillStartTime = -1;
}

function getOptionsStayStill(ability: Ability): UpgradeOptionAndProbability[] {
    let options = getOptionsSnipeUpgrade(ability, ABILITY_SNIPE_UPGRADE_STAY_STILL);
    return options;
}

function executeOptionStayStill(ability: Ability, option: AbilityUpgradeOption) {
    let as = ability as AbilitySnipe;
    let up: AbilityUpgradeStayStill;
    if (option.additionalInfo === "Synergy") {
        up = as.upgrades[ABILITY_SNIPE_UPGRADE_STAY_STILL];
        up.upgradeSynergy = true;
    } else {
        if (as.upgrades[ABILITY_SNIPE_UPGRADE_STAY_STILL] === undefined) {
            up = {
                level: 0,
                damageMultiplier: 0,
                stayStillStartTime: -1,
                damageMultiplierActive: false,
                stayStillTime: STAY_STILL_TIME,
                upgradeSynergy: false,
            }
            as.upgrades[ABILITY_SNIPE_UPGRADE_STAY_STILL] = up;
        } else {
            up = as.upgrades[ABILITY_SNIPE_UPGRADE_STAY_STILL];
        }
        up.level++;
        up.damageMultiplier += DAMAGE_FACTOR;
    }
}

function getAbilityUpgradeStayStillDamageFactor(ability: Ability, playerTriggered: boolean): number {
    const abilitySnipe = ability as AbilitySnipe;
    let upgrade: AbilityUpgradeStayStill | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_STAY_STILL];
    let factor = 1;
    if (upgrade && upgrade.damageMultiplierActive && (playerTriggered || upgrade.upgradeSynergy)) {
        factor = 1 + upgrade.damageMultiplier;
    }
    return factor;
}

function getAbilityUpgradeStayStillUiText(ability: Ability): string {
    const abilitySnipe = ability as AbilitySnipe;
    let upgrade: AbilityUpgradeStayStill = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_STAY_STILL];
    return `Stay Still for ${(upgrade.stayStillTime / 1000).toFixed(2)}s to get ${upgrade.damageMultiplier * 100}% Bonus Damge for current Magazine` + (upgrade.upgradeSynergy ? " (Synergy)" : "");
}

function getAbilityUpgradeStayStillUiTextLong(ability: Ability, option: AbilityUpgradeOption): string[] {
    let abilitySnipe = ability as AbilitySnipe;
    const upgrade: AbilityUpgrade | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_STAY_STILL];

    const textLines: string[] = [];
    if (option.additionalInfo && option.additionalInfo === "Synergy") {
        textLines.push(`All other upgrades will benefit`);
        textLines.push(`from Stay Still bonus damage.`);
    } else {
        textLines.push(`Not moving or shooting for ${STAY_STILL_TIME / 1000} seconds`);
        textLines.push(`will activate ${DAMAGE_FACTOR * 100}% damage bonus.`);
        textLines.push(`The damage bonus will be active until`);
        textLines.push(`rifle reloading.`);
        textLines.push(`Only main shot damage is increased without synergy.`);
    }
    return textLines;
}
