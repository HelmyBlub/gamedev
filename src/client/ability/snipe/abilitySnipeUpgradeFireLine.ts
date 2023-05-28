import { calcNewPositionMovedInDirection, calculateDirection } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { Ability, AbilityOwner, AbilityUpgradeOption } from "../ability.js";
import { createAbilityObjectFireLine } from "../abilityFireLine.js";
import { AbilityUpgrade } from "../abilityUpgrade.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilitySnipe, getAbilitySnipeDamage } from "./abilitySnipe.js";

export const ABILITY_SNIPE_UPGRADE_FIRE_LINE = "Fire Line";
const DURATION = 3000;
const DAMAGEFACTOR = 2;

export type AbilityUpgradeFireLine = AbilityUpgrade & {
    duration: number,
    damageTotalFactor: number,
    tickInterval: number,
    range: number,
}

export function addAbilitySnipeUpgradeFireLine() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[ABILITY_SNIPE_UPGRADE_FIRE_LINE] = {
        getAbilityUpgradeUiText: getAbilityUpgradeFireLineUiText,
        getAbilityUpgradeUiTextLong: getAbilityUpgradeFireLineUiTextLong,
        pushAbilityUpgradeOption: pushAbilityUpgradeFireLine,
    }
}

export function castSnipeFireLine(abilityOwner: AbilityOwner, abilitySnipe: AbilitySnipe, castPosition: Position, game: Game) {
    const upgradeFireLine: AbilityUpgradeFireLine = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_FIRE_LINE];
    if (!upgradeFireLine) return;
    const direction = calculateDirection(abilityOwner, castPosition);
    const endPosition = calcNewPositionMovedInDirection(abilityOwner, direction, upgradeFireLine.range);
    const totalDamage = upgradeFireLine.damageTotalFactor * getAbilitySnipeDamage(abilitySnipe);
    const damagePerTick = totalDamage / (upgradeFireLine.duration / upgradeFireLine.tickInterval);
    const width = 10;
    const color = "red";
    game.state.abilityObjects.push(createAbilityObjectFireLine(abilityOwner, abilityOwner, endPosition, damagePerTick, width, upgradeFireLine.duration, upgradeFireLine.tickInterval, color, abilitySnipe.id, game));
}

function pushAbilityUpgradeFireLine(ability: Ability, upgradeOptions: AbilityUpgradeOption[]) {
    upgradeOptions.push({
        name: ABILITY_SNIPE_UPGRADE_FIRE_LINE, probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySnipe;
            let up: AbilityUpgradeFireLine;
            if (as.upgrades[ABILITY_SNIPE_UPGRADE_FIRE_LINE] === undefined) {
                up = {
                    level: 0,
                    duration: DURATION,
                    damageTotalFactor: 0,
                    tickInterval: 200,
                    range: 150,
                }
                as.upgrades[ABILITY_SNIPE_UPGRADE_FIRE_LINE] = up;
            } else {
                up = as.upgrades[ABILITY_SNIPE_UPGRADE_FIRE_LINE];
            }
            up.level++;
            up.damageTotalFactor += DAMAGEFACTOR;
        }
    });
}

function getAbilityUpgradeFireLineUiText(ability: Ability): string {
    const abilitySnipe = ability as AbilitySnipe;
    let upgrades: AbilityUpgradeFireLine = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_FIRE_LINE];
    return `${ABILITY_SNIPE_UPGRADE_FIRE_LINE}: ${upgrades.damageTotalFactor * 100}% total damage over ${(upgrades.duration / 1000).toFixed()}s`;
}

function getAbilityUpgradeFireLineUiTextLong(ability: Ability): string[] {
    const abilitySnipe = ability as AbilitySnipe;
    const upgrade: AbilityUpgradeFireLine | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_FIRE_LINE];
    const levelText = (upgrade ? `(${upgrade.level + 1})` : "");

    const textLines: string[] = [];
    textLines.push(ABILITY_SNIPE_UPGRADE_FIRE_LINE + levelText);
    textLines.push(`Shooting create a fire line.`);
    textLines.push(`It stays on the ground for ${DURATION / 1000}s.`);
    textLines.push(`It does a total of ${DAMAGEFACTOR * 100}% damage in its duration.`);

    return textLines;
}
