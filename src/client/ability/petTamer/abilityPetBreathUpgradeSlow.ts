import { Character } from "../../character/characterModel.js";
import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { applyDebuff } from "../../debuff/debuff.js";
import { createDebuffSlow } from "../../debuff/debuffSlow.js";
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
export const ABILITY_PET_BREATH_UPGARDE_SLOW = "Breath Slow";

export function addAbilityPetBreathUpgradeSlow() {
    ABILITY_PET_BREATH_UPGRADE_FUNCTIONS[ABILITY_PET_BREATH_UPGARDE_SLOW] = {
        getStatsDisplayText: getAbilityUpgradeSlowUiText,
        getLongExplainText: getAbilityUpgradeSlowUiTextLong,
        getOptions: getOptionsSlow,
        executeOption: executeOptionPaintSlow,
    }
}

export function abilityPetBreathUpgradeSlowApplySlow(ability: AbilityPetBreath, target: Character, game: Game) {
    const slow = ability.upgrades[ABILITY_PET_BREATH_UPGARDE_SLOW] as AbilityPetBreathUpgradeSlow;
    if (slow === undefined) return;
    const debuffSlow = createDebuffSlow(slow.factor, slow.duration, game.state.time);
    applyDebuff(debuffSlow, target, game);
}

function getOptionsSlow(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_PET_BREATH_UPGARDE_SLOW);
    options[0].option.displayLongText = getAbilityUpgradeSlowUiTextLong(ability);
    return options;
}

function executeOptionPaintSlow(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilityPetBreath;
    let up: AbilityPetBreathUpgradeSlow;
    if (as.upgrades[ABILITY_PET_BREATH_UPGARDE_SLOW] === undefined) {
        up = { level: 0, factor: 1, duration: BASEDURATION };
        as.upgrades[ABILITY_PET_BREATH_UPGARDE_SLOW] = up;
        as.color = "white";
    } else {
        up = as.upgrades[ABILITY_PET_BREATH_UPGARDE_SLOW];
    }
    up.factor += 1;
    up.duration += DURATIONUP;
    up.level++;
}

function getAbilityUpgradeSlowUiText(ability: Ability): string {
    const up: AbilityPetBreathUpgradeSlow = ability.upgrades[ABILITY_PET_BREATH_UPGARDE_SLOW];
    return `${ABILITY_PET_BREATH_UPGARDE_SLOW}: Level ${up.level}`;
}

function getAbilityUpgradeSlowUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityPetBreathUpgradeSlow | undefined = ability.upgrades[ABILITY_PET_BREATH_UPGARDE_SLOW];
    if (upgrade) {
        const slowAmount = ((1 - 1 / (upgrade.factor + 1)) * 100).toFixed();
        textLines.push(`Increase Breath slow to ${slowAmount}%`);
        textLines.push(`and duration to ${(upgrade.duration + DURATIONUP) / 1000}s`);
    } else {
        textLines.push(`Breath slows enemies by 50% for ${(BASEDURATION + DURATIONUP) / 1000}s`);
    }

    return textLines;
}
