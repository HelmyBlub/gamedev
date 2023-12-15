import { TamerPetCharacter } from "../../character/playerCharacters/tamer/tamerPetCharacter.js";
import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { FACTION_PLAYER, Game, Position } from "../../gameModel.js";
import { Ability } from "../ability.js";
import { createAbilityObjectFireLine } from "../abilityFireLine.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_PET_DASH_UPGRADE_FUNCTIONS, AbilityPetDash, getPetAbilityDashDamage } from "./abilityPetDash.js";

export type AbilityPetDashUpgradeFireLine = AbilityUpgrade & {
    duration: number,
    damageFactor: number,
    startPosition?: Position,
}

const BASEDURATION = 5000;
const DURATIONUP = 1500;
const DAMAGEFACTOR = 2;
export const ABILITY_PET_DASH_UPGRADE_FIRE_LINE = "Dash Fire Line";

export function addAbilityPetDashUpgradeFireLine() {
    ABILITY_PET_DASH_UPGRADE_FUNCTIONS[ABILITY_PET_DASH_UPGRADE_FIRE_LINE] = {
        getStatsDisplayText: getAbilityUpgradeFireLineUiText,
        getLongExplainText: getAbilityUpgradeFireLineUiTextLong,
        getOptions: getOptionsFireLine,
        executeOption: executeOptionDashFireLine,
    }
}

export function createPetDashUpgradeFireLine(pet: TamerPetCharacter, ability: AbilityPetDash, game: Game) {
    const upgrade = ability.upgrades[ABILITY_PET_DASH_UPGRADE_FIRE_LINE] as AbilityPetDashUpgradeFireLine;
    if (!upgrade) return;
    const width = Math.floor(Math.max(pet.width * 0.75, 10));
    const tickInterval = 100;
    const color = pet.faction === FACTION_PLAYER ? "red" : "black";
    const tickDamage = getPetAbilityDashDamage(pet, ability) * (tickInterval / 1000) * upgrade.damageFactor;
    game.state.abilityObjects.push(createAbilityObjectFireLine(
        pet.faction,
        upgrade.startPosition!,
        { x: pet.x, y: pet.y },
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
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_PET_DASH_UPGRADE_FIRE_LINE);
    options[0].option.displayLongText = getAbilityUpgradeFireLineUiTextLong(ability);
    return options;
}

function executeOptionDashFireLine(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilityPetDash;
    let up: AbilityPetDashUpgradeFireLine;
    if (as.upgrades[ABILITY_PET_DASH_UPGRADE_FIRE_LINE] === undefined) {
        up = {
            level: 0,
            damageFactor: 0,
            duration: BASEDURATION,
        };
        as.upgrades[ABILITY_PET_DASH_UPGRADE_FIRE_LINE] = up;
    } else {
        up = as.upgrades[ABILITY_PET_DASH_UPGRADE_FIRE_LINE];
    }
    up.level++;
    up.duration += DURATIONUP;
    up.damageFactor += DAMAGEFACTOR;
}

function getAbilityUpgradeFireLineUiText(ability: Ability): string {
    const up: AbilityPetDashUpgradeFireLine = ability.upgrades[ABILITY_PET_DASH_UPGRADE_FIRE_LINE];
    return `${ABILITY_PET_DASH_UPGRADE_FIRE_LINE}, Level ${up.level}`;
}

function getAbilityUpgradeFireLineUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityPetDashUpgradeFireLine | undefined = ability.upgrades[ABILITY_PET_DASH_UPGRADE_FIRE_LINE];
    textLines.push(`Dash create Fire on the ground.`);
    if (upgrade) {
        textLines.push(`Increase damage from ${upgrade.damageFactor * 100}% to ${(upgrade.damageFactor + DAMAGEFACTOR) * 100}%.`);
        textLines.push(`Increase duration from ${upgrade.duration / 1000}s to ${(upgrade.duration + DURATIONUP) / 1000}s.`);
    } else {
        textLines.push(`Damage per second: ${DAMAGEFACTOR * 100}%.`);
        textLines.push(`Duration: ${(BASEDURATION + DURATIONUP) / 1000}s.`);
    }

    return textLines;
}
