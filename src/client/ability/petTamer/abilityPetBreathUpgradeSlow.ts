import { Character } from "../../character/characterModel.js";
import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { applyDebuff } from "../../debuff/debuff.js";
import { createDebuffSlow, debuffSlowGetSlowAmountAsPerCentText } from "../../debuff/debuffSlow.js";
import { Game } from "../../gameModel.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_PET_BREATH_UPGRADE_FUNCTIONS, AbilityPetBreath } from "./abilityPetBreath.js";

export type AbilityPetBreathUpgradeSlow = AbilityUpgrade & {
    factor: number,
    duration: number,
}

const BASEDURATION = 500;
const DURATIONUP = 500;
const SLOW_FACTOR_PER_LEVEL = 1;
export const ABILITY_PET_BREATH_UPGRADE_SLOW = "Breath Slow";

export function addAbilityPetBreathUpgradeSlow() {
    ABILITY_PET_BREATH_UPGRADE_FUNCTIONS[ABILITY_PET_BREATH_UPGRADE_SLOW] = {
        getStatsDisplayText: getAbilityUpgradeSlowUiText,
        getMoreInfoIncreaseOneLevelText: getAbilityUpgradeSlowUiTextLong,
        getOptions: getOptionsSlow,
        executeOption: executeOptionPaintSlow,
    }
}

export function abilityPetBreathUpgradeSlowApplySlow(ability: AbilityPetBreath, target: Character, game: Game) {
    const slow = ability.upgrades[ABILITY_PET_BREATH_UPGRADE_SLOW] as AbilityPetBreathUpgradeSlow;
    if (slow === undefined) return;
    const debuffSlow = createDebuffSlow(slow.factor, slow.duration, game.state.time);
    applyDebuff(debuffSlow, target, game);
}

function getOptionsSlow(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_PET_BREATH_UPGRADE_SLOW);
    options[0].option.displayMoreInfoText = getAbilityUpgradeSlowUiTextLong(ability);
    return options;
}

function executeOptionPaintSlow(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilityPetBreath;
    let up: AbilityPetBreathUpgradeSlow;
    if (as.upgrades[ABILITY_PET_BREATH_UPGRADE_SLOW] === undefined) {
        up = { level: 0, factor: 1, duration: BASEDURATION };
        as.upgrades[ABILITY_PET_BREATH_UPGRADE_SLOW] = up;
        as.color = "white";
    } else {
        up = as.upgrades[ABILITY_PET_BREATH_UPGRADE_SLOW];
    }
    up.factor += SLOW_FACTOR_PER_LEVEL;
    up.duration += DURATIONUP;
    up.level++;
}

function getAbilityUpgradeSlowUiText(ability: Ability): string {
    const up: AbilityPetBreathUpgradeSlow = ability.upgrades[ABILITY_PET_BREATH_UPGRADE_SLOW];
    return `${ABILITY_PET_BREATH_UPGRADE_SLOW}: Level ${up.level}`;
}

function getAbilityUpgradeSlowUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityPetBreathUpgradeSlow | undefined = ability.upgrades[ABILITY_PET_BREATH_UPGRADE_SLOW];
    if (upgrade) {
        const currentSlowAmount = debuffSlowGetSlowAmountAsPerCentText(upgrade.factor);
        const newSlowAmount = debuffSlowGetSlowAmountAsPerCentText(upgrade.factor + SLOW_FACTOR_PER_LEVEL);
        textLines.push(`Increase Breath slow from ${currentSlowAmount}% to ${newSlowAmount}%.`);
        textLines.push(`and duration from ${(upgrade.duration) / 1000}s to ${(upgrade.duration + DURATIONUP) / 1000}s.`);
    } else {
        const slowAmount = debuffSlowGetSlowAmountAsPerCentText(1 + SLOW_FACTOR_PER_LEVEL);
        textLines.push(`Breath slows enemies by ${slowAmount}% for ${(BASEDURATION + DURATIONUP) / 1000}s.`);
    }

    return textLines;
}
