import { Character } from "../../character/characterModel.js";
import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Game } from "../../gameModel.js";
import { Ability, AbilityOwner } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_BOUNCE_BALL_UPGRADE_FUNCTIONS, ABILITY_NAME_BOUNCE_BALL } from "./abilityBounceBall.js";
import { ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_BONUS_DAMAGE, AbilityBounceBallUpgradeBounceBonusDamage } from "./abilityBounceBallUpgradeBounceBonusDamage.js";
import { ABILITY_LIGHTNING_BALL_UPGRADE_FUNCTIONS, AbilityLightningBall } from "./abilityLightningBall.js";

type AbilityLightningBallUpgradeBounceBonus = AbilityUpgrade & {
    bonusFactor: number,
}

export const ABILITY_LIGHTNING_BALL_UPGRADE_BOUNCE_BONUS = "Bounce Ball Bonus";

export function addAbilityLightningBallUpgradeBounceBonus() {
    ABILITY_LIGHTNING_BALL_UPGRADE_FUNCTIONS[ABILITY_LIGHTNING_BALL_UPGRADE_BOUNCE_BONUS] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getMoreInfoText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
    }
}

export function lightningBallUpgradeBounceBonusSetBonusDamageFactor(ability: AbilityLightningBall, owner: AbilityOwner) {
    const up: AbilityLightningBallUpgradeBounceBonus = ability.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_BOUNCE_BONUS];
    if (up) {
        const character: Character = owner as any;
        const bounceBall = character.abilities.find((a) => a.name === ABILITY_NAME_BOUNCE_BALL);
        if (bounceBall) {
            const bounceBallBounceUpgrade: AbilityBounceBallUpgradeBounceBonusDamage = bounceBall.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_BONUS_DAMAGE];
            if (bounceBallBounceUpgrade) {
                const bounceBallUpgradeFunction = ABILITY_BOUNCE_BALL_UPGRADE_FUNCTIONS[ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_BONUS_DAMAGE];
                if (bounceBallUpgradeFunction.getDamageFactor) {
                    up.bonusFactor = bounceBallUpgradeFunction.getDamageFactor(bounceBall, false);
                }
            }
        }
    }
}

export function lightningBallUpgradeBounceBonusGetBonusDamageFactor(ability: AbilityLightningBall, owner: AbilityOwner) {
    const up: AbilityLightningBallUpgradeBounceBonus = ability.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_BOUNCE_BONUS];
    if (up) {
        return up.bonusFactor;
    }
    return 1;
}

function getOptions(ability: Ability, character: Character, game: Game): UpgradeOptionAndProbability[] {
    const up: AbilityLightningBallUpgradeBounceBonus = ability.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_BOUNCE_BONUS];
    if (up) return [];
    const bounceBall = character.abilities.find((a) => a.name === ABILITY_NAME_BOUNCE_BALL);
    if (!bounceBall || !bounceBall.upgrades[ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_BONUS_DAMAGE]) {
        return [];
    }
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_LIGHTNING_BALL_UPGRADE_BOUNCE_BONUS);
    options[0].option.displayMoreInfoText = getAbilityUpgradeUiTextLong(ability);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilityLightningBall;
    let up: AbilityLightningBallUpgradeBounceBonus;
    if (as.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_BOUNCE_BONUS] === undefined) {
        up = { level: 1, bonusFactor: 1 };
        as.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_BOUNCE_BONUS] = up;
    }
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityLightningBallUpgradeBounceBonus = ability.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_BOUNCE_BONUS];
    return `${ABILITY_LIGHTNING_BALL_UPGRADE_BOUNCE_BONUS}`;
}

function getAbilityUpgradeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    textLines.push(`When using Lightning Ball you will`);
    textLines.push(`deal bonus damage based on `);
    textLines.push(`amount of bounces of last bounce ball.`);

    return textLines;
}
