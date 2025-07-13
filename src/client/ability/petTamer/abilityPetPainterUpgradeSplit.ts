import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Game } from "../../gameModel.js";
import { Ability, findAbilityById } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_PET_PAINTER_SHAPES_FUNCTIONS, ABILITY_PET_PAINTER_UPGRADE_FUNCTIONS, AbilityObjectPetPainter, AbilityPetPainter, abilityPetPainterGetLimitedShapeCount } from "./abilityPetPainter.js";

export type AbilityPetPainterUpgradeSplit = AbilityUpgrade & {
    damageFactor: number,
}

export const ABILITY_PET_PAINTER_UPGRADE_SPLIT = "Paint Split";

export function addAbilityPetPainterUpgradeSplit() {
    ABILITY_PET_PAINTER_UPGRADE_FUNCTIONS[ABILITY_PET_PAINTER_UPGRADE_SPLIT] = {
        getStatsDisplayText: getAbilityUpgradeSplitUiText,
        getMoreInfoIncreaseOneLevelText: getAbilityUpgradeSplitUiTextLong,
        getOptions: getOptionsSplit,
        executeOption: executeOptionPaintSplit,
        setUpgradeToBossLevel: setUpgradeToBossLevel,
    }
}

function setUpgradeToBossLevel(ability: Ability, level: number) {
    const up: AbilityPetPainterUpgradeSplit = ability.upgrades[ABILITY_PET_PAINTER_UPGRADE_SPLIT];
    if (!up) return;
    const levelToUpgradeLevel = [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1];
    if (level < levelToUpgradeLevel.length) {
        up.level = levelToUpgradeLevel[level];
    } else {
        up.level = Math.max(0, Math.floor(level / 4));
    }
}

export function abilityPetPainerUpgradeSplitCheckForSplit(abilityObjectPetPainter: AbilityObjectPetPainter, game: Game) {
    const abilityPetPainter = findAbilityById(abilityObjectPetPainter.abilityIdRef!, game) as AbilityPetPainter;
    if (!abilityPetPainter || abilityObjectPetPainter.isFactory) return;
    const splitUpgrade = abilityPetPainter.upgrades[ABILITY_PET_PAINTER_UPGRADE_SPLIT] as AbilityPetPainterUpgradeSplit;
    if (splitUpgrade) {
        const shapeFunctions = ABILITY_PET_PAINTER_SHAPES_FUNCTIONS[abilityObjectPetPainter.subType];
        const limitedSplitCount = abilityPetPainterGetLimitedShapeCount(ABILITY_PET_PAINTER_UPGRADE_SPLIT, abilityPetPainter);
        for (let i = 0; i < limitedSplitCount; i++) {
            const shape = shapeFunctions.createSplitShape(abilityObjectPetPainter, splitUpgrade, game);
            shape.isSplit = true;
            game.state.abilityObjects.push(shape);
        }
    }
}

function getOptionsSplit(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_PET_PAINTER_UPGRADE_SPLIT);
    options[0].option.displayMoreInfoText = getAbilityUpgradeSplitUiTextLong(ability);
    return options;
}

function executeOptionPaintSplit(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilityPetPainter;
    let up: AbilityPetPainterUpgradeSplit;
    if (as.upgrades[ABILITY_PET_PAINTER_UPGRADE_SPLIT] === undefined) {
        up = { level: 0, damageFactor: 0.5 };
        as.upgrades[ABILITY_PET_PAINTER_UPGRADE_SPLIT] = up;
    } else {
        up = as.upgrades[ABILITY_PET_PAINTER_UPGRADE_SPLIT];
    }
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
        textLines.push(`Inrease number of splits from ${upgrade.level + 1} to ${upgrade.level + 2}.`);
    } else {
        textLines.push(`When Shapes disapear, they instead split`);
        textLines.push(`into 2 smaller ones.`);
    }

    return textLines;
}
