import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_BOUNCE_BALL_UPGRADE_FUNCTIONS, AbilityBounceBall } from "./abilityBounceBall.js";

type AbilityBounceBallUpgradeBonusAngle = AbilityUpgrade & {
}
const BONUS_ANGLE_PER_LEVEL = 0.005;

export const ABILITY_BOUNCE_BALL_UPGARDE_BOUNCE_BONUS_ANGLE = "Incease Angle Change";

export function addAbilitySpeedBoostUpgradeAngleChange() {
    ABILITY_BOUNCE_BALL_UPGRADE_FUNCTIONS[ABILITY_BOUNCE_BALL_UPGARDE_BOUNCE_BONUS_ANGLE] = {
        getStatsDisplayText: getAbilityUpgradeSpeedUiText,
        getLongExplainText: getAbilityUpgradeSpeedUiTextLong,
        getOptions: getOptionsSpeed,
        executeOption: executeOptionSpeed,
    }
}

function getOptionsSpeed(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_BOUNCE_BALL_UPGARDE_BOUNCE_BONUS_ANGLE);
    options[0].option.displayLongText = getAbilityUpgradeSpeedUiTextLong(ability);
    return options;
}

function executeOptionSpeed(ability: Ability, option: AbilityUpgradeOption){
    const ball = ability as AbilityBounceBall;
    let up: AbilityBounceBallUpgradeBonusAngle;
    if (ball.upgrades[ABILITY_BOUNCE_BALL_UPGARDE_BOUNCE_BONUS_ANGLE] === undefined) {
        up = {level: 0};
        ball.upgrades[ABILITY_BOUNCE_BALL_UPGARDE_BOUNCE_BONUS_ANGLE] = up;
    } else {
        up = ball.upgrades[ABILITY_BOUNCE_BALL_UPGARDE_BOUNCE_BONUS_ANGLE];
    }
    up.level++;
    ball.maxAngleChangePetTick += BONUS_ANGLE_PER_LEVEL;
}

function getAbilityUpgradeSpeedUiText(ability: Ability): string {
    const up: AbilityBounceBallUpgradeBonusAngle = ability.upgrades[ABILITY_BOUNCE_BALL_UPGARDE_BOUNCE_BONUS_ANGLE];
    return `${ABILITY_BOUNCE_BALL_UPGARDE_BOUNCE_BONUS_ANGLE}: ${(up.level * BONUS_ANGLE_PER_LEVEL * 60 / Math.PI / 2 * 360).toFixed(0)}°`;
}

function getAbilityUpgradeSpeedUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    textLines.push(`Angle Change per second increase by ${(BONUS_ANGLE_PER_LEVEL * 60 / Math.PI / 2 * 360).toFixed(0)}°`);
    return textLines;
}
