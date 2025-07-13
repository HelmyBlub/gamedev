import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_PET_PAINTER_UPGRADE_FUNCTIONS, AbilityPetPainter } from "./abilityPetPainter.js";

export type AbilityPetPainterUpgradeFactory = AbilityUpgrade & {
    spawnInterval: number,
    duration: number,
}

export const ABILITY_PET_PAINTER_UPGRADE_FACTORY = "Paint Factory";

export function addAbilityPetPainterUpgradeFactory() {
    ABILITY_PET_PAINTER_UPGRADE_FUNCTIONS[ABILITY_PET_PAINTER_UPGRADE_FACTORY] = {
        getStatsDisplayText: getAbilityUpgradeFactoryUiText,
        getMoreInfoIncreaseOneLevelText: getAbilityUpgradeFactoryUiTextLong,
        getOptions: getOptionsFactory,
        executeOption: executeOptionPaintFactory,
        setUpgradeToBossLevel: setUpgradeToBossLevel,
    }
}

function setUpgradeToBossLevel(ability: Ability, level: number) {
    const up: AbilityPetPainterUpgradeFactory = ability.upgrades[ABILITY_PET_PAINTER_UPGRADE_FACTORY];
    if (!up) return;
    const levelToUpgradeLevel = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1];
    if (level < levelToUpgradeLevel.length) {
        up.level = levelToUpgradeLevel[level];
    } else {
        up.level = Math.max(0, Math.floor(level / 4));
    }
    up.duration = up.level * up.spawnInterval + 500;
}

function getOptionsFactory(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_PET_PAINTER_UPGRADE_FACTORY);
    options[0].option.displayMoreInfoText = getAbilityUpgradeFactoryUiTextLong(ability);
    return options;
}

function executeOptionPaintFactory(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilityPetPainter;
    let up: AbilityPetPainterUpgradeFactory;
    if (as.upgrades[ABILITY_PET_PAINTER_UPGRADE_FACTORY] === undefined) {
        up = { level: 0, duration: 500, spawnInterval: 500 };
        as.upgrades[ABILITY_PET_PAINTER_UPGRADE_FACTORY] = up;
    } else {
        up = as.upgrades[ABILITY_PET_PAINTER_UPGRADE_FACTORY];
    }
    up.duration += up.spawnInterval;
    up.level++;
}

function getAbilityUpgradeFactoryUiText(ability: Ability): string {
    const up: AbilityPetPainterUpgradeFactory = ability.upgrades[ABILITY_PET_PAINTER_UPGRADE_FACTORY];
    return `${ABILITY_PET_PAINTER_UPGRADE_FACTORY}: Level ${up.level}`;
}

function getAbilityUpgradeFactoryUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityUpgrade | undefined = ability.upgrades[ABILITY_PET_PAINTER_UPGRADE_FACTORY];
    if (upgrade) {
        textLines.push(`Inrease factory shapes created from ${upgrade.level + 1} to ${upgrade.level + 2}.`);
    } else {
        textLines.push(`Painter creates shape Factory instead of shape.`);
        textLines.push(`Shape Factory creates multiple shapes over time.`);
    }

    return textLines;
}
