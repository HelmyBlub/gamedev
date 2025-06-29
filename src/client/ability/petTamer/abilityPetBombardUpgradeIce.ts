import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { debuffSlowGetSlowAmountAsPerCentText } from "../../debuff/debuffSlow.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_PET_BOMBARD_UPGRADE_FUNCTIONS, AbilityPetBombard } from "./abilityPetBombard.js";

export type AbilityPetBombardUpgradeIce = AbilityUpgrade & {
}
const SLOW_PER_LEVEL = 1;
export const ABILITY_PET_BOMBARD_UPGRADE_ICE = "Ice";

export function addAbilityPetBombardUpgradeIce() {
    ABILITY_PET_BOMBARD_UPGRADE_FUNCTIONS[ABILITY_PET_BOMBARD_UPGRADE_ICE] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getMoreInfoIncreaseOneLevelText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
        setUpgradeToBossLevel: setUpgradeToBossLevel,
    }
}
function setUpgradeToBossLevel(ability: Ability, level: number) {
    const up: AbilityPetBombardUpgradeIce = ability.upgrades[ABILITY_PET_BOMBARD_UPGRADE_ICE];
    if (!up) return;
    const bombard = ability as AbilityPetBombard;
    up.level = level;
    bombard.iceSlowFactor = 1 + up.level * 0.1;
}

function getOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_PET_BOMBARD_UPGRADE_ICE);
    options[0].option.displayMoreInfoText = getAbilityUpgradeUiTextLong(ability);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilityPetBombard;
    let up: AbilityPetBombardUpgradeIce;
    if (as.upgrades[ABILITY_PET_BOMBARD_UPGRADE_ICE] === undefined) {
        up = { level: 0 };
        as.upgrades[ABILITY_PET_BOMBARD_UPGRADE_ICE] = up;
    } else {
        up = as.upgrades[ABILITY_PET_BOMBARD_UPGRADE_ICE];
    }
    up.level++;
    as.iceSlowFactor = 1 + up.level * SLOW_PER_LEVEL;
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityPetBombardUpgradeIce = ability.upgrades[ABILITY_PET_BOMBARD_UPGRADE_ICE];
    return `${ABILITY_PET_BOMBARD_UPGRADE_ICE}: Level ${up.level}`;
}

function getAbilityUpgradeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityUpgrade | undefined = ability.upgrades[ABILITY_PET_BOMBARD_UPGRADE_ICE];
    if (upgrade) {
        const currentSlowAmount = debuffSlowGetSlowAmountAsPerCentText(1 + upgrade.level * SLOW_PER_LEVEL);
        const newSlowAmount = debuffSlowGetSlowAmountAsPerCentText(1 + (upgrade.level + 1) * SLOW_PER_LEVEL);
        textLines.push(`Increased slow from ${currentSlowAmount}% to ${newSlowAmount}%.`);
    } else {
        textLines.push(`When projectiles explodes leave behind an ice area`);
        textLines.push(`which slows and damages enemies.`);
    }

    return textLines;
}
