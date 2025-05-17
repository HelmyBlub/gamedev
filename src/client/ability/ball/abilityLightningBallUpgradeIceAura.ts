import { Character } from "../../character/characterModel.js";
import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { debuffSlowGetSlowAmountAsPerCentText } from "../../debuff/debuffSlow.js";
import { Game } from "../../gameModel.js";
import { Ability, AbilityOwner } from "../ability.js";
import { createAbilityObjectIceAura } from "../abilityIceAura.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_LIGHTNING_BALL_UPGRADE_FUNCTIONS, AbilityLightningBall } from "./abilityLightningBall.js";

type AbilityLightningBallUpgradeIceAura = AbilityUpgrade & {
    duration: number,
    damageFactor: number,
    slowFactor: number,
    radius: number,
}
const DURATION_PER_LEVEL = 1000;
const DAMAGE_PER_LEVEL = 0.5;
const DURATION = 5000;
const SLOW = 1;
const SLOW_PER_LEVEL = 0.5;
const RADIUS = 60;
const RADIUS_PER_LEVEL = 20;

export const ABILITY_LIGHTNING_BALL_UPGRADE_ICE_AURA = "Ice Field on End";

export function addAbilityLightningBallUpgradeIceAura() {
    ABILITY_LIGHTNING_BALL_UPGRADE_FUNCTIONS[ABILITY_LIGHTNING_BALL_UPGRADE_ICE_AURA] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getMoreInfoIncreaseOneLevelText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
        setUpgradeToBossLevel: setUpgradeToBossLevel,
    }
}

export function lightningBallUpgradeIceAuraExecute(ability: AbilityLightningBall, character: AbilityOwner, game: Game) {
    const upgrade: AbilityLightningBallUpgradeIceAura = ability.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_ICE_AURA];
    if (!upgrade) return;
    const deleteTime = game.state.time + upgrade.duration;
    const iceField = createAbilityObjectIceAura(upgrade.damageFactor * ability.damage, upgrade.radius, upgrade.slowFactor, character.faction, character.x, character.y, deleteTime, ability.id);
    game.state.abilityObjects.push(iceField);
}

function setUpgradeToBossLevel(ability: Ability, level: number) {
    const up: AbilityLightningBallUpgradeIceAura = ability.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_ICE_AURA];
    if (!up) return;
    up.level = level;
    up.duration = 3000 + level * 2000;
    up.radius = 40 + 15 * level;
    up.slowFactor = 1 + level * 0.2;
}

function getOptions(ability: Ability, character: Character, game: Game): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_LIGHTNING_BALL_UPGRADE_ICE_AURA);
    options[0].option.displayMoreInfoText = getAbilityUpgradeUiTextLong(ability, options[0].option as any);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilityLightningBall;
    let up: AbilityLightningBallUpgradeIceAura;
    if (as.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_ICE_AURA] === undefined) {
        up = { level: 0, damageFactor: 0, duration: DURATION, slowFactor: 1 + SLOW, radius: RADIUS };
        as.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_ICE_AURA] = up;
    } else {
        up = as.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_ICE_AURA];
        up.duration += DURATION_PER_LEVEL;
        up.radius += RADIUS_PER_LEVEL;
        up.slowFactor += SLOW_PER_LEVEL;
    }
    up.damageFactor += DAMAGE_PER_LEVEL;
    up.level++;
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityLightningBallUpgradeIceAura = ability.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_ICE_AURA];
    const slowAmount = debuffSlowGetSlowAmountAsPerCentText(up.slowFactor);
    return `${ABILITY_LIGHTNING_BALL_UPGRADE_ICE_AURA}: Damage: ${DAMAGE_PER_LEVEL * 100 * up.level}%, slow: ${slowAmount}%`;
}

function getAbilityUpgradeUiTextLong(ability: Ability, option: AbilityUpgradeOption): string[] {
    const textLines: string[] = [];
    const up: AbilityLightningBallUpgradeIceAura | undefined = ability.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_ICE_AURA];
    textLines.push(`When Lightning Ball ends`);
    textLines.push(`place down an ice field.`);
    if (up) {
        const slowAmount = debuffSlowGetSlowAmountAsPerCentText(up.slowFactor);
        const slowAmountNew = debuffSlowGetSlowAmountAsPerCentText(up.slowFactor + SLOW_PER_LEVEL);
        textLines.push(`Damage per second increase from ${DAMAGE_PER_LEVEL * 100 * up.level}% to ${DAMAGE_PER_LEVEL * 100 * (up.level + 1)}%.`);
        textLines.push(`Radius increase from ${RADIUS + RADIUS_PER_LEVEL * up.level} to ${RADIUS + RADIUS_PER_LEVEL * (up.level + 1)}.`);
        textLines.push(`Duration increase from ${(DURATION + DURATION_PER_LEVEL * up.level) / 1000}s to ${(DURATION + DURATION_PER_LEVEL * (up.level + 1)) / 1000}s.`);
        textLines.push(`Slows increase from ${slowAmount}% to ${slowAmountNew}%.`);
    } else {
        const slowAmount = debuffSlowGetSlowAmountAsPerCentText(1 + SLOW);
        textLines.push(`Does ${DAMAGE_PER_LEVEL * 100}% base damage per second.`);
        textLines.push(`Lasts ${DURATION / 1000}s.`);
        textLines.push(`Slows enemies by ${slowAmount}%.`);
    }

    return textLines;
}
