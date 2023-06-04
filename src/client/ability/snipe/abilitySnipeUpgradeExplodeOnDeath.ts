import { Character } from "../../character/characterModel.js";
import { applyDebuff } from "../../debuff/debuff.js";
import { createDebuffExplodeOnDeath } from "../../debuff/debuffExplodeOnDeath.js";
import { Game } from "../../gameModel.js";
import { Ability, AbilityOwner, AbilityUpgradeOption } from "../ability.js";
import { AbilityUpgrade } from "../abilityUpgrade.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilitySnipe, getAbilitySnipeDamage } from "./abilitySnipe.js";

export const ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH = "Explode on Death";

const DAMAGE_FACTOR = 0.5;
const EXPLODE_SIZE = 100;

export type AbilityUpgradeExplodeOnDeath = AbilityUpgrade & {
    size: number,
    damageFactor: number,
    upgradeSynergry: boolean,
}

export function addAbilitySnipeUpgradeExplodeOnDeath() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH] = {
        getAbilityUpgradeUiText: getAbilityUpgradeExplodeOnDeathUiText,
        getAbilityUpgradeUiTextLong: getAbilityUpgradeExplodeOnDeathUiTextLong,
        pushAbilityUpgradeOption: pushAbilityUpgradeExplodeOnDeath,
    }
}

export function executeUpgradeExplodeOnDeath(ability: AbilitySnipe, faction: string, targetCharacter: Character, playerTriggered: boolean, game: Game){
    const upgrade: AbilityUpgradeExplodeOnDeath = ability.upgrades[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH];
    if(!upgrade) return;
    if(!playerTriggered && !upgrade.upgradeSynergry) return;

    const damage = upgrade.damageFactor * getAbilitySnipeDamage(ability, ability.baseDamage, false, 0);
    const explodeOnDeath = createDebuffExplodeOnDeath(damage, faction, upgrade.size, ability.id);
    applyDebuff(explodeOnDeath, targetCharacter, game);
}

function getAbilityUpgradeExplodeOnDeathUiText(ability: Ability): string {
    let abilitySnipe = ability as AbilitySnipe;
    let upgrade: AbilityUpgradeExplodeOnDeath = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH];
    return `${ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH}: Damage ${(upgrade.damageFactor) * 100}%` + (upgrade.upgradeSynergry ? " (synergry)" : "");
}

function getAbilityUpgradeExplodeOnDeathUiTextLong(ability: Ability, name: string | undefined): string[] {
    let abilitySnipe = ability as AbilitySnipe;
    let upgrade: AbilityUpgradeExplodeOnDeath | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH];
    const levelText = (upgrade ? `(${upgrade.level + 1})` : "");

    const textLines: string[] = [];
    if (name && name.startsWith("Synergry")) {
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

function pushAbilityUpgradeExplodeOnDeath(ability: Ability, upgradeOptions: AbilityUpgradeOption[]) {
    const upgradeExplodeOnDeath: AbilityUpgradeExplodeOnDeath | undefined = ability.upgrades[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH];   

    upgradeOptions.push({
        name: ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH, probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySnipe;
            let up: AbilityUpgradeExplodeOnDeath;
            if (as.upgrades[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH] === undefined) {
                up = {
                    level: 0,
                    damageFactor: 0,
                    size: EXPLODE_SIZE,
                    upgradeSynergry: false,
                }
                as.upgrades[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH] = up;
            } else {
                up = as.upgrades[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH];
            }
            up.level++;
            up.damageFactor += DAMAGE_FACTOR;
        }
    });
    if (upgradeExplodeOnDeath && !upgradeExplodeOnDeath.upgradeSynergry) {
        const probability = 0.3 * upgradeExplodeOnDeath.level;
        upgradeOptions.push({
            name: `Synergry ${ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH}`,
            upgradeName: ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH,
            probabilityFactor: probability,
            upgrade: (a: Ability) => {
                let up: AbilityUpgradeExplodeOnDeath = a.upgrades[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH];
                up.upgradeSynergry = true;
            }
        });
    }    
}
