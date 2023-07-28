import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Game } from "../../gameModel.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS, AbilitySpeedBoost } from "./abilitySpeedBoost.js";

export type AbilitySpeedBoostUpgradeAddCharge = AbilityUpgrade & {
    currentCharges: number,
    maxCharges: number,
}

export const ABILITY_SPEED_BOOST_UPGARDE_ADD_CHARGE = "Additional Charge";

export function addAbilitySpeedBoostUpgradeAddCharge() {
    ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS[ABILITY_SPEED_BOOST_UPGARDE_ADD_CHARGE] = {
        getStatsDisplayText: getAbilityUpgradeAddChargeUiText,
        getLongExplainText: getAbilityUpgradeAddChargeUiTextLong,
        getOptions: getOptionsAddCharge,
        executeOption: executeAddCharge,
    }
}

export function tickAbilitySpeedBoostUpgradeAddCharge(abilitySpeedBoost: AbilitySpeedBoost, game: Game) {
    const chargeUpgrade: AbilitySpeedBoostUpgradeAddCharge | undefined = abilitySpeedBoost.upgrades[ABILITY_SPEED_BOOST_UPGARDE_ADD_CHARGE];
    if (chargeUpgrade) {
        if (chargeUpgrade.currentCharges < chargeUpgrade.maxCharges) {
            if (abilitySpeedBoost.cooldownFinishTime <= game.state.time) {
                chargeUpgrade.currentCharges++;
                if (chargeUpgrade.currentCharges < chargeUpgrade.maxCharges) {
                    abilitySpeedBoost.cooldownFinishTime = game.state.time + abilitySpeedBoost.cooldown;
                }
            }
        }
    }
}

function getOptionsAddCharge(ability: Ability): UpgradeOptionAndProbability[] {
    let options = getAbilityUpgradeOptionDefault(ability, ABILITY_SPEED_BOOST_UPGARDE_ADD_CHARGE);
    const upgrade: AbilitySpeedBoostUpgradeAddCharge | undefined = ability.upgrades[ABILITY_SPEED_BOOST_UPGARDE_ADD_CHARGE];
    const levelText = upgrade === undefined ? "" : `(${upgrade.level})`;
    options[0].option.displayText += levelText;
    options[0].option.displayLongText = getAbilityUpgradeAddChargeUiTextLong(ability);
    return options;
}

function executeAddCharge(ability: Ability, option: AbilityUpgradeOption){
    let as = ability as AbilitySpeedBoost;
    let up: AbilitySpeedBoostUpgradeAddCharge;
    if (as.upgrades[ABILITY_SPEED_BOOST_UPGARDE_ADD_CHARGE] === undefined) {
        up = {
            level: 0,
            maxCharges: 1,
            currentCharges: 1,
        }
        as.upgrades[ABILITY_SPEED_BOOST_UPGARDE_ADD_CHARGE] = up;
    } else {
        up = as.upgrades[ABILITY_SPEED_BOOST_UPGARDE_ADD_CHARGE];
    }
    up.level++;
    up.maxCharges += 1;
    up.currentCharges += 1;
}

function getAbilityUpgradeAddChargeUiText(ability: Ability): string {
    const upgrade: AbilitySpeedBoostUpgradeAddCharge = ability.upgrades[ABILITY_SPEED_BOOST_UPGARDE_ADD_CHARGE];
    return `${ABILITY_SPEED_BOOST_UPGARDE_ADD_CHARGE}s: +${upgrade.maxCharges-1}`;
}

function getAbilityUpgradeAddChargeUiTextLong(ability: Ability): string[] {
    const abilitySpeedBoost = ability as AbilitySpeedBoost;
    const upgrade: AbilityUpgrade | undefined = abilitySpeedBoost.upgrades[ABILITY_SPEED_BOOST_UPGARDE_ADD_CHARGE];
    const textLines: string[] = [];

    textLines.push(`Add an additional charge to speed boost ability.`);
    return textLines;
}
