import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS, AbilitySpeedBoost } from "./abilitySpeedBoost.js";

type AbilitySpeedBoostUpgradeDuration = AbilityUpgrade & {
}

const BONUS_DURATION_PER_LEVEL = 1000;

export const ABILITY_SPEED_BOOST_UPGARDE_DURATION = "Speed Boost +Duration";

export function addAbilitySpeedBoostUpgradeDuration() {
    ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS[ABILITY_SPEED_BOOST_UPGARDE_DURATION] = {
        getStatsDisplayText: getAbilityUpgradeDurationUiText,
        getLongExplainText: getAbilityUpgradeDurationUiTextLong,
        getOptions: getOptionsDuration,
        executeOption: executeOptionDuration,
    }
}

function getOptionsDuration(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_SPEED_BOOST_UPGARDE_DURATION);
    options[0].option.displayLongText = getAbilityUpgradeDurationUiTextLong(ability);
    return options;
}

function executeOptionDuration(ability: Ability, option: AbilityUpgradeOption){
    const as = ability as AbilitySpeedBoost;
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

function getAbilityUpgradeDurationUiText(ability: Ability): string {
    const up: AbilitySpeedBoostUpgradeDuration = ability.upgrades[ABILITY_SPEED_BOOST_UPGARDE_DURATION];
    return `${ABILITY_SPEED_BOOST_UPGARDE_DURATION}: ${(up.level * BONUS_DURATION_PER_LEVEL / 1000).toFixed(2)}s`;
}

function getAbilityUpgradeDurationUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    textLines.push(`Speed Boost +${BONUS_DURATION_PER_LEVEL/1000}s increased duration`);
    return textLines;
}
