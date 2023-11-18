import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS, AbilitySpeedBoost } from "./abilitySpeedBoost.js";

type AbilitySpeedBoostUpgradeSlowTrail = AbilityUpgrade & {
}

export const ABILITY_SPEED_BOOST_UPGRADE_SLOW_TRAIL = "Slow Trail";

export function addAbilitySpeedBoostUpgradeSlowTrail() {
    ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS[ABILITY_SPEED_BOOST_UPGRADE_SLOW_TRAIL] = {
        getStatsDisplayText: getAbilityUpgradeSlowTrailUiText,
        getLongExplainText: getAbilityUpgradeSlowTrailUiTextLong,
        getOptions:getOptionsSlowTrail,
        executeOption: executeOptionSlowTrail,
    }
}

function getOptionsSlowTrail(ability: Ability): UpgradeOptionAndProbability[]{
    if (ability.upgrades[ABILITY_SPEED_BOOST_UPGRADE_SLOW_TRAIL]) return [];
    const options =  getAbilityUpgradeOptionDefault(ability, ABILITY_SPEED_BOOST_UPGRADE_SLOW_TRAIL);
    options[0].option.displayLongText = getAbilityUpgradeSlowTrailUiTextLong(ability);
    return options;
}

function executeOptionSlowTrail(ability: Ability, option: AbilityUpgradeOption){
    const as = ability as AbilitySpeedBoost;
    let up: AbilitySpeedBoostUpgradeSlowTrail;
    if (as.upgrades[ABILITY_SPEED_BOOST_UPGRADE_SLOW_TRAIL] === undefined) {
        up = {level: 1};
        as.upgrades[ABILITY_SPEED_BOOST_UPGRADE_SLOW_TRAIL] = up;
    }
}

function getAbilityUpgradeSlowTrailUiText(ability: Ability): string {
    return ABILITY_SPEED_BOOST_UPGRADE_SLOW_TRAIL;
}

function getAbilityUpgradeSlowTrailUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    textLines.push(`When activating the speed boost, you will leave`);
    textLines.push(`a trail behind which slows enemies.`);

    return textLines;
}
