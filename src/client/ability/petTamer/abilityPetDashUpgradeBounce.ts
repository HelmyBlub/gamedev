import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { Ability } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_PET_DASH_UPGRADE_FUNCTIONS, AbilityPetDash } from "./abilityPetDash.js";

export type AbilityPetDashUpgradeTerrainBounce = AbilityUpgrade & {
    damageFactorPerBounce: number,
    currentDamageFactor: number,
    durationUpPerBounce: number,
}

export const ABILITY_PET_DASH_UPGRADE_TERRAIN_BOUNCE = "Dash TerrainBounce";
const DAMAGE_FACTOR_BOUNCE = 1;

export function addAbilityPetDashUpgradeTerrainBounce() {
    ABILITY_PET_DASH_UPGRADE_FUNCTIONS[ABILITY_PET_DASH_UPGRADE_TERRAIN_BOUNCE] = {
        getStatsDisplayText: getAbilityUpgradeTerrainBounceUiText,
        getMoreInfoText: getAbilityUpgradeTerrainBounceUiTextLong,
        getOptions: getOptionsBounce,
        executeOption: executeOptionDashTerrainBounce,
    }
}

function getOptionsBounce(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_PET_DASH_UPGRADE_TERRAIN_BOUNCE);
    options[0].option.displayLongText = getAbilityUpgradeTerrainBounceUiTextLong(ability);
    return options;
}

function executeOptionDashTerrainBounce(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilityPetDash;
    let up: AbilityPetDashUpgradeTerrainBounce;
    if (as.upgrades[ABILITY_PET_DASH_UPGRADE_TERRAIN_BOUNCE] === undefined) {
        up = {
            level: 0,
            damageFactorPerBounce: 0,
            currentDamageFactor: 1,
            durationUpPerBounce: 100,
        };
        as.upgrades[ABILITY_PET_DASH_UPGRADE_TERRAIN_BOUNCE] = up;
    } else {
        up = as.upgrades[ABILITY_PET_DASH_UPGRADE_TERRAIN_BOUNCE];
    }
    up.level++;
    up.damageFactorPerBounce += DAMAGE_FACTOR_BOUNCE;
}

function getAbilityUpgradeTerrainBounceUiText(ability: Ability): string {
    const up: AbilityPetDashUpgradeTerrainBounce = ability.upgrades[ABILITY_PET_DASH_UPGRADE_TERRAIN_BOUNCE];
    return `${ABILITY_PET_DASH_UPGRADE_TERRAIN_BOUNCE}: Bonus damage per Bounce ${up.damageFactorPerBounce * 100}%, Level ${up.level}`;
}

function getAbilityUpgradeTerrainBounceUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityPetDashUpgradeTerrainBounce | undefined = ability.upgrades[ABILITY_PET_DASH_UPGRADE_TERRAIN_BOUNCE];
    textLines.push(`Dash bounces of blocking terrain tiles.`);
    if (upgrade) {
        textLines.push(`Increases damage from ${upgrade.damageFactorPerBounce * 100}% to ${(upgrade.damageFactorPerBounce + DAMAGE_FACTOR_BOUNCE) * 100}% for each bounce.`);
    } else {
        textLines.push(`Damage increases for each bounce by ${DAMAGE_FACTOR_BOUNCE * 100}%.`);
    }

    return textLines;
}
