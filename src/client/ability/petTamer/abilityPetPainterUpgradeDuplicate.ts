import { AbilityUpgradeOption } from "../../character/upgrade.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade } from "../abilityUpgrade.js";
import { ABILITY_PET_PAINTER_UPGRADE_FUNCTIONS, AbilityPetPainter } from "./abilityPetPainter.js";

export type AbilityPetPainterUpgradeDuplicate = AbilityUpgrade & {
}

export const ABILITY_PET_PAINTER_UPGARDE_DUPLICATE = "Paint Duplicate";

export function addAbilityPetPainterUpgradeDuplicate() {
    ABILITY_PET_PAINTER_UPGRADE_FUNCTIONS[ABILITY_PET_PAINTER_UPGARDE_DUPLICATE] = {
        getStatsDisplayText: getAbilityUpgradeDuplicateUiText,
        getLongExplainText: getAbilityUpgradeDuplicateUiTextLong,
        executeOption: executeOptionPaintDuplicate,
    }
}

function executeOptionPaintDuplicate(ability: Ability, option: AbilityUpgradeOption) {
    let as = ability as AbilityPetPainter;
    let up: AbilityPetPainterUpgradeDuplicate;
    if (as.upgrades[ABILITY_PET_PAINTER_UPGARDE_DUPLICATE] === undefined) {
        up = { level: 0 };
        as.upgrades[ABILITY_PET_PAINTER_UPGARDE_DUPLICATE] = up;
    } else {
        up = as.upgrades[ABILITY_PET_PAINTER_UPGARDE_DUPLICATE];
    }
    up.level++;
}

function getAbilityUpgradeDuplicateUiText(ability: Ability): string {
    let up: AbilityPetPainterUpgradeDuplicate = ability.upgrades[ABILITY_PET_PAINTER_UPGARDE_DUPLICATE];
    return `${ABILITY_PET_PAINTER_UPGARDE_DUPLICATE}: Level ${up.level}`;
}

function getAbilityUpgradeDuplicateUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityUpgrade | undefined = ability.upgrades[ABILITY_PET_PAINTER_UPGARDE_DUPLICATE];
    const levelText = (upgrade ? `(${upgrade.level + 1})` : "");
    textLines.push(ABILITY_PET_PAINTER_UPGARDE_DUPLICATE + levelText);
    textLines.push(`Painter creates multiple shapes with one paint`);

    return textLines;
}
