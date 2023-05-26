import { Game } from "../../gameModel.js";
import { Ability, AbilityOwner, AbilityUpgradeOption } from "../ability.js";
import { AbilityUpgrade } from "../abilityUpgrade.js";
import { ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS, AbilitySpeedBoost } from "./abilitySpeedBoost.js";

export type AbilitySpeedBoostUpgradeAddCharge = AbilityUpgrade & {
    currentCharges: number,
    maxCharges: number,
}

export const ABILITY_SPEED_BOOST_UPGARDE_ADD_CHARGE = "Additional Charge";

export function addAbilitySpeedBoostUpgradeAddCharge() {
    ABILITY_SPEED_BOOST_UPGRADE_FUNCTIONS[ABILITY_SPEED_BOOST_UPGARDE_ADD_CHARGE] = {
        getAbilityUpgradeUiText: getAbilityUpgradeAddChargeUiText,
        getAbilityUpgradeUiTextLong: getAbilityUpgradeAddChargeUiTextLong,
        pushAbilityUpgradeOption: pushAbilityUpgradeAddCharge,
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

function pushAbilityUpgradeAddCharge(ability: Ability, upgradeOptions: AbilityUpgradeOption[]) {
    upgradeOptions.push({
        name: ABILITY_SPEED_BOOST_UPGARDE_ADD_CHARGE, probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySpeedBoost;
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
    });
}

function getAbilityUpgradeAddChargeUiText(ability: Ability): string {
    const upgrade: AbilitySpeedBoostUpgradeAddCharge = ability.upgrades[ABILITY_SPEED_BOOST_UPGARDE_ADD_CHARGE];
    return `${ABILITY_SPEED_BOOST_UPGARDE_ADD_CHARGE}s: +${upgrade.maxCharges-1}`;
}

function getAbilityUpgradeAddChargeUiTextLong(ability: Ability): string[] {
    const abilitySpeedBoost = ability as AbilitySpeedBoost;
    const upgrade: AbilityUpgrade | undefined = abilitySpeedBoost.upgrades[ABILITY_SPEED_BOOST_UPGARDE_ADD_CHARGE];
    const textLines: string[] = [];
    const levelText = (upgrade ? `(${upgrade.level + 1})` : "");

    textLines.push(ABILITY_SPEED_BOOST_UPGARDE_ADD_CHARGE + levelText);
    textLines.push(`Add an additional charge to speed boost ability.`);
    return textLines;
}
