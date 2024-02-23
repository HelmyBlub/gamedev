import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS, AbilitySpeedBoost } from "./abilitySpeedBoost.js";

type AbilitySpeedBoostUpgradeSpeed = AbilityUpgrade & {
}
const BONUS_SPEED_PER_LEVEL = 0.5;

export const ABILITY_SPEED_BOOST_UPGRADE_SPEED = "Speed Boost +Speed";

export function addAbilitySpeedBoostUpgradeSpeed() {
    ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS[ABILITY_SPEED_BOOST_UPGRADE_SPEED] = {
        getStatsDisplayText: getAbilityUpgradeSpeedUiText,
        getMoreInfoText: getAbilityUpgradeSpeedUiTextLong,
        getOptions: getOptionsSpeed,
        executeOption: executeOptionSpeed,
    }
}

function getOptionsSpeed(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_SPEED_BOOST_UPGRADE_SPEED);
    options[0].option.displayLongText = getAbilityUpgradeSpeedUiTextLong(ability);
    return options;
}

function executeOptionSpeed(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilitySpeedBoost;
    let up: AbilitySpeedBoostUpgradeSpeed;
    if (as.upgrades[ABILITY_SPEED_BOOST_UPGRADE_SPEED] === undefined) {
        up = { level: 0 };
        as.upgrades[ABILITY_SPEED_BOOST_UPGRADE_SPEED] = up;
    } else {
        up = as.upgrades[ABILITY_SPEED_BOOST_UPGRADE_SPEED];
    }
    up.level++;
    as.speedFactor += BONUS_SPEED_PER_LEVEL;
}

function getAbilityUpgradeSpeedUiText(ability: Ability): string {
    const up: AbilitySpeedBoostUpgradeSpeed = ability.upgrades[ABILITY_SPEED_BOOST_UPGRADE_SPEED];
    return `${ABILITY_SPEED_BOOST_UPGRADE_SPEED}: ${(up.level * BONUS_SPEED_PER_LEVEL) * 100}%`;
}

function getAbilityUpgradeSpeedUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    textLines.push(`Speed Boost +${BONUS_SPEED_PER_LEVEL * 100}% increased speed`);
    return textLines;
}
