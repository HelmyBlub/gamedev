import { Character } from "../../character/characterModel.js";
import { UpgradeOptionAndProbability, AbilityUpgradeOption } from "../../character/upgrade.js";
import { applyDebuff } from "../../debuff/debuff.js";
import { createDebuffExplodeOnDeath } from "../../debuff/debuffExplodeOnDeath.js";
import { Game } from "../../gameModel.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault, getAbilityUpgradeOptionSynergy } from "../abilityUpgrade.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilitySnipe, getAbilitySnipeDamage } from "./abilitySnipe.js";

export const ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH = "Explode on Death";

const DAMAGE_FACTOR = 0.5;
const EXPLODE_RADIUS = 50;

export type AbilityUpgradeExplodeOnDeath = AbilityUpgrade & {
    radius: number,
    damageFactor: number,
    upgradeSynergry: boolean,
}

export function addAbilitySnipeUpgradeExplodeOnDeath() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH] = {
        getStatsDisplayText: getAbilityUpgradeExplodeOnDeathUiText,
        getLongExplainText: getAbilityUpgradeExplodeOnDeathUiTextLong,
        getOptions: getOptionsExplodeOnDeath,
        executeOption: executeOptionExplodeOnDeath,
    }
}

export function executeUpgradeExplodeOnDeath(ability: AbilitySnipe, faction: string, targetCharacter: Character, playerTriggered: boolean, game: Game) {
    const upgrade: AbilityUpgradeExplodeOnDeath = ability.upgrades[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH];
    if (!upgrade) return;
    if (!playerTriggered && !upgrade.upgradeSynergry) return;

    const damage = upgrade.damageFactor * getAbilitySnipeDamage(ability, ability.baseDamage, false, 0);
    const explodeOnDeath = createDebuffExplodeOnDeath(damage, faction, upgrade.radius, ability.id);
    applyDebuff(explodeOnDeath, targetCharacter, game);
}

function getOptionsExplodeOnDeath(ability: Ability): UpgradeOptionAndProbability[] {
    let options = getAbilityUpgradeOptionDefault(ability, ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH);
    const upgradeExplodeOnDeath: AbilityUpgradeExplodeOnDeath | undefined = ability.upgrades[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH];

    if (upgradeExplodeOnDeath && !upgradeExplodeOnDeath.upgradeSynergry) {
        options.push(getAbilityUpgradeOptionSynergy(ability.name, ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH, upgradeExplodeOnDeath.level));
    }
    options[0].option.displayLongText = getAbilityUpgradeExplodeOnDeathUiTextLong(ability, options[0].option as AbilityUpgradeOption);

    return options;
}

function executeOptionExplodeOnDeath(ability: Ability, option: AbilityUpgradeOption) {
    let as = ability as AbilitySnipe;
    let up: AbilityUpgradeExplodeOnDeath;
    if (option.additionalInfo === "Synergy") {
        up = as.upgrades[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH];
        up.upgradeSynergry = true;
    } else {
        if (as.upgrades[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH] === undefined) {
            up = {
                level: 0,
                damageFactor: 0,
                radius: EXPLODE_RADIUS,
                upgradeSynergry: false,
            }
            as.upgrades[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH] = up;
        } else {
            up = as.upgrades[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH];
        }
        up.level++;
        up.damageFactor += DAMAGE_FACTOR;
    }
}

function getAbilityUpgradeExplodeOnDeathUiText(ability: Ability): string {
    let abilitySnipe = ability as AbilitySnipe;
    let upgrade: AbilityUpgradeExplodeOnDeath = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH];
    return `${ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH}: Damage ${(upgrade.damageFactor) * 100}%` + (upgrade.upgradeSynergry ? " (synergry)" : "");
}

function getAbilityUpgradeExplodeOnDeathUiTextLong(ability: Ability, option: AbilityUpgradeOption): string[] {
    let abilitySnipe = ability as AbilitySnipe;
    let upgrade: AbilityUpgradeExplodeOnDeath | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH];
    const levelText = (upgrade ? `(${upgrade.level + 1})` : "");

    const textLines: string[] = [];
    if (option.additionalInfo && option.additionalInfo === "Synergry") {
        textLines.push(`Synergry ${ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH}`);
        textLines.push(`List of synergies:`);
        textLines.push(`- After Image`);
        textLines.push(`- Backwards Shot`);
        textLines.push(`- More Rifles`);
        textLines.push(`- Split Shot`);
    } else {
        textLines.push(ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH + levelText);
        textLines.push(`Enemies hit by the main shot explode on death`);
        textLines.push(`They explode for ${(DAMAGE_FACTOR * 100).toFixed(2)}% damage.`);
    }

    return textLines;
}
