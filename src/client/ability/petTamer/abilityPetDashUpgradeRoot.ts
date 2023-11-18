import { Character } from "../../character/characterModel.js";
import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { applyDebuff } from "../../debuff/debuff.js";
import { createDebuffRoot } from "../../debuff/debuffRoot.js";
import { Game } from "../../gameModel.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_PET_DASH_UPGRADE_FUNCTIONS, AbilityPetDash } from "./abilityPetDash.js";

export type AbilityPetDashUpgradeTerrainRoot = AbilityUpgrade & {
    duration: number,
}

export const ABILITY_PET_DASH_UPGRADE_ROOT_ON_HIT = "Dash Root on Hit";
const DURATION_PER_LEVEL = 500;

export function addAbilityPetDashUpgradeTerrainRoot() {
    ABILITY_PET_DASH_UPGRADE_FUNCTIONS[ABILITY_PET_DASH_UPGRADE_ROOT_ON_HIT] = {
        getStatsDisplayText: getAbilityUpgradeTerrainRootUiText,
        getLongExplainText: getAbilityUpgradeTerrainRootUiTextLong,
        getOptions: getOptionsRoot,
        executeOption: executeOptionDashTerrainRoot,
    }
}

export function abilityPetDashUpgradeRootApplyRoot(ability: AbilityPetDash, target: Character, game: Game) {
    const root = ability.upgrades[ABILITY_PET_DASH_UPGRADE_ROOT_ON_HIT] as AbilityPetDashUpgradeTerrainRoot;
    if (root === undefined) return;
    const debuffRoot = createDebuffRoot(root.duration, game.state.time);
    applyDebuff(debuffRoot, target, game);
}

function getOptionsRoot(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_PET_DASH_UPGRADE_ROOT_ON_HIT);
    options[0].option.displayLongText = getAbilityUpgradeTerrainRootUiTextLong(ability);
    return options;
}

function executeOptionDashTerrainRoot(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilityPetDash;
    let up: AbilityPetDashUpgradeTerrainRoot;
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

function getAbilityUpgradeTerrainRootUiText(ability: Ability): string {
    const up: AbilityPetDashUpgradeTerrainRoot = ability.upgrades[ABILITY_PET_DASH_UPGRADE_ROOT_ON_HIT];
    return `${ABILITY_PET_DASH_UPGRADE_ROOT_ON_HIT}: Level ${up.level}`;
}

function getAbilityUpgradeTerrainRootUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityUpgrade | undefined = ability.upgrades[ABILITY_PET_DASH_UPGRADE_ROOT_ON_HIT];
    textLines.push(`Enemies hit by Dash are rooted in place`);
    textLines.push(`by ${DURATION_PER_LEVEL / 1000}s per level`);

    return textLines;
}
