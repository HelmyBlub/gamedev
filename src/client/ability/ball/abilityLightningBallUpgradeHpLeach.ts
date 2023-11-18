import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Ability, AbilityOwner } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_LIGHTNING_BALL_UPGRADE_FUNCTIONS, AbilityLightningBall } from "./abilityLightningBall.js";

type AbilityLightningBallUpgradeLightningStrikesBuff = AbilityUpgrade & {
    healPerPixelTraveled: number
}

const HEAL_PER_PIXEL_TRAVELED = 0.1;

export const ABILITY_LIGHTNING_BALL_UPGARDE_HP_LEACH = "HP Generation";

export function addAbilityLightningStrikesUpgradeHpLeach() {
    ABILITY_LIGHTNING_BALL_UPGRADE_FUNCTIONS[ABILITY_LIGHTNING_BALL_UPGARDE_HP_LEACH] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getLongExplainText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
    }
}

export function lightningBallUpgradeHpLeachExecute(ability: AbilityLightningBall, distanceTraveled: number, owner: AbilityOwner) {
    const up: AbilityLightningBallUpgradeLightningStrikesBuff = ability.upgrades[ABILITY_LIGHTNING_BALL_UPGARDE_HP_LEACH];
    if (up && owner.hp) {
        owner.hp += up.healPerPixelTraveled * distanceTraveled;
        if (owner.hp > owner.maxHp!) {
            owner.hp = owner.maxHp;
        }
    }
}

function getOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_LIGHTNING_BALL_UPGARDE_HP_LEACH);
    options[0].option.displayLongText = getAbilityUpgradeUiTextLong(ability);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilityLightningBall;
    let up: AbilityLightningBallUpgradeLightningStrikesBuff;
    if (as.upgrades[ABILITY_LIGHTNING_BALL_UPGARDE_HP_LEACH] === undefined) {
        up = { level: 0, healPerPixelTraveled: 0 };
        as.upgrades[ABILITY_LIGHTNING_BALL_UPGARDE_HP_LEACH] = up;
    } else {
        up = as.upgrades[ABILITY_LIGHTNING_BALL_UPGARDE_HP_LEACH];
    }
    up.level++;
    up.healPerPixelTraveled += HEAL_PER_PIXEL_TRAVELED;
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityLightningBallUpgradeLightningStrikesBuff = ability.upgrades[ABILITY_LIGHTNING_BALL_UPGARDE_HP_LEACH];
    return `${ABILITY_LIGHTNING_BALL_UPGARDE_HP_LEACH}: ${up.healPerPixelTraveled.toFixed(2)}`;
}

function getAbilityUpgradeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    textLines.push(`When using Lightning Ball you will`);
    textLines.push(`heal for distance traveled.`);
    textLines.push(`${HEAL_PER_PIXEL_TRAVELED.toFixed(2)} heal per pixel traveled.`);

    return textLines;
}
