import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_BOOMERANG_BASE_THROW_INTERVAL, ABILITY_PET_BOOMERANG_UPGRADE_FUNCTIONS, AbilityPetBoomerang } from "./abilityPetBoomerang.js";

export type AbilityPetBoomerangUpgradeFireSpeed = AbilityUpgrade & {
    fireSpeedFactor: number,
}

export const ABILITY_PET_BOOMERANG_UPGRADE_FIRE_SPEED = "Fire Speed+";
const FIRE_SPEED_PER_CENT_PER_LEVEL = 0.5;

export function addAbilityPetBoomerangUpgradeFireSpeed() {
    ABILITY_PET_BOOMERANG_UPGRADE_FUNCTIONS[ABILITY_PET_BOOMERANG_UPGRADE_FIRE_SPEED] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getMoreInfoIncreaseOneLevelText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
        setUpgradeToBossLevel: setUpgradeToBossLevel,
    }
}
function setUpgradeToBossLevel(ability: Ability, level: number) {
    const up: AbilityPetBoomerangUpgradeFireSpeed = ability.upgrades[ABILITY_PET_BOOMERANG_UPGRADE_FIRE_SPEED];
    if (!up) return;
    const boomerang = ability as AbilityPetBoomerang;
    up.level = level;
    up.fireSpeedFactor = 2 / (1 + FIRE_SPEED_PER_CENT_PER_LEVEL * up.level) * 2;
    boomerang.throwInterval = ABILITY_BOOMERANG_BASE_THROW_INTERVAL * up.fireSpeedFactor;
}

function getOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_PET_BOOMERANG_UPGRADE_FIRE_SPEED);
    options[0].option.displayMoreInfoText = getAbilityUpgradeUiTextLong(ability);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilityPetBoomerang;
    let up: AbilityPetBoomerangUpgradeFireSpeed;
    if (as.upgrades[ABILITY_PET_BOOMERANG_UPGRADE_FIRE_SPEED] === undefined) {
        up = { level: 0, fireSpeedFactor: 1 };
        as.upgrades[ABILITY_PET_BOOMERANG_UPGRADE_FIRE_SPEED] = up;
    } else {
        up = as.upgrades[ABILITY_PET_BOOMERANG_UPGRADE_FIRE_SPEED];
    }
    up.level++;
    up.fireSpeedFactor = 1 / (1 + FIRE_SPEED_PER_CENT_PER_LEVEL * up.level);
    as.throwInterval = ABILITY_BOOMERANG_BASE_THROW_INTERVAL * up.fireSpeedFactor;
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityPetBoomerangUpgradeFireSpeed = ability.upgrades[ABILITY_PET_BOOMERANG_UPGRADE_FIRE_SPEED];
    return `${ABILITY_PET_BOOMERANG_UPGRADE_FIRE_SPEED}: Level ${up.level}`;
}

function getAbilityUpgradeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityUpgrade | undefined = ability.upgrades[ABILITY_PET_BOOMERANG_UPGRADE_FIRE_SPEED];
    if (upgrade) {
        textLines.push(`Increased fire speed from ${upgrade.level * FIRE_SPEED_PER_CENT_PER_LEVEL * 100}% to ${(upgrade.level + 1) * FIRE_SPEED_PER_CENT_PER_LEVEL * 100}%.`);
    } else {
        textLines.push(`Increased fire speed by ${FIRE_SPEED_PER_CENT_PER_LEVEL * 100}%.`);
    }

    return textLines;
}
