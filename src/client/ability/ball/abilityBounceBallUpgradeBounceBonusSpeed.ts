import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_BOUNCE_BALL_UPGRADE_FUNCTIONS, AbilityBounceBall } from "./abilityBounceBall.js";

type AbilityBounceBallUpgradeBounceBonusSpeed = AbilityUpgrade & {
}
const BONUS_SPEED_PER_LEVEL = 0.5;

export const ABILITY_BOUNCE_BALL_UPGARDE_BOUNCE_BONUS_SPEED = "Bounce Bonus Speed";

export function addAbilitySpeedBoostUpgradeSpeed() {
    ABILITY_BOUNCE_BALL_UPGRADE_FUNCTIONS[ABILITY_BOUNCE_BALL_UPGARDE_BOUNCE_BONUS_SPEED] = {
        getStatsDisplayText: getAbilityUpgradeSpeedUiText,
        getLongExplainText: getAbilityUpgradeSpeedUiTextLong,
        getOptions: getOptionsSpeed,
        executeOption: executeOptionSpeed,
    }
}

function getOptionsSpeed(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_BOUNCE_BALL_UPGARDE_BOUNCE_BONUS_SPEED);
    options[0].option.displayLongText = getAbilityUpgradeSpeedUiTextLong(ability);
    return options;
}

function executeOptionSpeed(ability: Ability, option: AbilityUpgradeOption){
    const ball = ability as AbilityBounceBall;
    let up: AbilityBounceBallUpgradeBounceBonusSpeed;
    if (ball.upgrades[ABILITY_BOUNCE_BALL_UPGARDE_BOUNCE_BONUS_SPEED] === undefined) {
        up = {level: 0};
        ball.upgrades[ABILITY_BOUNCE_BALL_UPGARDE_BOUNCE_BONUS_SPEED] = up;
    } else {
        up = ball.upgrades[ABILITY_BOUNCE_BALL_UPGARDE_BOUNCE_BONUS_SPEED];
    }
    up.level++;
    ball.bounceBonusSpeed += BONUS_SPEED_PER_LEVEL;
}

function getAbilityUpgradeSpeedUiText(ability: Ability): string {
    const up: AbilityBounceBallUpgradeBounceBonusSpeed = ability.upgrades[ABILITY_BOUNCE_BALL_UPGARDE_BOUNCE_BONUS_SPEED];
    return `${ABILITY_BOUNCE_BALL_UPGARDE_BOUNCE_BONUS_SPEED}: ${(up.level * BONUS_SPEED_PER_LEVEL)}`;
}

function getAbilityUpgradeSpeedUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    textLines.push(`Bounce Bonus Speed increase by +${BONUS_SPEED_PER_LEVEL}`);
    return textLines;
}
