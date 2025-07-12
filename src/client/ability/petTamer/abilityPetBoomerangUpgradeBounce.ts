import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_PET_BOOMERANG_UPGRADE_FUNCTIONS, AbilityPetBoomerang } from "./abilityPetBoomerang.js";

export type AbilityPetBoomerangUpgradeBounce = AbilityUpgrade & {
    bounce: number,
    bonusDuration: number,
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
        setUpgradeToBossLevel: setUpgradeToBossLevel,
    }
}

function setUpgradeToBossLevel(ability: Ability, level: number) {
    const up: AbilityPetBoomerangUpgradeBounce = ability.upgrades[ABILITY_PET_BOOMERANG_UPGRADE_BOUNCE];
    if (!up) return;
    up.level = level;
    up.bounce = up.level * BOUNCES_PER_LEVEL;
    up.bonusDuration = up.level * DURATION_UP_PER_LEVEL;
}

function getOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_PET_BOOMERANG_UPGRADE_BOUNCE);
    options[0].option.displayMoreInfoText = getAbilityUpgradeUiTextLong(ability);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilityPetBoomerang;
    let up: AbilityPetBoomerangUpgradeBounce;
    if (as.upgrades[ABILITY_PET_BOOMERANG_UPGRADE_BOUNCE] === undefined) {
        up = { level: 0, bonusDuration: 0, bounce: 0 };
        as.upgrades[ABILITY_PET_BOOMERANG_UPGRADE_BOUNCE] = up;
    } else {
        up = as.upgrades[ABILITY_PET_BOOMERANG_UPGRADE_BOUNCE];
    }
    up.level++;
    up.bounce = up.level * BOUNCES_PER_LEVEL;
    up.bonusDuration = up.level * DURATION_UP_PER_LEVEL;
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityPetBoomerangUpgradeBounce = ability.upgrades[ABILITY_PET_BOOMERANG_UPGRADE_BOUNCE];
    return `${ABILITY_PET_BOOMERANG_UPGRADE_BOUNCE}: Level ${up.level}`;
}

function getAbilityUpgradeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade = ability.upgrades[ABILITY_PET_BOOMERANG_UPGRADE_BOUNCE] as AbilityPetBoomerangUpgradeBounce;
    if (upgrade) {
        textLines.push(`Bounce between targets from ${upgrade.level * BOUNCES_PER_LEVEL}x to ${(upgrade.level + 1) * BOUNCES_PER_LEVEL}x.`);
        textLines.push(`Increases bonus flight duration from ${(upgrade.bonusDuration / 1000).toFixed(0)}s to ${((upgrade.bonusDuration + DURATION_UP_PER_LEVEL) / 1000).toFixed(0)}s.`);
    } else {
        textLines.push(`Bounce between targets ${BOUNCES_PER_LEVEL} times.`);
        textLines.push(`Increases flight duration by ${(DURATION_UP_PER_LEVEL / 1000).toFixed(0)}s.`);
    }

    return textLines;
}
