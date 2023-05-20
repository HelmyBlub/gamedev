import { Game } from "../../gameModel.js";
import { Ability, AbilityOwner, AbilityUpgradeOption } from "../ability.js";
import { ABILITY_MOVEMENTSPEED_UPGRADE_FUNCTIONS, AbilityMovementSpeed } from "./abilityMovementSpeed.js";

export type AbilityMovementSpeedUpgradeAddCharge = {
    currentCharges: number,
    maxCharges: number,
}

export const ABILITY_MOVEMENT_SPEED_UPGARDE_ADD_CHARGE = "Additional Charge";

export function addAbilitySnipeUpgradeAddCharge() {
    ABILITY_MOVEMENTSPEED_UPGRADE_FUNCTIONS[ABILITY_MOVEMENT_SPEED_UPGARDE_ADD_CHARGE] = {
        getAbilityUpgradeUiText: abilityUpgradeAddChargeUiText,
        pushAbilityUpgradeOption: pushAbilityUpgradeAddCharge,
    }
}

export function tickAbilitySnipeUpgradeAddCharge(abilityMovementSpeed: AbilityMovementSpeed, game: Game) {
    const chargeUpgrade: AbilityMovementSpeedUpgradeAddCharge | undefined = abilityMovementSpeed.upgrades[ABILITY_MOVEMENT_SPEED_UPGARDE_ADD_CHARGE];
    if (chargeUpgrade) {
        if (chargeUpgrade.currentCharges < chargeUpgrade.maxCharges) {
            if (abilityMovementSpeed.cooldownFinishTime <= game.state.time) {
                chargeUpgrade.currentCharges++;
                if (chargeUpgrade.currentCharges < chargeUpgrade.maxCharges) {
                    abilityMovementSpeed.cooldownFinishTime = game.state.time + abilityMovementSpeed.cooldown;
                }
            }
        }
    }
}

function pushAbilityUpgradeAddCharge(ability: Ability, upgradeOptions: AbilityUpgradeOption[]) {
    upgradeOptions.push({
        name: ABILITY_MOVEMENT_SPEED_UPGARDE_ADD_CHARGE, probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilityMovementSpeed;
            let up: AbilityMovementSpeedUpgradeAddCharge;
            if (as.upgrades[ABILITY_MOVEMENT_SPEED_UPGARDE_ADD_CHARGE] === undefined) {
                up = {
                    maxCharges: 1,
                    currentCharges: 1,
                }
                as.upgrades[ABILITY_MOVEMENT_SPEED_UPGARDE_ADD_CHARGE] = up;
            } else {
                up = as.upgrades[ABILITY_MOVEMENT_SPEED_UPGARDE_ADD_CHARGE];
            }
            up.maxCharges += 1;
            up.currentCharges += 1;
        }
    });
}

function abilityUpgradeAddChargeUiText(ability: Ability): string {
    const upgrade: AbilityMovementSpeedUpgradeAddCharge = ability.upgrades[ABILITY_MOVEMENT_SPEED_UPGARDE_ADD_CHARGE];
    return `${ABILITY_MOVEMENT_SPEED_UPGARDE_ADD_CHARGE}s: +${upgrade.maxCharges-1}`;
}