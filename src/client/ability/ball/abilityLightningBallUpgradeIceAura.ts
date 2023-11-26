import { Character } from "../../character/characterModel.js";
import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Game } from "../../gameModel.js";
import { Ability, AbilityOwner } from "../ability.js";
import { createAbilityObjectIceAura } from "../abilityIceAura.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_LIGHTNING_BALL_UPGRADE_FUNCTIONS, ABILITY_NAME_LIGHTNING_BALL, AbilityLightningBall, getDamageAbilityLightningBall } from "./abilityLightningBall.js";

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
        getLongExplainText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
    }
}

export function lightningBallUpgradeIceAuraExecute(ability: AbilityLightningBall, character: AbilityOwner, game: Game) {
    const upgrade: AbilityLightningBallUpgradeIceAura = ability.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_ICE_AURA];
    if (!upgrade) return;
    const deleteTime = game.state.time + upgrade.duration;
    const iceField = createAbilityObjectIceAura(upgrade.damageFactor * ability.damage, upgrade.radius, upgrade.slowFactor, character.faction, character.x, character.y, deleteTime, ability.id);
    game.state.abilityObjects.push(iceField);
}

function getOptions(ability: Ability, character: Character, game: Game): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_LIGHTNING_BALL_UPGRADE_ICE_AURA);
    options[0].option.displayLongText = getAbilityUpgradeUiTextLong(ability, options[0].option as any);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilityLightningBall;
    let up: AbilityLightningBallUpgradeIceAura;
    if (as.upgrades[ABILITY_LIGHTNING_BALL_UPGRADE_ICE_AURA] === undefined) {
        up = { level: 0, damageFactor: 0, duration: DURATION, slowFactor: 1 + SLOW, radius: RADIUS};
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
    return `${ABILITY_LIGHTNING_BALL_UPGRADE_ICE_AURA}: ${up.level}`;
}

function getAbilityUpgradeUiTextLong(ability: Ability, option: AbilityUpgradeOption): string[] {
    const textLines: string[] = [];
    textLines.push(`When Lightning Ball ends`);
    textLines.push(`place down a ice field.`);
    textLines.push(`Does ${DAMAGE_PER_LEVEL * 100}% base damage per second.`);
    textLines.push(`Slows enemies by ${SLOW * 100}%.`);

    return textLines;
}
