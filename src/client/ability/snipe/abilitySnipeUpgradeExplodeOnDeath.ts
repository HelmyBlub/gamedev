import { Character } from "../../character/characterModel.js";
import { UpgradeOptionAndProbability, AbilityUpgradeOption } from "../../character/upgrade.js";
import { applyDebuff } from "../../debuff/debuff.js";
import { createDebuffExplodeOnDeath } from "../../debuff/debuffExplodeOnDeath.js";
import { Game } from "../../gameModel.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade } from "../abilityUpgrade.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilitySnipe, getAbilitySnipeDamage, getOptionsSnipeUpgrade } from "./abilitySnipe.js";
import { ABILITY_SNIPE_UPGRADE_AFTER_IMAGE } from "./abilitySnipeUpgradeAfterImage.js";
import { ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT } from "./abilitySnipeUpgradeBackwardsShot.js";
import { ABILITY_SNIPE_UPGRADE_MORE_RIFLES } from "./abilitySnipeUpgradeMoreRifle.js";
import { ABILITY_SNIPE_UPGRADE_SPLIT_SHOT } from "./abilitySnipeUpgradeSplitShot.js";

export const ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH = "Explode on Death";

const DAMAGE_FACTOR = 0.5;
const EXPLODE_RADIUS = 50;

export type AbilityUpgradeExplodeOnDeath = AbilityUpgrade & {
    radius: number,
    damageFactor: number,
    upgradeSynergy: boolean,
}

export function addAbilitySnipeUpgradeExplodeOnDeath() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH] = {
        addSynergyUpgradeOption: addSynergyUpgradeOption,
        getMoreInfoIncreaseOneLevelText: getAbilityUpgradeExplodeOnDeathUiTextLong,
        getMoreInfoExplainText: getExplainText,
        getOptions: getOptionsExplodeOnDeath,
        executeOption: executeOptionExplodeOnDeath,
    }
}

export function executeUpgradeExplodeOnDeath(ability: AbilitySnipe, faction: string, targetCharacter: Character, playerTriggered: boolean, game: Game) {
    const upgrade: AbilityUpgradeExplodeOnDeath = ability.upgrades[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH];
    if (!upgrade) return;
    if (!playerTriggered && !upgrade.upgradeSynergy) return;

    const damage = upgrade.damageFactor * getAbilitySnipeDamage(ability, ability.baseDamage, false, 0, faction);
    const explodeOnDeath = createDebuffExplodeOnDeath(damage, faction, upgrade.radius, ability.id);
    applyDebuff(explodeOnDeath, targetCharacter, game);
}

function getOptionsExplodeOnDeath(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getOptionsSnipeUpgrade(ability, ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH);
    return options;
}

function executeOptionExplodeOnDeath(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilitySnipe;
    let up: AbilityUpgradeExplodeOnDeath;
    if (option.additionalInfo === "Synergy") {
        up = as.upgrades[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH];
        up.upgradeSynergy = true;
    } else {
        if (as.upgrades[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH] === undefined) {
            up = {
                level: 0,
                damageFactor: 0,
                radius: EXPLODE_RADIUS,
                upgradeSynergy: false,
            }
            as.upgrades[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH] = up;
        } else {
            up = as.upgrades[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH];
        }
        up.level++;
        up.damageFactor += DAMAGE_FACTOR;
    }
}

function addSynergyUpgradeOption(ability: Ability): boolean {
    if (ability.upgrades[ABILITY_SNIPE_UPGRADE_AFTER_IMAGE]
        || ability.upgrades[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT]
        || ability.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES]
        || ability.upgrades[ABILITY_SNIPE_UPGRADE_SPLIT_SHOT]) {
        return true;
    }
    return false;
}

function getExplainText(ability: Ability, upgrade: AbilityUpgrade): string[] {
    const explodeUpgrade = upgrade as AbilityUpgradeExplodeOnDeath;
    const textLines: string[] = [];
    textLines.push(`Enemies hit by the main shot explode on death.`);
    textLines.push(`Explode damage: ${(DAMAGE_FACTOR * upgrade.level * 100).toFixed(0)}% of base damage.`);
    if (explodeUpgrade.upgradeSynergy) {
        textLines.push(`Synergy with:`);
        textLines.push(`- ${ABILITY_SNIPE_UPGRADE_AFTER_IMAGE}`);
        textLines.push(`- ${ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT}`);
        textLines.push(`- ${ABILITY_SNIPE_UPGRADE_MORE_RIFLES}`);
        textLines.push(`- ${ABILITY_SNIPE_UPGRADE_SPLIT_SHOT}`);
    }
    return textLines;
}


function getAbilityUpgradeExplodeOnDeathUiTextLong(ability: Ability, option: AbilityUpgradeOption): string[] {
    const textLines: string[] = [];
    if (option.additionalInfo && option.additionalInfo === "Synergy") {
        textLines.push(`List of synergies:`);
        textLines.push(`- ${ABILITY_SNIPE_UPGRADE_AFTER_IMAGE}`);
        textLines.push(`- ${ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT}`);
        textLines.push(`- ${ABILITY_SNIPE_UPGRADE_MORE_RIFLES}`);
        textLines.push(`- ${ABILITY_SNIPE_UPGRADE_SPLIT_SHOT}`);
    } else {
        const upgrade: AbilityUpgradeExplodeOnDeath | undefined = ability.upgrades[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH];
        textLines.push(`Enemies hit by the main shot explode on death`);
        if (upgrade) {
            textLines.push(`Explode damage from ${(DAMAGE_FACTOR * upgrade.level * 100).toFixed(0)}% to ${(DAMAGE_FACTOR * (upgrade.level + 1) * 100).toFixed(0)}%`);
        } else {
            textLines.push(`They explode for ${(DAMAGE_FACTOR * 100).toFixed(0)}% damage.`);
        }
    }

    return textLines;
}
