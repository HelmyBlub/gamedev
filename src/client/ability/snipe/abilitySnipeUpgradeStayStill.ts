import { Game, Position } from "../../gameModel.js";
import { Ability, AbilityOwner, AbilityUpgradeOption } from "../ability.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilitySnipe } from "./abilitySnipe.js";

export const UPGRADE_SNIPE_ABILITY_STAY_STILL = "Stay Still";

export type AbilityUpgradeStayStill = {
    damageMultiplier: number,
    stayStillStartTime: number,
    damageMultiplierActive: boolean,
    stayStillTime: number,
}

export function addAbilitySnipeUpgradeStayStill() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[UPGRADE_SNIPE_ABILITY_STAY_STILL] = {
        getAbilityUpgradeUiText: getAbilityUpgradeStayStillUiText,
        pushAbilityUpgradeOption: pushAbilityUpgradeStayStill,
        getAbilityUpgradeDamageFactor: getAbilityUpgradeStayStillDamageFactor,
    }
}

export function paintVisualizationStayStill(ctx: CanvasRenderingContext2D, abilitySnipe: AbilitySnipe, paintX: number, paintY: number, game: Game) {
    const upgradeStayStill: AbilityUpgradeStayStill = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_STAY_STILL];
    if (!upgradeStayStill) return;
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
    let upgrade: AbilityUpgradeStayStill | undefined = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_STAY_STILL];
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

function pushAbilityUpgradeStayStill(ability: Ability, upgradeOptions: AbilityUpgradeOption[]) {
    upgradeOptions.push({
        name: UPGRADE_SNIPE_ABILITY_STAY_STILL, probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySnipe;
            let up: AbilityUpgradeStayStill;
            if (as.upgrades[UPGRADE_SNIPE_ABILITY_STAY_STILL] === undefined) {
                up = {
                    damageMultiplier: 0,
                    stayStillStartTime: -1,
                    damageMultiplierActive: false,
                    stayStillTime: 3000,
                }
                as.upgrades[UPGRADE_SNIPE_ABILITY_STAY_STILL] = up;
            } else {
                up = as.upgrades[UPGRADE_SNIPE_ABILITY_STAY_STILL];
            }
            up.damageMultiplier += 1;
        }
    });
}

function getAbilityUpgradeStayStillDamageFactor(ability: Ability): number {
    const abilitySnipe = ability as AbilitySnipe;
    let upgrades: AbilityUpgradeStayStill | undefined = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_STAY_STILL];
    let factor = 1;
    if (upgrades && upgrades.damageMultiplierActive) {
        factor = 1 + upgrades.damageMultiplier;
    }
    return factor;
}

function getAbilityUpgradeStayStillUiText(ability: Ability): string {
    const abilitySnipe = ability as AbilitySnipe;
    let upgrades: AbilityUpgradeStayStill = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_STAY_STILL];
    return `Stay Still for ${(upgrades.stayStillTime / 1000).toFixed(2)}s to get ${upgrades.damageMultiplier * 100}% Bonus Damge for current Magazine`;
}