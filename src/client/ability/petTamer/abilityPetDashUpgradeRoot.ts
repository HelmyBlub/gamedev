import { Character } from "../../character/characterModel.js";
import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { applyDebuff } from "../../debuff/debuff.js";
import { createDebuffRoot } from "../../debuff/debuffRoot.js";
import { Game } from "../../gameModel.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_PET_DASH_UPGRADE_FUNCTIONS, AbilityPetDash } from "./abilityPetDash.js";

export type AbilityPetDashUpgradeRoot = AbilityUpgrade & {
    duration: number,
}

export const ABILITY_PET_DASH_UPGRADE_ROOT_ON_HIT = "Dash Root on Hit";
const DURATION_PER_LEVEL = 500;

export function addAbilityPetDashUpgradeRoot() {
    ABILITY_PET_DASH_UPGRADE_FUNCTIONS[ABILITY_PET_DASH_UPGRADE_ROOT_ON_HIT] = {
        getStatsDisplayText: getAbilityUpgradeRootUiText,
        getMoreInfoIncreaseOneLevelText: getAbilityUpgradeRootUiTextLong,
        getOptions: getOptionsRoot,
        executeOption: executeOptionDashRoot,
    }
}

export function abilityPetDashUpgradeRootApplyRoot(ability: AbilityPetDash, target: Character, game: Game) {
    const root = ability.upgrades[ABILITY_PET_DASH_UPGRADE_ROOT_ON_HIT] as AbilityPetDashUpgradeRoot;
    if (root === undefined) return;
    const debuffRoot = createDebuffRoot(root.duration, game.state.time);
    applyDebuff(debuffRoot, target, game);
}

function getOptionsRoot(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_PET_DASH_UPGRADE_ROOT_ON_HIT);
    options[0].option.displayMoreInfoText = getAbilityUpgradeRootUiTextLong(ability);
    return options;
}

function executeOptionDashRoot(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilityPetDash;
    let up: AbilityPetDashUpgradeRoot;
    if (as.upgrades[ABILITY_PET_DASH_UPGRADE_ROOT_ON_HIT] === undefined) {
        up = {
            level: 0,
            duration: 0,
        };
        as.upgrades[ABILITY_PET_DASH_UPGRADE_ROOT_ON_HIT] = up;
    } else {
        up = as.upgrades[ABILITY_PET_DASH_UPGRADE_ROOT_ON_HIT];
    }
    up.duration += DURATION_PER_LEVEL;
    up.level++;
}

function getAbilityUpgradeRootUiText(ability: Ability): string {
    const up: AbilityPetDashUpgradeRoot = ability.upgrades[ABILITY_PET_DASH_UPGRADE_ROOT_ON_HIT];
    return `${ABILITY_PET_DASH_UPGRADE_ROOT_ON_HIT}: Level ${up.level}`;
}

function getAbilityUpgradeRootUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityUpgrade | undefined = ability.upgrades[ABILITY_PET_DASH_UPGRADE_ROOT_ON_HIT];
    textLines.push(`Enemies hit by Dash are rooted in place.`);
    if (upgrade) {
        textLines.push(`Duration increase from ${upgrade.level * DURATION_PER_LEVEL / 1000}s to ${(upgrade.level + 1) * DURATION_PER_LEVEL / 1000}s.`);
    } else {
        textLines.push(`Duration: ${DURATION_PER_LEVEL / 1000}s.`);
    }

    return textLines;
}
