import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_PET_PAINTER_UPGRADE_FUNCTIONS, AbilityPetPainter } from "./abilityPetPainter.js";

export type AbilityPetPainterUpgradeFactory = AbilityUpgrade & {
    spawnInterval: number,
    duration: number,
}

export const ABILITY_PET_PAINTER_UPGARDE_FACTORY = "Paint Factory";

export function addAbilityPetPainterUpgradeFactory() {
    ABILITY_PET_PAINTER_UPGRADE_FUNCTIONS[ABILITY_PET_PAINTER_UPGARDE_FACTORY] = {
        getStatsDisplayText: getAbilityUpgradeFactoryUiText,
        getLongExplainText: getAbilityUpgradeFactoryUiTextLong,
        getOptions: getOptionsFactory,
        executeOption: executeOptionPaintFactory,
    }
}

function getOptionsFactory(ability: Ability): UpgradeOptionAndProbability[] {
    let options = getAbilityUpgradeOptionDefault(ability, ABILITY_PET_PAINTER_UPGARDE_FACTORY);
    options[0].option.displayLongText = getAbilityUpgradeFactoryUiTextLong(ability);
    return options;
}

function executeOptionPaintFactory(ability: Ability, option: AbilityUpgradeOption) {
    let as = ability as AbilityPetPainter;
    let up: AbilityPetPainterUpgradeFactory;
    if (as.upgrades[ABILITY_PET_PAINTER_UPGARDE_FACTORY] === undefined) {
        up = { level: 0, duration: 500, spawnInterval: 500};
        as.upgrades[ABILITY_PET_PAINTER_UPGARDE_FACTORY] = up;
    } else {
        up = as.upgrades[ABILITY_PET_PAINTER_UPGARDE_FACTORY];
    }
    up.duration += up.spawnInterval * 2;
    up.level++;
}

function getAbilityUpgradeFactoryUiText(ability: Ability): string {
    let up: AbilityPetPainterUpgradeFactory = ability.upgrades[ABILITY_PET_PAINTER_UPGARDE_FACTORY];
    return `${ABILITY_PET_PAINTER_UPGARDE_FACTORY}: Level ${up.level}`;
}

function getAbilityUpgradeFactoryUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityUpgrade | undefined = ability.upgrades[ABILITY_PET_PAINTER_UPGARDE_FACTORY];
    if(upgrade){
        textLines.push(`Inrease number of shapes created by factory to ${upgrade.level + 2}`);
    }else{
        textLines.push(`Painter creates shape Factory instead of shape.`);
        textLines.push(`Shape Factory creates multiple shapes over time.`);
    }

    return textLines;
}
