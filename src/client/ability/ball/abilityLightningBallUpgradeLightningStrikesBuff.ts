import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { createBuffLightningStrikes } from "../../debuff/buffLightningStrikes.js";
import { applyDebuff } from "../../debuff/debuff.js";
import { Game } from "../../gameModel.js";
import { Ability, AbilityOwner } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_LIGHTNING_BALL_UPGRADE_FUNCTIONS, AbilityLightningBall } from "./abilityLightningBall.js";

type AbilityLightningBallUpgradeLightningStrikesBuff = AbilityUpgrade & {
}

export const ABILITY_LIGHTNING_BALL_UPGARDE_LIGHTNING_STRIKES = "Lightning Strikes";

export function addAbilityLightningBallUpgradeLightningStrikes() {
    ABILITY_LIGHTNING_BALL_UPGRADE_FUNCTIONS[ABILITY_LIGHTNING_BALL_UPGARDE_LIGHTNING_STRIKES] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getLongExplainText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
    }
}

export function lightningBallUpgradeLightningStirkesExecute(ability: AbilityLightningBall, character: AbilityOwner, game: Game){
    const upgrade = ability.upgrades[ABILITY_LIGHTNING_BALL_UPGARDE_LIGHTNING_STRIKES];
    if (upgrade) {
        const buff = createBuffLightningStrikes(
            5000 + upgrade.level * 1000,
            game.state.time,
            ability.damage,
            30 + upgrade.level * 10,
            upgrade.level * 3,
        );
        applyDebuff(buff, character as any, game);
        buff.abilityLightningStrikes!.id = ability.id;
    }
}

function getOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_LIGHTNING_BALL_UPGARDE_LIGHTNING_STRIKES);
    options[0].option.displayLongText = getAbilityUpgradeUiTextLong(ability);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilityLightningBall;
    let up: AbilityLightningBallUpgradeLightningStrikesBuff;
    if (as.upgrades[ABILITY_LIGHTNING_BALL_UPGARDE_LIGHTNING_STRIKES] === undefined) {
        up = { level: 0 };
        as.upgrades[ABILITY_LIGHTNING_BALL_UPGARDE_LIGHTNING_STRIKES] = up;
    } else {
        up = as.upgrades[ABILITY_LIGHTNING_BALL_UPGARDE_LIGHTNING_STRIKES];
    }
    up.level++;
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityLightningBallUpgradeLightningStrikesBuff = ability.upgrades[ABILITY_LIGHTNING_BALL_UPGARDE_LIGHTNING_STRIKES];
    return `${ABILITY_LIGHTNING_BALL_UPGARDE_LIGHTNING_STRIKES}: ${up.level * 3}`;
}

function getAbilityUpgradeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    textLines.push(`When using Lightning Ball you will`);
    textLines.push(`lightning strikes close enemies.`);
    textLines.push(`hits upgrade level x 3 targets.`);
    textLines.push(`100% damage.`);

    return textLines;
}
