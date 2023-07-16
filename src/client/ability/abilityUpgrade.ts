import { Character } from "../character/characterModel.js";
import { CharacterUpgradeChoice } from "../character/characterUpgrades.js";
import { ABILITIES_FUNCTIONS, Ability } from "./ability.js"

export type AbilityUpgrade = {
    level: number,
}

export type AbilityUpgradeOption = {
    name: string,
    upgradeName?: string,
    probabilityFactor: number,
    upgrade: (ability: Ability) => void,
}

export type AbilityUpgradeFunctions = {
    pushAbilityUpgradeOption: (ability: Ability, upgradeOptions: AbilityUpgradeOption[]) => void,
    getAbilityUpgradeUiText: (ability: Ability) => string,
    getAbilityUpgradeUiTextLong: (ability: Ability, name: string | undefined) => string[],
    getAbilityUpgradeDamageFactor?: (ability: Ability, playerTriggered: boolean) => number,
}

export type AbilityUpgradesFunctions = {
    [key: string]: AbilityUpgradeFunctions,
}

export function upgradeAbility(character: Character, upgradeOption: CharacterUpgradeChoice){
    let ability = character.abilities.find(a => a.name === upgradeOption.abilityName);
    if (ability !== undefined) {
        let upgrades: AbilityUpgradeOption[];
        if (upgradeOption.boss) {
            const abilityFunctions = ABILITIES_FUNCTIONS[upgradeOption.abilityName!];
            if (abilityFunctions.createAbilityBossUpgradeOptions) {
                upgrades = abilityFunctions.createAbilityBossUpgradeOptions(ability);
                upgrades.find((e) => e.name === upgradeOption.name)?.upgrade(ability);
                if (ability.bossSkillPoints !== undefined) ability.bossSkillPoints--;
            }
        } else {
            upgrades = ABILITIES_FUNCTIONS[upgradeOption.abilityName!].createAbilityUpgradeOptions(ability);
            upgrades.find((e) => e.name === upgradeOption.name)?.upgrade(ability);
        }
        character.upgradeChoice = [];
    }    
}

export function pushAbilityUpgradesUiTexts(upgradeFunctions: AbilityUpgradesFunctions, texts: string[], ability: Ability){
    const keys = Object.keys(upgradeFunctions);
    let first = true;
    for(let key of keys){
        if(ability.upgrades[key]){
            if(first) {
                texts.push("");
                texts.push("Upgrades:");
                first = false;
            }
            texts.push(upgradeFunctions[key].getAbilityUpgradeUiText(ability));
        }
    }
}

export function pushAbilityUpgradesOptions(upgradeFunctions: AbilityUpgradesFunctions, upgradeOptions: AbilityUpgradeOption[], ability: Ability) {
    const keys = Object.keys(upgradeFunctions);
    for(let key of keys){
        upgradeFunctions[key].pushAbilityUpgradeOption(ability, upgradeOptions);
    }
}

export function getAbilityUpgradesDamageFactor(upgradeFunctions: AbilityUpgradesFunctions, ability: Ability, playerTriggered: boolean): number{
    const keys = Object.keys(upgradeFunctions);
    let damageFactor = 1;
    for(let key of keys){
        if(ability.upgrades[key]){
            let functions = upgradeFunctions[key];
            if(functions.getAbilityUpgradeDamageFactor){
                damageFactor *= functions.getAbilityUpgradeDamageFactor(ability, playerTriggered);
            }
        }
    }
    return damageFactor;
}
