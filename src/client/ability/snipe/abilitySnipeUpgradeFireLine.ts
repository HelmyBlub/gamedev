import { calcNewPositionMovedInDirection, calculateDirection } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { Ability, AbilityOwner, AbilityUpgradeOption } from "../ability.js";
import { createAbilityObjectFireLine } from "../abilityFireLine.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilitySnipe, getAbilitySnipeDamage } from "./abilitySnipe.js";

export const UPGRADE_SNIPE_ABILITY_FIRE_LINE= "Fire Line";

export type AbilityUpgradeFireLine = {
    duration: number,
    damageTotalFactor: number,
    tickInterval: number,
    range: number,
}

export function addAbilitySnipeUpgradeFireLine() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[UPGRADE_SNIPE_ABILITY_FIRE_LINE] = {
        getAbilityUpgradeUiText: getAbilityUpgradeFireLineUiText,
        pushAbilityUpgradeOption: pushAbilityUpgradeFireLine,
    }
}

export function castSnipeFireLine(abilityOwner: AbilityOwner, abilitySnipe: AbilitySnipe, castPosition: Position, game: Game) {
    const upgradeFireLine: AbilityUpgradeFireLine = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_FIRE_LINE];
    if (!upgradeFireLine) return;
    const direction = calculateDirection(abilityOwner, castPosition);
    const endPosition = calcNewPositionMovedInDirection(abilityOwner, direction, upgradeFireLine.range);
    const totalDamage = upgradeFireLine.damageTotalFactor * getAbilitySnipeDamage(abilitySnipe);
    const damagePerTick =  totalDamage / (upgradeFireLine.duration / upgradeFireLine.tickInterval);
    const width = 10;
    const color = "red";
    game.state.abilityObjects.push(createAbilityObjectFireLine(abilityOwner, abilityOwner, endPosition, damagePerTick, width, upgradeFireLine.duration, upgradeFireLine.tickInterval, color, game ));
}

function pushAbilityUpgradeFireLine(ability: Ability, upgradeOptions: AbilityUpgradeOption[]) {
    upgradeOptions.push({
        name: UPGRADE_SNIPE_ABILITY_FIRE_LINE, probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySnipe;
            let up: AbilityUpgradeFireLine;
            if (as.upgrades[UPGRADE_SNIPE_ABILITY_FIRE_LINE] === undefined) {
                up = {
                    duration: 3000,
                    damageTotalFactor: 0,
                    tickInterval: 200,
                    range: 150,
                }
                as.upgrades[UPGRADE_SNIPE_ABILITY_FIRE_LINE] = up;
            } else {
                up = as.upgrades[UPGRADE_SNIPE_ABILITY_FIRE_LINE];
            }
            up.damageTotalFactor += 2;
        }
    });
}

function getAbilityUpgradeFireLineUiText(ability: Ability): string {
    const abilitySnipe = ability as AbilitySnipe;
    let upgrades: AbilityUpgradeFireLine = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_FIRE_LINE];
    return `${UPGRADE_SNIPE_ABILITY_FIRE_LINE}: ${upgrades.damageTotalFactor*100}% total damage over ${(upgrades.duration/1000).toFixed()}s`;
}
