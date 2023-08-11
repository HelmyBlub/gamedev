import { TamerPetCharacter } from "../../character/playerCharacters/tamer/tamerPetCharacter.js";
import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Game, Position } from "../../gameModel.js";
import { Ability } from "../ability.js";
import { createAbilityObjectFireLine } from "../abilityFireLine.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_PET_DASH_UPGRADE_FUNCTIONS, AbilityPetDash, getPetAbilityDashDamage } from "./abilityPetDash.js";

export type AbilityPetDashUpgradeFireLine = AbilityUpgrade & {
    duration: number,
    damageFactor: number,
    startPosition?: Position,
}

export const ABILITY_PET_DASH_UPGARDE_FIRE_LINE = "Dash Fire Line";

export function addAbilityPetDashUpgradeFireLine() {
    ABILITY_PET_DASH_UPGRADE_FUNCTIONS[ABILITY_PET_DASH_UPGARDE_FIRE_LINE] = {
        getStatsDisplayText: getAbilityUpgradeFireLineUiText,
        getLongExplainText: getAbilityUpgradeFireLineUiTextLong,
        getOptions: getOptionsFireLine,
        executeOption: executeOptionDashFireLine,
    }
}

export function createPetDashUpgradeFireLine(pet: TamerPetCharacter, ability: AbilityPetDash, game: Game){
    const upgrade = ability.upgrades[ABILITY_PET_DASH_UPGARDE_FIRE_LINE] as AbilityPetDashUpgradeFireLine;
    if(!upgrade) return;
    const width = Math.floor(Math.max(pet.width * 0.75, 10));
    const tickInterval = 100;
    const color = "red";
    const tickDamage = getPetAbilityDashDamage(pet, ability) * (tickInterval / 1000) * upgrade.damageFactor;
    game.state.abilityObjects.push(createAbilityObjectFireLine(
        pet.faction,
        upgrade.startPosition!,
        {x: pet.x, y: pet.y},
        tickDamage,
        width,
        upgrade.duration,
        tickInterval,
        color,
        ability.id,
        game
    ));
}

function getOptionsFireLine(ability: Ability): UpgradeOptionAndProbability[] {
    let options = getAbilityUpgradeOptionDefault(ability, ABILITY_PET_DASH_UPGARDE_FIRE_LINE);
    options[0].option.displayLongText = getAbilityUpgradeFireLineUiTextLong(ability);
    return options;
}

function executeOptionDashFireLine(ability: Ability, option: AbilityUpgradeOption) {
    let as = ability as AbilityPetDash;
    let up: AbilityPetDashUpgradeFireLine;
    if (as.upgrades[ABILITY_PET_DASH_UPGARDE_FIRE_LINE] === undefined) {
        up = { 
            level: 0,
            damageFactor: 0,
            duration: 5000,
        };
        as.upgrades[ABILITY_PET_DASH_UPGARDE_FIRE_LINE] = up;
    } else {
        up = as.upgrades[ABILITY_PET_DASH_UPGARDE_FIRE_LINE];
    }
    up.level++;
    up.duration += 1500;
    up.damageFactor += 1;
}

function getAbilityUpgradeFireLineUiText(ability: Ability): string {
    let up: AbilityPetDashUpgradeFireLine = ability.upgrades[ABILITY_PET_DASH_UPGARDE_FIRE_LINE];
    return `${ABILITY_PET_DASH_UPGARDE_FIRE_LINE}, Level ${up.level}`;
}

function getAbilityUpgradeFireLineUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityUpgrade | undefined = ability.upgrades[ABILITY_PET_DASH_UPGARDE_FIRE_LINE];
    textLines.push(`Dash create Fire on the ground`);

    return textLines;
}
