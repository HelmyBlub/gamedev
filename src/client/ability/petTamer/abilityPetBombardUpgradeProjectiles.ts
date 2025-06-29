import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_PET_BOMBARD_UPGRADE_FUNCTIONS, AbilityPetBombard } from "./abilityPetBombard.js";

export type AbilityPetBombardUpgradeProjectiles = AbilityUpgrade & {
}

export const ABILITY_PET_BOMBARD_UPGRADE_MORE_PROJECTILES = "More Projectiles";

export function addAbilityPetBombardUpgradeProjectiles() {
    ABILITY_PET_BOMBARD_UPGRADE_FUNCTIONS[ABILITY_PET_BOMBARD_UPGRADE_MORE_PROJECTILES] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getMoreInfoIncreaseOneLevelText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
        setUpgradeToBossLevel: setUpgradeToBossLevel,
    }
}
function setUpgradeToBossLevel(ability: Ability, level: number) {
    const up: AbilityPetBombardUpgradeProjectiles = ability.upgrades[ABILITY_PET_BOMBARD_UPGRADE_MORE_PROJECTILES];
    if (!up) return;
    const bombard = ability as AbilityPetBombard;
    up.level = level;
    bombard.projectileCounter = up.level + 1;
}

function getOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_PET_BOMBARD_UPGRADE_MORE_PROJECTILES);
    options[0].option.displayMoreInfoText = getAbilityUpgradeUiTextLong(ability);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilityPetBombard;
    let up: AbilityPetBombardUpgradeProjectiles;
    if (as.upgrades[ABILITY_PET_BOMBARD_UPGRADE_MORE_PROJECTILES] === undefined) {
        up = { level: 0 };
        as.upgrades[ABILITY_PET_BOMBARD_UPGRADE_MORE_PROJECTILES] = up;
    } else {
        up = as.upgrades[ABILITY_PET_BOMBARD_UPGRADE_MORE_PROJECTILES];
    }
    up.level++;
    as.projectileCounter = up.level + 1;
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityPetBombardUpgradeProjectiles = ability.upgrades[ABILITY_PET_BOMBARD_UPGRADE_MORE_PROJECTILES];
    return `${ABILITY_PET_BOMBARD_UPGRADE_MORE_PROJECTILES}: Level ${up.level}`;
}

function getAbilityUpgradeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityUpgrade | undefined = ability.upgrades[ABILITY_PET_BOMBARD_UPGRADE_MORE_PROJECTILES];
    if (upgrade) {
        textLines.push(`Increased projectiles count from ${upgrade.level + 1} to ${(upgrade.level + 2)}.`);
    } else {
        textLines.push(`Increased projectile count by 1.`);
    }

    return textLines;
}
