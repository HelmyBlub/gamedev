import { Character } from "../character/characterModel.js";
import { AbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability } from "../character/upgrade.js";
import { ABILITIES_FUNCTIONS, Ability } from "./ability.js"

export type AbilityUpgrade = {
    level: number,
}

export type AbilityUpgradeFunctions = {
    getOptions?: (ability: Ability) => UpgradeOptionAndProbability[],
    executeOption: (ability: Ability, option: AbilityUpgradeOption) => void,
    getUiText: (ability: Ability) => string,
    getUiTextLong: (ability: Ability, name: string | undefined) => string[],
    getDamageFactor?: (ability: Ability, playerTriggered: boolean) => number,
}

export type AbilityUpgradesFunctions = {
    [key: string]: AbilityUpgradeFunctions,
}

export function upgradeAbility(ability: Ability, character: Character, upgradeOption: AbilityUpgradeOption){
    const abilityFunctions = ABILITIES_FUNCTIONS[upgradeOption.name!];
    const upgradeFunctions = abilityFunctions.abilityUpgradeFunctions![upgradeOption.identifier];
    if (upgradeFunctions) {
        upgradeFunctions.executeOption(ability, upgradeOption);
        if (ability.bossSkillPoints !== undefined) ability.bossSkillPoints--;
    }
    character.upgradeChoices = [];
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
            texts.push(upgradeFunctions[key].getUiText(ability));
        }
    }
}

export function pushAbilityUpgradesOptions(upgradeFunctions: AbilityUpgradesFunctions, upgradeOptions: UpgradeOptionAndProbability[], ability: Ability) {
    const keys = Object.keys(upgradeFunctions);
    for(let key of keys){
        const functions = upgradeFunctions[key];
        if(functions.getOptions){
            upgradeOptions.push(...functions.getOptions(ability));
        }else{
            upgradeOptions.push(...getAbilityUpgradeOptionDefault(key));
        }
    }
}

export function getAbilityUpgradesDamageFactor(upgradeFunctions: AbilityUpgradesFunctions, ability: Ability, playerTriggered: boolean): number{
    const keys = Object.keys(upgradeFunctions);
    let damageFactor = 1;
    for(let key of keys){
        if(ability.upgrades[key]){
            let functions = upgradeFunctions[key];
            if(functions.getDamageFactor){
                damageFactor *= functions.getDamageFactor(ability, playerTriggered);
            }
        }
    }
    return damageFactor;
}

export function getAbilityUpgradeOptionDefault(optionName: string): UpgradeOptionAndProbability[] {
    return [{
        option: {
            displayText: optionName,
            identifier: optionName,
            type: "Ability",
            boss: true,
        },
        probability: 1,
    }];
}