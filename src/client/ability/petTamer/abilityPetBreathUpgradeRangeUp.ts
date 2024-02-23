import { TamerPetCharacter } from "../../character/playerCharacters/tamer/tamerPetCharacter.js";
import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_PET_BREATH_UPGRADE_FUNCTIONS, AbilityPetBreath } from "./abilityPetBreath.js";

export type AbilityPetBreathUpgradeRangeUp = AbilityUpgrade & {
    foodIntakeUp: number,
    rangeUp: number,
}

export const ABILITY_PET_BREATH_UPGRADE_RANGE_UP = "Breath Range+";

export function addAbilityPetBreathUpgradeRangeUp() {
    ABILITY_PET_BREATH_UPGRADE_FUNCTIONS[ABILITY_PET_BREATH_UPGRADE_RANGE_UP] = {
        getStatsDisplayText: getAbilityUpgradeRangeUpUiText,
        getMoreInfoText: getAbilityUpgradeRangeUpUiTextLong,
        getOptions: getOptionsRangeUp,
        executeOption: executeOptionPaintRangeUp,
    }
}

export function abilityPetBreathUpgradeRangeUpGetAdditionRange(pet: TamerPetCharacter, upgrade: AbilityPetBreathUpgradeRangeUp): number {
    return upgrade.rangeUp;
}

export function abilityPetBreathUpgradeRangeUpGetAdditionFoodIntake(pet: TamerPetCharacter, upgrade: AbilityPetBreathUpgradeRangeUp): number {
    return upgrade.foodIntakeUp;
}

function getOptionsRangeUp(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_PET_BREATH_UPGRADE_RANGE_UP);
    options[0].option.displayLongText = getAbilityUpgradeRangeUpUiTextLong(ability);
    return options;
}

function executeOptionPaintRangeUp(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilityPetBreath;
    let up: AbilityPetBreathUpgradeRangeUp;
    if (as.upgrades[ABILITY_PET_BREATH_UPGRADE_RANGE_UP] === undefined) {
        up = { level: 0, foodIntakeUp: 0, rangeUp: 0 };
        as.upgrades[ABILITY_PET_BREATH_UPGRADE_RANGE_UP] = up;
    } else {
        up = as.upgrades[ABILITY_PET_BREATH_UPGRADE_RANGE_UP];
    }
    up.foodIntakeUp += 1;
    up.rangeUp += 10;
    up.level++;
}

function getAbilityUpgradeRangeUpUiText(ability: Ability): string {
    const up: AbilityPetBreathUpgradeRangeUp = ability.upgrades[ABILITY_PET_BREATH_UPGRADE_RANGE_UP];
    return `${ABILITY_PET_BREATH_UPGRADE_RANGE_UP}: Level ${up.level}`;
}

function getAbilityUpgradeRangeUpUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityUpgrade | undefined = ability.upgrades[ABILITY_PET_BREATH_UPGRADE_RANGE_UP];
    textLines.push(`Increased Range but requires more food.`);

    return textLines;
}
