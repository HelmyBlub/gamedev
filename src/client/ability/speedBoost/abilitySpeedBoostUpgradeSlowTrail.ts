import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS, AbilitySpeedBoost } from "./abilitySpeedBoost.js";

type AbilitySpeedBoostUpgradeSlowTrail = AbilityUpgrade & {
}

export const ABILITY_SPEED_BOOST_UPGARDE_SLOW_TRAIL = "Slow Trail";

export function addAbilitySpeedBoostUpgradeSlowTrail() {
    ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS[ABILITY_SPEED_BOOST_UPGARDE_SLOW_TRAIL] = {
        getUiText: getAbilityUpgradeSlowTrailUiText,
        getUiTextLong: getAbilityUpgradeSlowTrailUiTextLong,
        getOptions:getOptionsSlowTrail,
        executeOption: executeOptionSlowTrail,
    }
}

function getOptionsSlowTrail(ability: Ability): UpgradeOptionAndProbability[]{
    if (ability.upgrades[ABILITY_SPEED_BOOST_UPGARDE_SLOW_TRAIL]) return [];
    return getAbilityUpgradeOptionDefault(ABILITY_SPEED_BOOST_UPGARDE_SLOW_TRAIL);
}

function executeOptionSlowTrail(ability: Ability, option: AbilityUpgradeOption){
    let as = ability as AbilitySpeedBoost;
    let up: AbilitySpeedBoostUpgradeSlowTrail;
    if (as.upgrades[ABILITY_SPEED_BOOST_UPGARDE_SLOW_TRAIL] === undefined) {
        up = {level: 1};
        as.upgrades[ABILITY_SPEED_BOOST_UPGARDE_SLOW_TRAIL] = up;
    }
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
