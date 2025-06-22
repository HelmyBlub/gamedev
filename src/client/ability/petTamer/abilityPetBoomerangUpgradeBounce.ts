import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_BOOMERANG_BASE_THROW_INTERVAL, ABILITY_PET_BOOMERANG_UPGRADE_FUNCTIONS, AbilityPetBoomerang } from "./abilityPetBoomerang.js";

export type AbilityPetBoomerangUpgradeFireSpeed = AbilityUpgrade & {
}

export const ABILITY_PET_BOOMERANG_UPGRADE_BOUNCE = "Bounce";
const DURATION_UP_PER_LEVEL = 1000;
const BOUNCES_PER_LEVEL = 2;

export function addAbilityPetBoomerangUpgradeBounce() {
    ABILITY_PET_BOOMERANG_UPGRADE_FUNCTIONS[ABILITY_PET_BOOMERANG_UPGRADE_BOUNCE] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getMoreInfoIncreaseOneLevelText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
    }
}

function getOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_PET_BOOMERANG_UPGRADE_BOUNCE);
    options[0].option.displayMoreInfoText = getAbilityUpgradeUiTextLong(ability);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilityPetBoomerang;
    let up: AbilityPetBoomerangUpgradeFireSpeed;
    if (as.upgrades[ABILITY_PET_BOOMERANG_UPGRADE_BOUNCE] === undefined) {
        up = { level: 0 };
        as.upgrades[ABILITY_PET_BOOMERANG_UPGRADE_BOUNCE] = up;
    } else {
        up = as.upgrades[ABILITY_PET_BOOMERANG_UPGRADE_BOUNCE];
    }
    up.level++;
    as.bounce = up.level * BOUNCES_PER_LEVEL;
    as.duration += DURATION_UP_PER_LEVEL;
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityPetBoomerangUpgradeFireSpeed = ability.upgrades[ABILITY_PET_BOOMERANG_UPGRADE_BOUNCE];
    return `${ABILITY_PET_BOOMERANG_UPGRADE_BOUNCE}: Level ${up.level}`;
}

function getAbilityUpgradeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const boomerang = ability as AbilityPetBoomerang;
    const upgrade: AbilityUpgrade | undefined = ability.upgrades[ABILITY_PET_BOOMERANG_UPGRADE_BOUNCE];
    if (upgrade) {
        textLines.push(`Bounce between targets from ${upgrade.level * BOUNCES_PER_LEVEL}x to ${(upgrade.level + 1) * BOUNCES_PER_LEVEL}x.`);
        textLines.push(`Increases flight duration from ${(boomerang.duration / 1000).toFixed(0)}s to ${((boomerang.duration + DURATION_UP_PER_LEVEL) / 1000).toFixed(0)}s.`);
    } else {
        textLines.push(`Bounce between targets ${BOUNCES_PER_LEVEL} times.`);
        textLines.push(`Increases flight duration by ${(DURATION_UP_PER_LEVEL / 1000).toFixed(0)}s.`);
    }

    return textLines;
}
