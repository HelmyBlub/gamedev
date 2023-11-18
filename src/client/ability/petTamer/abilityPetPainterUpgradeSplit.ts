import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Game } from "../../gameModel.js";
import { Ability, findAbilityById } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_PET_PAINTER_SHAPES_FUNCTIONS, ABILITY_PET_PAINTER_UPGRADE_FUNCTIONS, AbilityObjectPetPainter, AbilityPetPainter } from "./abilityPetPainter.js";

export type AbilityPetPainterUpgradeSplit = AbilityUpgrade & {
    count: number,
    damageFactor: number,
}

export const ABILITY_PET_PAINTER_UPGRADE_SPLIT = "Paint Split";

export function addAbilityPetPainterUpgradeSplit() {
    ABILITY_PET_PAINTER_UPGRADE_FUNCTIONS[ABILITY_PET_PAINTER_UPGRADE_SPLIT] = {
        getStatsDisplayText: getAbilityUpgradeSplitUiText,
        getLongExplainText: getAbilityUpgradeSplitUiTextLong,
        getOptions: getOptionsSplit,
        executeOption: executeOptionPaintSplit,
    }
}

export function abilityPetPainerUpgradeSplitCheckForSplit(abilityObjectPetPainter: AbilityObjectPetPainter, game: Game) {
    const abilityPetPainter = findAbilityById(abilityObjectPetPainter.abilityRefId!, game);
    if (!abilityPetPainter) return;
    const splitUpgrade = abilityPetPainter.upgrades[ABILITY_PET_PAINTER_UPGRADE_SPLIT] as AbilityPetPainterUpgradeSplit;
    if (splitUpgrade) {
        const shapeFunctions = ABILITY_PET_PAINTER_SHAPES_FUNCTIONS[abilityObjectPetPainter.subType];
        for (let i = 0; i < splitUpgrade.count; i++) {
            const shape = shapeFunctions.createSplitShape(abilityObjectPetPainter, splitUpgrade, game);
            shape.isSplit = true;
            game.state.abilityObjects.push(shape);
        }
    }
}

function getOptionsSplit(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_PET_PAINTER_UPGRADE_SPLIT);
    options[0].option.displayLongText = getAbilityUpgradeSplitUiTextLong(ability);
    return options;
}

function executeOptionPaintSplit(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilityPetPainter;
    let up: AbilityPetPainterUpgradeSplit;
    if (as.upgrades[ABILITY_PET_PAINTER_UPGRADE_SPLIT] === undefined) {
        up = { level: 0, count: 1, damageFactor: 0.5 };
        as.upgrades[ABILITY_PET_PAINTER_UPGRADE_SPLIT] = up;
    } else {
        up = as.upgrades[ABILITY_PET_PAINTER_UPGRADE_SPLIT];
    }
    up.count += 1;
    up.level++;
}

function getAbilityUpgradeSplitUiText(ability: Ability): string {
    const up: AbilityPetPainterUpgradeSplit = ability.upgrades[ABILITY_PET_PAINTER_UPGRADE_SPLIT];
    return `${ABILITY_PET_PAINTER_UPGRADE_SPLIT}: Level ${up.level}`;
}

function getAbilityUpgradeSplitUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityUpgrade | undefined = ability.upgrades[ABILITY_PET_PAINTER_UPGRADE_SPLIT];
    if (upgrade) {
        textLines.push(`Inrease number of shapes on split to ${upgrade.level + 2}`);
    } else {
        textLines.push(`When Shapes disapear, they instead split`);
        textLines.push(`into 2 smaller ones`);
    }

    return textLines;
}
