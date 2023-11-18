import { Character } from "../../character/characterModel.js";
import { TamerPetCharacter } from "../../character/playerCharacters/tamer/tamerPetCharacter.js";
import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { applyDebuff } from "../../debuff/debuff.js";
import { createDebuffExplodeOnDeath } from "../../debuff/debuffExplodeOnDeath.js";
import { Game } from "../../gameModel.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_PET_BREATH_UPGRADE_FUNCTIONS, AbilityPetBreath, getPetAbilityBreathDamage } from "./abilityPetBreath.js";

const DAMAGEFACTOR = 10;
const RADIUS = 50;

export type AbilityPetBreathUpgradeExplode = AbilityUpgrade & {
    damageFactor: number,
    radius: number,
}

export const ABILITY_PET_BREATH_UPGRADE_EXPLODE = "Breath Explode";

export function addAbilityPetBreathUpgradeExplode() {
    ABILITY_PET_BREATH_UPGRADE_FUNCTIONS[ABILITY_PET_BREATH_UPGRADE_EXPLODE] = {
        getStatsDisplayText: getAbilityUpgradeExplodeUiText,
        getLongExplainText: getAbilityUpgradeExplodeUiTextLong,
        getOptions: getOptionsExplode,
        executeOption: executeOptionPaintExplode,
    }
}

export function abilityPetBreathUpgradeExplodeApplyExplode(ability: AbilityPetBreath, pet: TamerPetCharacter, target: Character, game: Game) {
    const explode = ability.upgrades[ABILITY_PET_BREATH_UPGRADE_EXPLODE] as AbilityPetBreathUpgradeExplode;
    if (explode === undefined) return;
    const damage = getPetAbilityBreathDamage(pet, ability) * explode.damageFactor;
    const debuffExplode = createDebuffExplodeOnDeath(damage, pet.faction, explode.radius, ability.id);
    applyDebuff(debuffExplode, target, game);
}

function getOptionsExplode(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_PET_BREATH_UPGRADE_EXPLODE);
    options[0].option.displayLongText = getAbilityUpgradeExplodeUiTextLong(ability);
    return options;
}

function executeOptionPaintExplode(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilityPetBreath;
    let up: AbilityPetBreathUpgradeExplode;
    if (as.upgrades[ABILITY_PET_BREATH_UPGRADE_EXPLODE] === undefined) {
        up = { level: 0, damageFactor: 0, radius: RADIUS };
        as.upgrades[ABILITY_PET_BREATH_UPGRADE_EXPLODE] = up;
    } else {
        up = as.upgrades[ABILITY_PET_BREATH_UPGRADE_EXPLODE];
    }
    up.damageFactor += DAMAGEFACTOR;
    up.level++;
}

function getAbilityUpgradeExplodeUiText(ability: Ability): string {
    const up: AbilityPetBreathUpgradeExplode = ability.upgrades[ABILITY_PET_BREATH_UPGRADE_EXPLODE];
    return `${ABILITY_PET_BREATH_UPGRADE_EXPLODE}: Level ${up.level}`;
}

function getAbilityUpgradeExplodeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityPetBreathUpgradeExplode | undefined = ability.upgrades[ABILITY_PET_BREATH_UPGRADE_EXPLODE];
    textLines.push(`Breath makes enemies explode on death.`);
    if (upgrade) {
        textLines.push(`Increased damage to ${(upgrade.damageFactor + DAMAGEFACTOR) * 100}% of Breath damage.`);
    } else {
        textLines.push(`Damage: ${DAMAGEFACTOR * 100}% of Breath damage.`);
        textLines.push(`Radius: ${RADIUS}`);
    }

    return textLines;
}
