import { Game } from "../../gameModel.js";
import { Ability, AbilityOwner, UpgradeOptionAbility } from "../ability.js";
import { AbilitySnipe } from "./abilitySnipe.js";

export const UPGRADE_SNIPE_ABILITY_STAY_STILL = "Stay Still";

export type AbilityUpgradeStayStill = {
    damageMultiplier: number,
    stayStillStartTime: number,
    damageMultiplierActive: boolean,
    stayStillTime: number,
}

export function getAbilityUpgradeStayStill(): UpgradeOptionAbility {
    return {
        name: "Stay Still", probabilityFactor: 1, upgrade: (a: Ability) => {
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
    }
}

export function abilityUpgradeStayStillDamageFactor(abilitySnipe: AbilitySnipe) {
    let upgrades: AbilityUpgradeStayStill | undefined = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_STAY_STILL];
    let factor = 1;
    if (upgrades && upgrades.damageMultiplierActive) {
        factor = 1 + upgrades.damageMultiplier;
    }
    return factor;
}

export function tickAbilityUpgradeStayStill(abilitySnipe: AbilitySnipe, abilityOwner: AbilityOwner, game: Game) {
    let upgrade: AbilityUpgradeStayStill | undefined = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_STAY_STILL];
    if (!upgrade) return;
    if (abilitySnipe.shotNextAllowedTime || abilityOwner.isMoving || upgrade.stayStillStartTime < 0) {
        upgrade.stayStillStartTime = game.state.time;
    } else if(upgrade.stayStillStartTime + upgrade.stayStillTime <= game.state.time){
        upgrade.damageMultiplierActive = true;
    }
    if(abilitySnipe.currentCharges === 0){
        upgrade.damageMultiplierActive = false;
        upgrade.stayStillStartTime = game.state.time;
    } 
}

export function abilityUpgradeStayStillUiText(abilitySnipe: AbilitySnipe): string {
    let upgrades: AbilityUpgradeStayStill | undefined = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_STAY_STILL];
    if (upgrades) {
        return `Stay Still for ${(upgrades.stayStillTime/1000).toFixed(2)}s to get ${upgrades.damageMultiplier*100}% Bonus Damge for current Magazine`;
    }

    return "";
}