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
    numberStrikes: number,
    duration: number,
    spawnRadius: number,
    strikeRadius: number,
    tickInterval: number,
    strikeDelay: number,
}

const TARGETS = 6;
const TARGETS_PER_LEVEL = 6;
const BASE_TICK_INTERVAL = 500;
const DURATION = 5000;
const DURATION_PER_LEVEL = 1000;

export const ABILITY_LIGHTNING_BALL_UPGRADE_LIGHTNING_STRIKES = "Lightning Strikes";

export function addAbilityLightningBallUpgradeLightningStrikes() {
    ABILITY_LIGHTNING_BALL_UPGRADE_FUNCTIONS[ABILITY_LIGHTNING_BALL_UPGRADE_LIGHTNING_STRIKES] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getMoreInfoIncreaseOneLevelText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
        setUpgradeToBossLevel: setUpgradeToBossLevel,
    }
}

export function lightningBallUpgradeLightningStirkesExecute(ability: AbilityLightningBall, character: AbilityOwner, game: Game) {
    const upgrade: AbilityLightningBallUpgradeLightningStrikesBuff = ability.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_LIGHTNING_STRIKES];
    if (upgrade) {
        let damage = ability.damage;
        if (upgrade.bounceBallDamageBonus) {
            damage = getDamageAbilityLightningBall(ability, character);
        }
        const buff = createBuffLightningStrikes(
            upgrade.duration,
            game.state.time,
            damage,
            upgrade.spawnRadius,
            upgrade.strikeRadius,
            upgrade.numberStrikes,
            upgrade.strikeDelay,
            upgrade.tickInterval,
        );
        applyDebuff(buff, character as any, game);
        buff.abilityLightningStrikes!.id = ability.id;
    }
}

function setUpgradeToBossLevel(ability: Ability, level: number) {
    const up: AbilityLightningBallUpgradeLightningStrikesBuff = ability.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_LIGHTNING_STRIKES];
    if (!up) return;
    up.level = level;
    up.numberStrikes = level;
    up.spawnRadius = 400;
    up.duration = 5000 + level * 1000;
    up.strikeRadius = 50;
    up.strikeDelay = 1500;
}

function getOptions(ability: Ability, character: Character, game: Game): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_LIGHTNING_BALL_UPGRADE_LIGHTNING_STRIKES);
    options[0].option.displayMoreInfoText = getAbilityUpgradeUiTextLong(ability, options[0].option as any);
    const up: AbilityLightningBallUpgradeLightningStrikesBuff = ability.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_LIGHTNING_STRIKES];
    if (up && !up.bounceBallDamageBonus) {
        const lightningBall = character.abilities.find((a) => a.name === ABILITY_NAME_LIGHTNING_BALL);
        if (!lightningBall || lightningBall.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_BOUNCE_BONUS]) {
            const option: AbilityUpgradeOption = {
                displayText: `${ABILITY_LIGHTNING_BALL_UPGRADE_LIGHTNING_STRIKES} ball bounce bonus`,
                identifier: ABILITY_LIGHTNING_BALL_UPGRADE_LIGHTNING_STRIKES,
                additionalInfo: "Synergy",
                name: ability.name,
                type: "Ability",
                boss: true,
            }
            option.displayMoreInfoText = getAbilityUpgradeUiTextLong(ability, option);
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
        up = {
            level: 0,
            bounceBallDamageBonus: false,
            duration: DURATION,
            numberStrikes: TARGETS,
            spawnRadius: 0,
            strikeRadius: 20,
            tickInterval: BASE_TICK_INTERVAL,
            strikeDelay: 0,
        };
        as.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_LIGHTNING_STRIKES] = up;
    } else {
        up = as.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_LIGHTNING_STRIKES];
        up.duration += DURATION_PER_LEVEL;
        up.numberStrikes += TARGETS_PER_LEVEL;
    }
    if (option.additionalInfo === undefined) {
        up.level++;
        up.spawnRadius = 80 + up.level * 5;
    } else {
        up.bounceBallDamageBonus = true;
    }
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityLightningBallUpgradeLightningStrikesBuff = ability.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_LIGHTNING_STRIKES];
    const bounceBonus = up.bounceBallDamageBonus ? " +bounce bonus" : "";
    return `${ABILITY_LIGHTNING_BALL_UPGRADE_LIGHTNING_STRIKES}: Targets ${TARGETS * up.level}${bounceBonus}`;
}

function getAbilityUpgradeUiTextLong(ability: Ability, option: AbilityUpgradeOption): string[] {
    const textLines: string[] = [];
    const up: AbilityLightningBallUpgradeLightningStrikesBuff | undefined = ability.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_LIGHTNING_STRIKES];
    if (option.additionalInfo === undefined) {
        textLines.push(`When casting Lightning Ball you will`);
        textLines.push(`lightning strikes close enemies.`);
        if (up) {
            textLines.push(`lightning strikes increase from ${up.numberStrikes} to ${up.numberStrikes + TARGETS_PER_LEVEL}.`);
            textLines.push(`Duration increase from ${(up.duration) / 1000}s to ${(up.duration + DURATION_PER_LEVEL) / 1000}s`);
        } else {
            textLines.push(`${TARGETS} lightning strikes every ${BASE_TICK_INTERVAL / 1000}s.`);
            textLines.push(`Duration: ${DURATION / 1000}s.`);
        }
        textLines.push(`Does 100% damage.`);
    } else {
        textLines.push(`Lightning Strikes damage deal`);
        textLines.push(`bonus damage based on amount`);
        textLines.push(`of bounces of last bounce ball.`);
    }

    return textLines;
}
