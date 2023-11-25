import { Character } from "../../character/characterModel.js";
import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { createBuffLightningStrikes } from "../../debuff/buffLightningStrikes.js";
import { applyDebuff } from "../../debuff/debuff.js";
import { Game } from "../../gameModel.js";
import { Ability, AbilityOwner } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_LIGHTNING_BALL_UPGRADE_FUNCTIONS, ABILITY_NAME_LIGHTNING_BALL, AbilityLightningBall, getDamageAbilityLightningBall } from "./abilityLightningBall.js";
import { ABILITY_LIGHTNING_BALL_UPGRADE_BOUNCE_BONUS } from "./abilityLightningBallUpgradeBounceBonus.js";

type AbilityLightningBallUpgradeLightningStrikesBuff = AbilityUpgrade & {
    bounceBallDamageBonus: boolean,
}

const TARGETS = 6;

export const ABILITY_LIGHTNING_BALL_UPGRADE_LIGHTNING_STRIKES = "Lightning Strikes";

export function addAbilityLightningBallUpgradeLightningStrikes() {
    ABILITY_LIGHTNING_BALL_UPGRADE_FUNCTIONS[ABILITY_LIGHTNING_BALL_UPGRADE_LIGHTNING_STRIKES] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getLongExplainText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
    }
}

export function lightningBallUpgradeLightningStirkesExecute(ability: AbilityLightningBall, character: AbilityOwner, game: Game){
    const upgrade: AbilityLightningBallUpgradeLightningStrikesBuff = ability.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_LIGHTNING_STRIKES];
    if (upgrade) {
        let damage = ability.damage;
        if(upgrade.bounceBallDamageBonus){
            damage = getDamageAbilityLightningBall(ability, character);
        }
        const buff = createBuffLightningStrikes(
            5000 + upgrade.level * 1000,
            game.state.time,
            damage,
            80 + upgrade.level * 5,
            upgrade.level * TARGETS,
        );
        applyDebuff(buff, character as any, game);
        buff.abilityLightningStrikes!.id = ability.id;
    }
}

function getOptions(ability: Ability, character: Character, game: Game): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_LIGHTNING_BALL_UPGRADE_LIGHTNING_STRIKES);
    options[0].option.displayLongText = getAbilityUpgradeUiTextLong(ability, options[0].option as any);
    const up: AbilityLightningBallUpgradeLightningStrikesBuff = ability.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_LIGHTNING_STRIKES];
    if(up && !up.bounceBallDamageBonus){
        const lightningBall = character.abilities.find((a) => a.name === ABILITY_NAME_LIGHTNING_BALL);
        if(!lightningBall || lightningBall.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_BOUNCE_BONUS]){
            const option: AbilityUpgradeOption = {
                displayText: `${ABILITY_LIGHTNING_BALL_UPGRADE_LIGHTNING_STRIKES} ball bounce bonus`,
                identifier: ABILITY_LIGHTNING_BALL_UPGRADE_LIGHTNING_STRIKES,
                additionalInfo: "Synergy",
                name: ability.name,
                type: "Ability",
                boss: true,
            }
            option.displayLongText = getAbilityUpgradeUiTextLong(ability, option);
            options.push({
                option: option,
                probability: 1,
            });            
        }
    }

    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilityLightningBall;
    let up: AbilityLightningBallUpgradeLightningStrikesBuff;
    if (as.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_LIGHTNING_STRIKES] === undefined) {
        up = { level: 0, bounceBallDamageBonus: false};
        as.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_LIGHTNING_STRIKES] = up;
    } else {
        up = as.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_LIGHTNING_STRIKES];
    }
    if(option.additionalInfo === undefined){
        up.level++;
    }else{
        up.bounceBallDamageBonus = true;
    }
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityLightningBallUpgradeLightningStrikesBuff = ability.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_LIGHTNING_STRIKES];
    return `${ABILITY_LIGHTNING_BALL_UPGRADE_LIGHTNING_STRIKES}: ${up.level * 3}`;
}

function getAbilityUpgradeUiTextLong(ability: Ability, option: AbilityUpgradeOption): string[] {
    const textLines: string[] = [];
    if(option.additionalInfo === undefined){
        textLines.push(`When using Lightning Ball you will`);
        textLines.push(`lightning strikes close enemies.`);
        textLines.push(`hits upgrade level x ${TARGETS} targets.`);
        textLines.push(`100% damage.`);
    }else{
        textLines.push(`Lightning Strikes damage`);
        textLines.push(`deal bonus damage based on `);
        textLines.push(`amount of bounces of last bounce ball.`);
    }

    return textLines;
}
