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
}

export function addAbilitySnipeUpgradeExplodeOnDeath() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH] = {
        getAbilityUpgradeUiText: getAbilityUpgradeExplodeOnDeathUiText,
        getAbilityUpgradeUiTextLong: getAbilityUpgradeExplodeOnDeathUiTextLong,
        pushAbilityUpgradeOption: pushAbilityUpgradeExplodeOnDeath,
    }
}

export function applyDebuffExplodeOnDeath(ability: AbilitySnipe, abilityUpgrade: AbilityUpgradeExplodeOnDeath, faction: string, targetCharacter: Character, game: Game){
    const damage = abilityUpgrade.damageFactor * getAbilitySnipeDamage(ability);
    const explodeOnDeath = createDebuffExplodeOnDeath(damage, faction, abilityUpgrade.size, ability.id);
    applyDebuff(explodeOnDeath, targetCharacter, game);
}

function getAbilityUpgradeExplodeOnDeathUiText(ability: Ability): string {
    let abilitySnipe = ability as AbilitySnipe;
    let upgrade: AbilityUpgradeExplodeOnDeath = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH];
    return `${ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH}: Damage ${(upgrade.damageFactor) * 100}%`;
}

function getAbilityUpgradeExplodeOnDeathUiTextLong(ability: Ability): string[] {
    let abilitySnipe = ability as AbilitySnipe;
    let upgrade: AbilityUpgradeExplodeOnDeath | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH];
    const levelText = (upgrade ? `(${upgrade.level + 1})` : "");

    const textLines: string[] = [];
    textLines.push(ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH + levelText);
    textLines.push(`When Enemies die after they are hit they explode.`);
    textLines.push(`They explode for ${(DAMAGE_FACTOR * 100).toFixed(2)}% damage.`);

    return textLines;
}

function pushAbilityUpgradeExplodeOnDeath(ability: Ability, upgradeOptions: AbilityUpgradeOption[]) {
    upgradeOptions.push({
        name: ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH, probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySnipe;
            let up: AbilityUpgradeExplodeOnDeath;
            if (as.upgrades[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH] === undefined) {
                up = {
                    level: 0,
                    damageFactor: 0,
                    size: EXPLODE_SIZE,
                }
                as.upgrades[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH] = up;
            } else {
                up = as.upgrades[ABILITY_SNIPE_UPGRADE_EXPLODE_ON_DEATH];
            }
            up.level++;
            up.damageFactor += DAMAGE_FACTOR;
        }
    });
}
