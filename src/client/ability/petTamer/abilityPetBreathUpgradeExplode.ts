import { Character } from "../../character/characterModel.js";
import { TamerPetCharacter } from "../../character/playerCharacters/tamer/tamerPetCharacter.js";
import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { applyDebuff } from "../../debuff/debuff.js";
import { createDebuffExplodeOnDeath } from "../../debuff/debuffExplodeOnDeath.js";
import { Game } from "../../gameModel.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_PET_BREATH_UPGRADE_FUNCTIONS, AbilityPetBreath } from "./abilityPetBreath.js";

export type AbilityPetBreathUpgradeExplode = AbilityUpgrade & {
    damageFactor: number,
    radius: number,
}

export const ABILITY_PET_BREATH_UPGARDE_EXPLODE = "Breath Explode";

export function addAbilityPetBreathUpgradeExplode() {
    ABILITY_PET_BREATH_UPGRADE_FUNCTIONS[ABILITY_PET_BREATH_UPGARDE_EXPLODE] = {
        getStatsDisplayText: getAbilityUpgradeExplodeUiText,
        getLongExplainText: getAbilityUpgradeExplodeUiTextLong,   
        getOptions: getOptionsExplode,     
        executeOption: executeOptionPaintExplode,
    }
}

export function abilityPetBreathUpgradeExplodeApplyExplode(ability: AbilityPetBreath, pet: TamerPetCharacter, target: Character, game: Game){
    let explode = ability.upgrades[ABILITY_PET_BREATH_UPGARDE_EXPLODE] as AbilityPetBreathUpgradeExplode;
    if (explode === undefined) return;
    let debuffExplode = createDebuffExplodeOnDeath(ability.damage * explode.damageFactor, pet.faction, explode.radius, ability.id);
    applyDebuff(debuffExplode, target, game);
}

function getOptionsExplode(ability: Ability): UpgradeOptionAndProbability[] {
    let options = getAbilityUpgradeOptionDefault(ability, ABILITY_PET_BREATH_UPGARDE_EXPLODE);
    options[0].option.displayLongText = getAbilityUpgradeExplodeUiTextLong(ability);
    return options;
}

function executeOptionPaintExplode(ability: Ability, option: AbilityUpgradeOption) {
    let as = ability as AbilityPetBreath;
    let up: AbilityPetBreathUpgradeExplode;
    if (as.upgrades[ABILITY_PET_BREATH_UPGARDE_EXPLODE] === undefined) {
        up = { level: 0, damageFactor: 1, radius: 50 };
        as.upgrades[ABILITY_PET_BREATH_UPGARDE_EXPLODE] = up;
    } else {
        up = as.upgrades[ABILITY_PET_BREATH_UPGARDE_EXPLODE];
    }
    up.damageFactor += 1;
    up.level++;
}

function getAbilityUpgradeExplodeUiText(ability: Ability): string {
    let up: AbilityPetBreathUpgradeExplode = ability.upgrades[ABILITY_PET_BREATH_UPGARDE_EXPLODE];
    return `${ABILITY_PET_BREATH_UPGARDE_EXPLODE}: Level ${up.level}`;
}

function getAbilityUpgradeExplodeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityUpgrade | undefined = ability.upgrades[ABILITY_PET_BREATH_UPGARDE_EXPLODE];
    textLines.push(`Breath makes enemies explode on death`);

    return textLines;
}
