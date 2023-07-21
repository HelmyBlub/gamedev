import { AbilityUpgradeOption } from "../../character/upgrade.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade } from "../abilityUpgrade.js";
import { ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS, AbilitySpeedBoost } from "./abilitySpeedBoost.js";

type AbilitySpeedBoostUpgradeSpeed = AbilityUpgrade & {
}
const BONUS_SPEED_PER_LEVEL = 0.5;

export const ABILITY_SPEED_BOOST_UPGARDE_SPEED = "Speed Boost +Speed";

export function addAbilitySpeedBoostUpgradeSpeed() {
    ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS[ABILITY_SPEED_BOOST_UPGARDE_SPEED] = {
        getUiText: getAbilityUpgradeSpeedUiText,
        getUiTextLong: getAbilityUpgradeSpeedUiTextLong,
        executeOption: executeOptionSpeed,
    }
}

function executeOptionSpeed(ability: Ability, option: AbilityUpgradeOption){
    let as = ability as AbilitySpeedBoost;
    let up: AbilitySpeedBoostUpgradeSpeed;
    if (as.upgrades[ABILITY_SPEED_BOOST_UPGARDE_SPEED] === undefined) {
        up = {level: 0};
        as.upgrades[ABILITY_SPEED_BOOST_UPGARDE_SPEED] = up;
    } else {
        up = as.upgrades[ABILITY_SPEED_BOOST_UPGARDE_SPEED];
    }
    up.level++;
    as.speedFactor += BONUS_SPEED_PER_LEVEL;
}

function getAbilityUpgradeSpeedUiText(ability: Ability): string {
    let up: AbilitySpeedBoostUpgradeSpeed = ability.upgrades[ABILITY_SPEED_BOOST_UPGARDE_SPEED];
    return `${ABILITY_SPEED_BOOST_UPGARDE_SPEED}: ${(up.level * BONUS_SPEED_PER_LEVEL) * 100}%`;
}

function getAbilityUpgradeSpeedUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityUpgrade | undefined  = ability.upgrades[ABILITY_SPEED_BOOST_UPGARDE_SPEED];
    const levelText = (upgrade ? `(${upgrade.level + 1})` : "");
    textLines.push(ABILITY_SPEED_BOOST_UPGARDE_SPEED + levelText);
    textLines.push(`Speed Boost +${BONUS_SPEED_PER_LEVEL*100}% increased speed`);

    return textLines;
}
