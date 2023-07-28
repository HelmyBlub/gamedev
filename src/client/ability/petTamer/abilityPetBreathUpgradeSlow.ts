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

export const ABILITY_PET_BREATH_UPGARDE_SLOW = "Breath Slow";

export function addAbilityPetBreathUpgradeSlow() {
    ABILITY_PET_BREATH_UPGRADE_FUNCTIONS[ABILITY_PET_BREATH_UPGARDE_SLOW] = {
        getStatsDisplayText: getAbilityUpgradeSlowUiText,
        getLongExplainText: getAbilityUpgradeSlowUiTextLong,   
        getOptions: getOptionsSlow,     
        executeOption: executeOptionPaintSlow,
    }
}

export function abilityPetBreathUpgradeSlowApplySlow(ability: AbilityPetBreath, target: Character, game: Game){
    let slow = ability.upgrades[ABILITY_PET_BREATH_UPGARDE_SLOW] as AbilityPetBreathUpgradeSlow;
    if (slow === undefined) return;
    let debuffSlow = createDebuffSlow(slow.factor, slow.duration, game.state.time);
    applyDebuff(debuffSlow, target, game);
}

function getOptionsSlow(ability: Ability): UpgradeOptionAndProbability[] {
    let options = getAbilityUpgradeOptionDefault(ability, ABILITY_PET_BREATH_UPGARDE_SLOW);
    options[0].option.displayLongText = getAbilityUpgradeSlowUiTextLong(ability);
    options[0].probability = 0.5;
    return options;
}


function executeOptionPaintSlow(ability: Ability, option: AbilityUpgradeOption) {
    let as = ability as AbilityPetBreath;
    let up: AbilityPetBreathUpgradeSlow;
    if (as.upgrades[ABILITY_PET_BREATH_UPGARDE_SLOW] === undefined) {
        up = { level: 0, factor: 1, duration: 500 };
        as.upgrades[ABILITY_PET_BREATH_UPGARDE_SLOW] = up;
        as.color = "white";
    } else {
        up = as.upgrades[ABILITY_PET_BREATH_UPGARDE_SLOW];
    }
    up.factor += 1;
    up.duration += 500;
    up.level++;
}

function getAbilityUpgradeSlowUiText(ability: Ability): string {
    let up: AbilityPetBreathUpgradeSlow = ability.upgrades[ABILITY_PET_BREATH_UPGARDE_SLOW];
    return `${ABILITY_PET_BREATH_UPGARDE_SLOW}: Level ${up.level}`;
}

function getAbilityUpgradeSlowUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityUpgrade | undefined = ability.upgrades[ABILITY_PET_BREATH_UPGARDE_SLOW];
    const levelText = (upgrade ? `(${upgrade.level + 1})` : "");
    textLines.push(ABILITY_PET_BREATH_UPGARDE_SLOW + levelText);
    textLines.push(`Breath slows enemies`);

    return textLines;
}
