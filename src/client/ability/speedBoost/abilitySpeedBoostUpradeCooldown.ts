import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS, AbilitySpeedBoost } from "./abilitySpeedBoost.js";

type AbilitySpeedBoostUpgradeCooldown = AbilityUpgrade & {
}
const REDUCED_COOLDOWN_PER_LEVEL = 0.15;

export const ABILITY_SPEED_BOOST_UPGRADE_COOLDOWN = "Speed Boost -Cooldown";

export function addAbilitySpeedBoostUpgradeCooldown() {
    ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS[ABILITY_SPEED_BOOST_UPGRADE_COOLDOWN] = {
        getStatsDisplayText: getAbilityUpgradeCooldownUiText,
        getLongExplainText: getAbilityUpgradeCooldownUiTextLong,
        getOptions: getOptionsCooldown,
        executeOption: executeOptionCooldown,
    }
}

function getOptionsCooldown(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_SPEED_BOOST_UPGRADE_COOLDOWN);
    options[0].option.displayLongText = getAbilityUpgradeCooldownUiTextLong(ability);
    return options;
}

function executeOptionCooldown(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilitySpeedBoost;
    let up: AbilitySpeedBoostUpgradeCooldown;
    if (as.upgrades[ABILITY_SPEED_BOOST_UPGRADE_COOLDOWN] === undefined) {
        up = { level: 0 };
        as.upgrades[ABILITY_SPEED_BOOST_UPGRADE_COOLDOWN] = up;
    } else {
        up = as.upgrades[ABILITY_SPEED_BOOST_UPGRADE_COOLDOWN];
    }
    up.level++;
    as.cooldown *= (1 - REDUCED_COOLDOWN_PER_LEVEL);
}

function getAbilityUpgradeCooldownUiText(ability: Ability): string {
    const up: AbilitySpeedBoostUpgradeCooldown = ability.upgrades[ABILITY_SPEED_BOOST_UPGRADE_COOLDOWN];
    const cooldownPerCent = 1 - Math.pow(1 - REDUCED_COOLDOWN_PER_LEVEL, up.level);
    return `${ABILITY_SPEED_BOOST_UPGRADE_COOLDOWN}: ${(cooldownPerCent * 100).toFixed(2)}%`;
}

function getAbilityUpgradeCooldownUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    textLines.push(`Speed Boost -${REDUCED_COOLDOWN_PER_LEVEL * 100}% cooldown`);
    return textLines;
}
