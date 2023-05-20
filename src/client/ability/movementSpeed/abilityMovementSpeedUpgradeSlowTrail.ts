import { Ability, AbilityUpgradeOption } from "../ability.js";
import { ABILITY_MOVEMENTSPEED_UPGRADE_FUNCTIONS, AbilityMovementSpeed } from "./abilityMovementSpeed.js";

type AbilityMovementSpeedUpgradeSlowTrail = {
}

export const ABILITY_MOVEMENT_SPEED_UPGARDE_SLOW_TRAIL = "Slow Trail";

export function addAbilitySnipeUpgradeSlowTrail() {
    ABILITY_MOVEMENTSPEED_UPGRADE_FUNCTIONS[ABILITY_MOVEMENT_SPEED_UPGARDE_SLOW_TRAIL] = {
        getAbilityUpgradeUiText: abilityUpgradeSlowTrailUiText,
        pushAbilityUpgradeOption: pushAbilityUpgradeSlowTrail,
    }
}

function pushAbilityUpgradeSlowTrail(ability: Ability, upgradeOptions: AbilityUpgradeOption[]) {
    if (ability.upgrades[ABILITY_MOVEMENT_SPEED_UPGARDE_SLOW_TRAIL]) return;
    upgradeOptions.push({
        name: "Slow Trail", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilityMovementSpeed;
            let up: AbilityMovementSpeedUpgradeSlowTrail;
            if (as.upgrades[ABILITY_MOVEMENT_SPEED_UPGARDE_SLOW_TRAIL] === undefined) {
                up = {};
                as.upgrades[ABILITY_MOVEMENT_SPEED_UPGARDE_SLOW_TRAIL] = up;
            }
        }
    });
}

function abilityUpgradeSlowTrailUiText(ability: Ability): string {
    return ABILITY_MOVEMENT_SPEED_UPGARDE_SLOW_TRAIL;
}