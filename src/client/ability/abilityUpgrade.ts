import { Character } from "../character/characterModel.js";
import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../character/upgrade.js";
import { Game } from "../gameModel.js";
import { paintTextLinesWithKeys } from "../gamePaint.js";
import { MoreInfoHoverTexts } from "../moreInfo.js";
import { ABILITIES_FUNCTIONS, Ability } from "./ability.js"

export type AbilityUpgrade = {
    level: number,
}

export type AbilityUpgradeFunctions = {
    getOptions?: (ability: Ability, character: Character, game: Game) => UpgradeOptionAndProbability[],
    addSynergyUpgradeOption?: (ability: Ability) => boolean,
    executeOption: (ability: Ability, option: AbilityUpgradeOption, character: Character) => void,
    getStatsDisplayText: (ability: Ability) => string,
    getMoreInfoText?: (ability: Ability, option: AbilityUpgradeOption) => string[],
    getDamageFactor?: (ability: Ability, playerTriggered: boolean, faction: string) => number,
    reset?: (ability: Ability) => void,
    setUpgradeToBossLevel?: (ability: Ability, level: number) => void,
}

export type AbilityUpgradesFunctions = {
    [key: string]: AbilityUpgradeFunctions,
}

export function upgradeAbility(ability: Ability, character: Character, upgradeOption: AbilityUpgradeOption) {
    const abilityFunctions = ABILITIES_FUNCTIONS[upgradeOption.name!];
    const upgradeFunctions = abilityFunctions.abilityUpgradeFunctions![upgradeOption.identifier!];
    if (upgradeFunctions) {
        upgradeFunctions.executeOption(ability, upgradeOption, character);
        if (ability.bossSkillPoints !== undefined) {
            ability.bossSkillPoints.available--;
            ability.bossSkillPoints.used++;
        }
    }
    character.upgradeChoices.choices = [];
}

export function pushAbilityUpgradesUiTexts(upgradeFunctions: AbilityUpgradesFunctions, texts: string[], upgradeHoverLines: MoreInfoHoverTexts | undefined, ability: Ability) {
    const keys = Object.keys(upgradeFunctions);
    let first = true;
    for (let key of keys) {
        if (ability.upgrades[key]) {
            if (first) {
                texts.push("");
                texts.push("Upgrades:");
                first = false;
            }
            const functions = upgradeFunctions[key];
            texts.push(functions.getStatsDisplayText(ability));
            if (upgradeHoverLines && functions.getMoreInfoText) {
                const hoverLines = functions.getMoreInfoText(ability, ability.upgrades[key]);
                upgradeHoverLines[texts.length - 1] = hoverLines;
            }

        }
    }
}

export function pushAbilityUpgradesOptions(upgradeFunctions: AbilityUpgradesFunctions, upgradeOptions: UpgradeOptionAndProbability[], ability: Ability, character: Character, game: Game) {
    const keys = Object.keys(upgradeFunctions);
    for (let key of keys) {
        const functions = upgradeFunctions[key];
        if (functions.getOptions) {
            upgradeOptions.push(...functions.getOptions(ability, character, game));
        } else {
            upgradeOptions.push(...getAbilityUpgradeOptionDefault(ability, key));
        }
    }
}

export function getAbilityUpgradesDamageFactor(upgradeFunctions: AbilityUpgradesFunctions, ability: Ability, playerTriggered: boolean, faction: string): number {
    const keys = Object.keys(upgradeFunctions);
    let damageFactor = 1;
    for (let key of keys) {
        if (ability.upgrades && ability.upgrades[key]) {
            let functions = upgradeFunctions[key];
            if (functions.getDamageFactor) {
                damageFactor *= functions.getDamageFactor(ability, playerTriggered, faction);
            }
        }
    }
    return damageFactor;
}

export function getAbilityUpgradeOptionDefault(ability: Ability, upgradeName: string): UpgradeOptionAndProbability[] {
    const upgrade = ability.upgrades[upgradeName] as AbilityUpgrade;
    const option: AbilityUpgradeOption = {
        displayText: upgradeName + (upgrade ? `(${upgrade.level + 1})` : ""),
        identifier: upgradeName,
        name: ability.name,
        type: "Ability",
        boss: true,
    }
    return [{
        option: option,
        probability: 1,
    }];
}

export function paintAbilityUpgradeMoreInfosIfMouseHovered(ctx: CanvasRenderingContext2D, game: Game) {
    if (!game.UI.displayMoreInfos) return;
    if (game.UI.moreInfos.containers.selected == undefined) return;
    const mousePos = game.mouseRelativeCanvasPosition;
    const selectedContainer = game.UI.moreInfos.containers.containers[game.UI.moreInfos.containers.selected];

    for (let moreInfosPart of selectedContainer.moreInfoParts) {
        if (moreInfosPart.lastPaintedPos === undefined || moreInfosPart.hoverText === undefined) continue;
        if (moreInfosPart.lastPaintedPos.x < mousePos.x && mousePos.x < moreInfosPart.lastPaintedPos.x + moreInfosPart.width
            && moreInfosPart.lastPaintedPos.y < mousePos.y && mousePos.y < moreInfosPart.lastPaintedPos.y + moreInfosPart.height
        ) {
            const mouseHoverIndex = Math.floor((mousePos.y - moreInfosPart.lastPaintedPos.y) / moreInfosPart.fontSize);
            const hoverText = moreInfosPart.hoverText[mouseHoverIndex];
            if (hoverText !== undefined) {
                paintTextLinesWithKeys(ctx, hoverText, mousePos, 14, false, true);
            }
        }
    }
    selectedContainer.moreInfoParts
}
