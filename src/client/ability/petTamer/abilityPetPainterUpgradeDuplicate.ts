import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_PET_PAINTER_UPGRADE_FUNCTIONS, AbilityPetPainter } from "./abilityPetPainter.js";

export type AbilityPetPainterUpgradeDuplicate = AbilityUpgrade & {
}

export const ABILITY_PET_PAINTER_UPGRADE_DUPLICATE = "Paint Duplicate";

export function addAbilityPetPainterUpgradeDuplicate() {
    ABILITY_PET_PAINTER_UPGRADE_FUNCTIONS[ABILITY_PET_PAINTER_UPGRADE_DUPLICATE] = {
        getStatsDisplayText: getAbilityUpgradeDuplicateUiText,
        getLongExplainText: getAbilityUpgradeDuplicateUiTextLong,
        getOptions: getOptionsDuplicate,
        executeOption: executeOptionPaintDuplicate,
    }
}

function getOptionsDuplicate(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_PET_PAINTER_UPGRADE_DUPLICATE);
    options[0].option.displayLongText = getAbilityUpgradeDuplicateUiTextLong(ability);
    return options;
}

function executeOptionPaintDuplicate(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilityPetPainter;
    let up: AbilityPetPainterUpgradeDuplicate;
    if (as.upgrades[ABILITY_PET_PAINTER_UPGRADE_DUPLICATE] === undefined) {
        up = { level: 0 };
        as.upgrades[ABILITY_PET_PAINTER_UPGRADE_DUPLICATE] = up;
    } else {
        up = as.upgrades[ABILITY_PET_PAINTER_UPGRADE_DUPLICATE];
    }
    up.level++;
}

function getAbilityUpgradeDuplicateUiText(ability: Ability): string {
    const up: AbilityPetPainterUpgradeDuplicate = ability.upgrades[ABILITY_PET_PAINTER_UPGRADE_DUPLICATE];
    return `${ABILITY_PET_PAINTER_UPGRADE_DUPLICATE}: Level ${up.level}`;
}

function getAbilityUpgradeDuplicateUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityUpgrade | undefined = ability.upgrades[ABILITY_PET_PAINTER_UPGRADE_DUPLICATE];
    if (upgrade) {
        textLines.push(`Inrease number of shapes per paint to ${upgrade.level + 2}`);
    } else {
        textLines.push(`Painter creates multiple shapes with one paint`);
    }

    return textLines;
}
