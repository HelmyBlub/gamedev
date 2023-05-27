import { Ability, AbilityUpgradeOption } from "../ability.js";
import { AbilityUpgrade } from "../abilityUpgrade.js";
import { ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS, AbilitySpeedBoost } from "./abilitySpeedBoost.js";

type AbilitySpeedBoostUpgradeCooldown = AbilityUpgrade & {
}
const REDUCED_COOLDOWN_PER_LEVEL = 0.15;

export const ABILITY_SPEED_BOOST_UPGARDE_COOLDOWN = "Speed Boost -Cooldown";

export function addAbilitySpeedBoostUpgradeCooldown() {
    ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS[ABILITY_SPEED_BOOST_UPGARDE_COOLDOWN] = {
        getAbilityUpgradeUiText: getAbilityUpgradeCooldownUiText,
        getAbilityUpgradeUiTextLong: getAbilityUpgradeCooldownUiTextLong,
        pushAbilityUpgradeOption: pushAbilityUpgradeCooldown,
    }
}

function pushAbilityUpgradeCooldown(ability: Ability, upgradeOptions: AbilityUpgradeOption[]) {
    upgradeOptions.push({
        name: ABILITY_SPEED_BOOST_UPGARDE_COOLDOWN, probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySpeedBoost;
            let up: AbilitySpeedBoostUpgradeCooldown;
            if (as.upgrades[ABILITY_SPEED_BOOST_UPGARDE_COOLDOWN] === undefined) {
                up = { level: 0 };
                as.upgrades[ABILITY_SPEED_BOOST_UPGARDE_COOLDOWN] = up;
            } else {
                up = as.upgrades[ABILITY_SPEED_BOOST_UPGARDE_COOLDOWN];
            }
            up.level++;
            as.cooldown *= (1 - REDUCED_COOLDOWN_PER_LEVEL);
        }
    });
}

function getAbilityUpgradeCooldownUiText(ability: Ability): string {
    let up: AbilitySpeedBoostUpgradeCooldown = ability.upgrades[ABILITY_SPEED_BOOST_UPGARDE_COOLDOWN];
    let cooldownPerCent = 1 - Math.pow(1 - REDUCED_COOLDOWN_PER_LEVEL, up.level);
    return `${ABILITY_SPEED_BOOST_UPGARDE_COOLDOWN}: ${(cooldownPerCent * 100).toFixed(2)}%`;
}

function getAbilityUpgradeCooldownUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityUpgrade | undefined  = ability.upgrades[ABILITY_SPEED_BOOST_UPGARDE_COOLDOWN];
    const levelText = (upgrade ? `(${upgrade.level + 1})` : "");
    textLines.push(ABILITY_SPEED_BOOST_UPGARDE_COOLDOWN + levelText);
    textLines.push(`Speed Boost -${REDUCED_COOLDOWN_PER_LEVEL * 100}% cooldown`);

    return textLines;
}
