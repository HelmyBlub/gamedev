import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_BOMBARD_BASE_SHOOT_INTERVAL, ABILITY_PET_BOMBARD_UPGRADE_FUNCTIONS, AbilityPetBombard } from "./abilityPetBombard.js";

export type AbilityPetBombardUpgradeFireSpeed = AbilityUpgrade & {
    fireSpeedFactor: number,
}

export const ABILITY_PET_BOMBARD_UPGRADE_FIRE_SPEED = "Fire Speed+";
const FIRE_SPEED_PER_CENT_PER_LEVEL = 0.5;

export function addAbilityPetBombardUpgradeFireSpeed() {
    ABILITY_PET_BOMBARD_UPGRADE_FUNCTIONS[ABILITY_PET_BOMBARD_UPGRADE_FIRE_SPEED] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getMoreInfoIncreaseOneLevelText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
        setUpgradeToBossLevel: setUpgradeToBossLevel,
    }
}
function setUpgradeToBossLevel(ability: Ability, level: number) {
    const up: AbilityPetBombardUpgradeFireSpeed = ability.upgrades[ABILITY_PET_BOMBARD_UPGRADE_FIRE_SPEED];
    if (!up) return;
    const bombard = ability as AbilityPetBombard;
    up.level = level;
    up.fireSpeedFactor = 2 / (1 + FIRE_SPEED_PER_CENT_PER_LEVEL * up.level);
}

function getOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_PET_BOMBARD_UPGRADE_FIRE_SPEED);
    options[0].option.displayMoreInfoText = getAbilityUpgradeUiTextLong(ability);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilityPetBombard;
    let up: AbilityPetBombardUpgradeFireSpeed;
    if (as.upgrades[ABILITY_PET_BOMBARD_UPGRADE_FIRE_SPEED] === undefined) {
        up = { level: 0, fireSpeedFactor: 1 };
        as.upgrades[ABILITY_PET_BOMBARD_UPGRADE_FIRE_SPEED] = up;
    } else {
        up = as.upgrades[ABILITY_PET_BOMBARD_UPGRADE_FIRE_SPEED];
    }
    up.level++;
    up.fireSpeedFactor = 1 / (1 + FIRE_SPEED_PER_CENT_PER_LEVEL * up.level);
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityPetBombardUpgradeFireSpeed = ability.upgrades[ABILITY_PET_BOMBARD_UPGRADE_FIRE_SPEED];
    return `${ABILITY_PET_BOMBARD_UPGRADE_FIRE_SPEED}: Level ${up.level}`;
}

function getAbilityUpgradeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityUpgrade | undefined = ability.upgrades[ABILITY_PET_BOMBARD_UPGRADE_FIRE_SPEED];
    if (upgrade) {
        textLines.push(`Increased fire speed from ${(upgrade.level * FIRE_SPEED_PER_CENT_PER_LEVEL * 100).toFixed()}% to ${((upgrade.level + 1) * FIRE_SPEED_PER_CENT_PER_LEVEL * 100).toFixed()}%.`);
    } else {
        textLines.push(`Increased fire speed by ${FIRE_SPEED_PER_CENT_PER_LEVEL * 100}%.`);
    }

    return textLines;
}
