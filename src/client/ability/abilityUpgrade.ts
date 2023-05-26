import { Ability, AbilityUpgradeOption } from "./ability.js"


export type AbilityUpgrade = {
    level: number,
}

export type AbilityUpgradeFunctions = {
    pushAbilityUpgradeOption: (ability: Ability, upgradeOptions: AbilityUpgradeOption[]) => void,
    getAbilityUpgradeUiText: (ability: Ability) => string,
    getAbilityUpgradeUiTextLong: (ability: Ability) => string[],
    getAbilityUpgradeDamageFactor?: (ability: Ability) => number,
}

export type AbilityUpgradesFunctions = {
    [key: string]: AbilityUpgradeFunctions,
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

export function getAbilityUpgradesDamageFactor(upgradeFunctions: AbilityUpgradesFunctions, ability: Ability): number{
    const keys = Object.keys(upgradeFunctions);
    let damageFactor = 1;
    for(let key of keys){
        if(ability.upgrades[key]){
            let functions = upgradeFunctions[key];
            if(functions.getAbilityUpgradeDamageFactor){
                damageFactor *= functions.getAbilityUpgradeDamageFactor(ability);
            }
        }
    }
    return damageFactor;
}
