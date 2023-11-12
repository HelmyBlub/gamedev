import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_BOUNCE_BALL_UPGRADE_FUNCTIONS, AbilityBounceBall } from "./abilityBounceBall.js";

type AbilityBounceBallUpgradeBounceBonusDamage = AbilityUpgrade & {
    bounces: number,
}

const BONUS_DAMAGE_PER_LEVEL = 1;

export const ABILITY_BOUNCE_BALL_UPGARDE_BOUNCE_BONUS_DAMAGE = "Bounce Bonus Damage";

export function addAbilitySpeedBoostUpgradeBounceBonusDamage() {
    ABILITY_BOUNCE_BALL_UPGRADE_FUNCTIONS[ABILITY_BOUNCE_BALL_UPGARDE_BOUNCE_BONUS_DAMAGE] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getDamageFactor: getDamageFactor,
        getLongExplainText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
    }
}

export function abilityBounceBallUpgradeBounceBonusDamageAddBounce(ability: Ability){
    const up: AbilityBounceBallUpgradeBounceBonusDamage = ability.upgrades[ABILITY_BOUNCE_BALL_UPGARDE_BOUNCE_BONUS_DAMAGE];
    if(!up) return;
    up.bounces++;
}

export function abilityBounceBallUpgradeBounceBonusDamageResetBounces(ability: Ability){
    const up: AbilityBounceBallUpgradeBounceBonusDamage = ability.upgrades[ABILITY_BOUNCE_BALL_UPGARDE_BOUNCE_BONUS_DAMAGE];
    if(!up) return;
    up.bounces = 0;
}

function getDamageFactor(ability: Ability): number{
    const up: AbilityBounceBallUpgradeBounceBonusDamage = ability.upgrades[ABILITY_BOUNCE_BALL_UPGARDE_BOUNCE_BONUS_DAMAGE];
    if(!up) return 1;
    return 1 + up.level * up.bounces * BONUS_DAMAGE_PER_LEVEL;
}

function getOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_BOUNCE_BALL_UPGARDE_BOUNCE_BONUS_DAMAGE);
    options[0].option.displayLongText = getAbilityUpgradeUiTextLong(ability);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption){
    const ball = ability as AbilityBounceBall;
    let up: AbilityBounceBallUpgradeBounceBonusDamage;
    if (ball.upgrades[ABILITY_BOUNCE_BALL_UPGARDE_BOUNCE_BONUS_DAMAGE] === undefined) {
        up = {level: 0, bounces: 0};
        ball.upgrades[ABILITY_BOUNCE_BALL_UPGARDE_BOUNCE_BONUS_DAMAGE] = up;
    } else {
        up = ball.upgrades[ABILITY_BOUNCE_BALL_UPGARDE_BOUNCE_BONUS_DAMAGE];
    }
    up.level++;
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityBounceBallUpgradeBounceBonusDamage = ability.upgrades[ABILITY_BOUNCE_BALL_UPGARDE_BOUNCE_BONUS_DAMAGE];
    return `${ABILITY_BOUNCE_BALL_UPGARDE_BOUNCE_BONUS_DAMAGE}: ${up.level * BONUS_DAMAGE_PER_LEVEL * 100}%. Bounces: ${up.bounces}` ;
}

function getAbilityUpgradeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    textLines.push(
        `Each Bounce while rolling increases damage`,
        `by ${BONUS_DAMAGE_PER_LEVEL * 100}%.`
    );
    return textLines;
}
