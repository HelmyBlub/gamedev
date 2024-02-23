import { characterGetShield } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Ability, AbilityOwner } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_BOUNCE_BALL_UPGRADE_FUNCTIONS, AbilityBounceBall } from "./abilityBounceBall.js";

type AbilityBounceBallUpgradeBounceShield = AbilityUpgrade & {
}
const SHIELD_VALUE = 25;

export const ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_SHIELD = "Bounce Shield";

export function addAbilityBounceBallUpgradeBounceShield() {
    ABILITY_BOUNCE_BALL_UPGRADE_FUNCTIONS[ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_SHIELD] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getMoreInfoText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
    }
}

export function bounceBallUpgradeBounceShieldExecute(ability: AbilityBounceBall, owner: AbilityOwner) {
    const up: AbilityBounceBallUpgradeBounceShield = ability.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_SHIELD];
    if (!up) return;
    characterGetShield(owner as Character, up.level * SHIELD_VALUE);
}

function getOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_SHIELD);
    options[0].option.displayMoreInfoText = getAbilityUpgradeUiTextLong(ability);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption) {
    const ball = ability as AbilityBounceBall;
    let up: AbilityBounceBallUpgradeBounceShield;
    if (ball.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_SHIELD] === undefined) {
        up = { level: 0 };
        ball.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_SHIELD] = up;
    } else {
        up = ball.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_SHIELD];
    }
    up.level++;
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityBounceBallUpgradeBounceShield = ability.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_SHIELD];
    return `${ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_SHIELD}: ${(up.level * SHIELD_VALUE)}`;
}

function getAbilityUpgradeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityBounceBallUpgradeBounceShield | undefined = ability.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_SHIELD];
    if (upgrade) {
        textLines.push(
            `Gain shield for every bounce.`,
            `Shield per bounce increase from ${SHIELD_VALUE * upgrade.level} to ${SHIELD_VALUE * (upgrade.level + 1)}.`
        );
    } else {
        textLines.push(`Gain ${SHIELD_VALUE} shield for every bounce.`);
    }
    return textLines;
}
