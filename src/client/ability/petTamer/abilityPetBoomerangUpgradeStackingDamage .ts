import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_BOOMERANG_BASE_THROW_INTERVAL, ABILITY_PET_BOOMERANG_UPGRADE_FUNCTIONS, AbilityPetBoomerang } from "./abilityPetBoomerang.js";

export type AbilityPetBoomerangUpgradeStackingDamage = AbilityUpgrade & {
}

export const ABILITY_PET_BOOMERANG_UPGRADE_STACKING_DAMAGE = "Stacking Damage";
export const ABILITY_PET_BOOMERANG_UPGRADE_STACK_DAMAGE_PER_CENT = 0.25;

export function addAbilityPetBoomerangUpgradeStackingDamage() {
    ABILITY_PET_BOOMERANG_UPGRADE_FUNCTIONS[ABILITY_PET_BOOMERANG_UPGRADE_STACKING_DAMAGE] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getMoreInfoIncreaseOneLevelText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
    }
}

function getOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_PET_BOOMERANG_UPGRADE_STACKING_DAMAGE);
    options[0].option.displayMoreInfoText = getAbilityUpgradeUiTextLong(ability);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilityPetBoomerang;
    let up: AbilityPetBoomerangUpgradeStackingDamage;
    if (as.upgrades[ABILITY_PET_BOOMERANG_UPGRADE_STACKING_DAMAGE] === undefined) {
        up = { level: 0 };
        as.upgrades[ABILITY_PET_BOOMERANG_UPGRADE_STACKING_DAMAGE] = up;
    } else {
        up = as.upgrades[ABILITY_PET_BOOMERANG_UPGRADE_STACKING_DAMAGE];
    }
    up.level++;
    as.applyStacks = up.level;
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityPetBoomerangUpgradeStackingDamage = ability.upgrades[ABILITY_PET_BOOMERANG_UPGRADE_STACKING_DAMAGE];
    return `${ABILITY_PET_BOOMERANG_UPGRADE_STACKING_DAMAGE}: Level ${up.level}`;
}

function getAbilityUpgradeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const boomerang = ability as AbilityPetBoomerang;
    const upgrade: AbilityUpgrade | undefined = ability.upgrades[ABILITY_PET_BOOMERANG_UPGRADE_STACKING_DAMAGE];
    if (upgrade) {
        textLines.push(`Increase damage to a target each time it gets hit.`);
        textLines.push(`Increase damage from ${upgrade.level * ABILITY_PET_BOOMERANG_UPGRADE_STACK_DAMAGE_PER_CENT * 100}% to ${(upgrade.level + 1) * ABILITY_PET_BOOMERANG_UPGRADE_STACK_DAMAGE_PER_CENT * 100}%`);
    } else {
        textLines.push(`Increase damage by ${ABILITY_PET_BOOMERANG_UPGRADE_STACK_DAMAGE_PER_CENT * 100}% to a target each time it gets hit.`);
    }

    return textLines;
}
