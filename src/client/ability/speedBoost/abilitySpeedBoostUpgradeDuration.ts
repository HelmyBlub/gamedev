import { Ability, AbilityUpgradeOption } from "../ability.js";
import { AbilityUpgrade } from "../abilityUpgrade.js";
import { ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS, AbilitySpeedBoost } from "./abilitySpeedBoost.js";

type AbilitySpeedBoostUpgradeDuration = AbilityUpgrade & {
}

const BONUS_DURATION_PER_LEVEL = 1000;

export const ABILITY_SPEED_BOOST_UPGARDE_DURATION = "Speed Boost +Duration";

export function addAbilitySpeedBoostUpgradeDuration() {
    ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS[ABILITY_SPEED_BOOST_UPGARDE_DURATION] = {
        getAbilityUpgradeUiText: getAbilityUpgradeDurationUiText,
        getAbilityUpgradeUiTextLong: getAbilityUpgradeDurationUiTextLong,
        pushAbilityUpgradeOption: pushAbilityUpgradeDuration,
    }
}

function pushAbilityUpgradeDuration(ability: Ability, upgradeOptions: AbilityUpgradeOption[]) {
    upgradeOptions.push({
        name: ABILITY_SPEED_BOOST_UPGARDE_DURATION, probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySpeedBoost;
            let up: AbilitySpeedBoostUpgradeDuration;
            if (as.upgrades[ABILITY_SPEED_BOOST_UPGARDE_DURATION] === undefined) {
                up = { level: 0 };
                as.upgrades[ABILITY_SPEED_BOOST_UPGARDE_DURATION] = up;
            } else {
                up = as.upgrades[ABILITY_SPEED_BOOST_UPGARDE_DURATION];
            }
            up.level++;
            as.duration += BONUS_DURATION_PER_LEVEL;
        }
    });
}

function getAbilityUpgradeDurationUiText(ability: Ability): string {
    let up: AbilitySpeedBoostUpgradeDuration = ability.upgrades[ABILITY_SPEED_BOOST_UPGARDE_DURATION];
    return `${ABILITY_SPEED_BOOST_UPGARDE_DURATION}: ${(up.level * BONUS_DURATION_PER_LEVEL / 1000).toFixed(2)}s`;
}

function getAbilityUpgradeDurationUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityUpgrade | undefined = ability.upgrades[ABILITY_SPEED_BOOST_UPGARDE_DURATION];
    const levelText = (upgrade ? `(${upgrade.level + 1})` : "");
    textLines.push(ABILITY_SPEED_BOOST_UPGARDE_DURATION + levelText);
    textLines.push(`Speed Boost +${BONUS_DURATION_PER_LEVEL/1000}s increased duration`);

    return textLines;
}
