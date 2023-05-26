import { Ability, AbilityUpgradeOption } from "../ability.js";
import { AbilityUpgrade } from "../abilityUpgrade.js";
import { ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS, AbilitySpeedBoost } from "./abilitySpeedBoost.js";

type AbilitySpeedBoostUpgradeSlowTrail = AbilityUpgrade & {
}

export const ABILITY_SPEED_BOOST_UPGARDE_SLOW_TRAIL = "Slow Trail";

export function addAbilitySpeedBoostUpgradeSlowTrail() {
    ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS[ABILITY_SPEED_BOOST_UPGARDE_SLOW_TRAIL] = {
        getAbilityUpgradeUiText: getAbilityUpgradeSlowTrailUiText,
        getAbilityUpgradeUiTextLong: getAbilityUpgradeSlowTrailUiTextLong,
        pushAbilityUpgradeOption: pushAbilityUpgradeSlowTrail,
    }
}

function pushAbilityUpgradeSlowTrail(ability: Ability, upgradeOptions: AbilityUpgradeOption[]) {
    if (ability.upgrades[ABILITY_SPEED_BOOST_UPGARDE_SLOW_TRAIL]) return;
    upgradeOptions.push({
        name: ABILITY_SPEED_BOOST_UPGARDE_SLOW_TRAIL, probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySpeedBoost;
            let up: AbilitySpeedBoostUpgradeSlowTrail;
            if (as.upgrades[ABILITY_SPEED_BOOST_UPGARDE_SLOW_TRAIL] === undefined) {
                up = {level: 1};
                as.upgrades[ABILITY_SPEED_BOOST_UPGARDE_SLOW_TRAIL] = up;
            }
        }
    });
}

function getAbilityUpgradeSlowTrailUiText(ability: Ability): string {
    return ABILITY_SPEED_BOOST_UPGARDE_SLOW_TRAIL;
}

function getAbilityUpgradeSlowTrailUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    textLines.push(ABILITY_SPEED_BOOST_UPGARDE_SLOW_TRAIL);
    textLines.push(`When activating the speed boost, you will leave`);
    textLines.push(`a trail behind which slows enemies.`);

    return textLines;
}
