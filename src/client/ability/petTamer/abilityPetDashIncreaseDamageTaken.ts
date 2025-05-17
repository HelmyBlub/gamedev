import { Character } from "../../character/characterModel.js";
import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { applyDebuff } from "../../debuff/debuff.js";
import { createDebuffDamageTaken } from "../../debuff/debuffDamageTaken.js";
import { Game } from "../../gameModel.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_PET_DASH_UPGRADE_FUNCTIONS, AbilityPetDash } from "./abilityPetDash.js";

export type AbilityPetDashUpgradeIncreaseDamageTaken = AbilityUpgrade & {
    duration: number,
    increaseFactor: number,
}

export const ABILITY_PET_DASH_UPGRADE_INCREASE_DAMAGE_TAKEN = "Dash Increase Damage Taken";
const DURATION_PER_LEVEL = 2000;
const DAMAGE_INCREASE_PER_LEVEL = 0.5;

export function addAbilityPetDashUpgradeIncreaseDamageTaken() {
    ABILITY_PET_DASH_UPGRADE_FUNCTIONS[ABILITY_PET_DASH_UPGRADE_INCREASE_DAMAGE_TAKEN] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getMoreInfoIncreaseOneLevelText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
    }
}

export function abilityPetDashUpgradeDamageTakenApplyDebuff(ability: AbilityPetDash, target: Character, game: Game) {
    const damageTaken = ability.upgrades[ABILITY_PET_DASH_UPGRADE_INCREASE_DAMAGE_TAKEN] as AbilityPetDashUpgradeIncreaseDamageTaken;
    if (damageTaken === undefined) return;
    const debuffDamageTaken = createDebuffDamageTaken(damageTaken.increaseFactor, damageTaken.duration, game.state.time, false, ability.id);
    applyDebuff(debuffDamageTaken, target, game);
}

function getOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_PET_DASH_UPGRADE_INCREASE_DAMAGE_TAKEN);
    options[0].option.displayMoreInfoText = getAbilityUpgradeUiTextLong(ability);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilityPetDash;
    let up: AbilityPetDashUpgradeIncreaseDamageTaken;
    if (as.upgrades[ABILITY_PET_DASH_UPGRADE_INCREASE_DAMAGE_TAKEN] === undefined) {
        up = {
            level: 0,
            duration: 0,
            increaseFactor: 1,
        };
        as.upgrades[ABILITY_PET_DASH_UPGRADE_INCREASE_DAMAGE_TAKEN] = up;
    } else {
        up = as.upgrades[ABILITY_PET_DASH_UPGRADE_INCREASE_DAMAGE_TAKEN];
    }
    up.duration += DURATION_PER_LEVEL;
    up.increaseFactor += DAMAGE_INCREASE_PER_LEVEL;
    up.level++;
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityPetDashUpgradeIncreaseDamageTaken = ability.upgrades[ABILITY_PET_DASH_UPGRADE_INCREASE_DAMAGE_TAKEN];
    return `${ABILITY_PET_DASH_UPGRADE_INCREASE_DAMAGE_TAKEN}: Level ${up.level}`;
}

function getAbilityUpgradeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityUpgrade | undefined = ability.upgrades[ABILITY_PET_DASH_UPGRADE_INCREASE_DAMAGE_TAKEN];
    textLines.push(`Enemies hit by Dash take more damage from all sources.`);
    if (upgrade) {
        textLines.push(`Damage increase from ${upgrade.level * DAMAGE_INCREASE_PER_LEVEL * 100}% to ${(upgrade.level + 1) * DAMAGE_INCREASE_PER_LEVEL * 100}%`);
        textLines.push(`Duration increase from ${upgrade.level * DURATION_PER_LEVEL / 1000}s to ${(upgrade.level + 1) * DURATION_PER_LEVEL / 1000}s.`);
    } else {
        textLines.push(`Damage increase: ${DAMAGE_INCREASE_PER_LEVEL * 100}%.`);
        textLines.push(`Duration: ${DURATION_PER_LEVEL / 1000}s.`);
    }

    return textLines;
}
