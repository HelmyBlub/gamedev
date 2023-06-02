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
    upgradeSynergry: boolean,
}

export function addAbilitySnipeUpgradeFireLine() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[ABILITY_SNIPE_UPGRADE_FIRE_LINE] = {
        getAbilityUpgradeUiText: getAbilityUpgradeFireLineUiText,
        getAbilityUpgradeUiTextLong: getAbilityUpgradeFireLineUiTextLong,
        pushAbilityUpgradeOption: pushAbilityUpgradeFireLine,
    }
}

export function castSnipeFireLine(startPosition: Position, faction: string, abilitySnipe: AbilitySnipe, castPosition: Position, playerTriggered: boolean, game: Game) {
    const upgradeFireLine: AbilityUpgradeFireLine = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_FIRE_LINE];
    if (!upgradeFireLine || (!playerTriggered && !upgradeFireLine.upgradeSynergry)) return;
    const direction = calculateDirection(startPosition, castPosition);
    const endPosition = calcNewPositionMovedInDirection(startPosition, direction, upgradeFireLine.range);
    const totalDamage = upgradeFireLine.damageTotalFactor * getAbilitySnipeDamage(abilitySnipe);
    const damagePerTick = totalDamage / (upgradeFireLine.duration / upgradeFireLine.tickInterval);
    const width = 10;
    const color = "red";
    game.state.abilityObjects.push(createAbilityObjectFireLine(faction, startPosition, endPosition, damagePerTick, width, upgradeFireLine.duration, upgradeFireLine.tickInterval, color, abilitySnipe.id, game));
}

function pushAbilityUpgradeFireLine(ability: Ability, upgradeOptions: AbilityUpgradeOption[]) {
    const upgradeFireLine: AbilityUpgradeFireLine | undefined = ability.upgrades[ABILITY_SNIPE_UPGRADE_FIRE_LINE];
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
                    upgradeSynergry: false,
                }
                as.upgrades[ABILITY_SNIPE_UPGRADE_FIRE_LINE] = up;
            } else {
                up = as.upgrades[ABILITY_SNIPE_UPGRADE_FIRE_LINE];
            }
            up.level++;
            up.damageTotalFactor += DAMAGEFACTOR;
        }
    });

    if (upgradeFireLine && !upgradeFireLine.upgradeSynergry) {
        const probability = 0.3 * upgradeFireLine.level;
        upgradeOptions.push({
            name: `Synergry ${ABILITY_SNIPE_UPGRADE_FIRE_LINE}`,
            upgradeName: ABILITY_SNIPE_UPGRADE_FIRE_LINE,
            probabilityFactor: probability,
            upgrade: (a: Ability) => {
                let up: AbilityUpgradeFireLine = a.upgrades[ABILITY_SNIPE_UPGRADE_FIRE_LINE];
                up.upgradeSynergry = true;
            }
        });
    }
}

function getAbilityUpgradeFireLineUiText(ability: Ability): string {
    const abilitySnipe = ability as AbilitySnipe;
    const upgrade: AbilityUpgradeFireLine = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_FIRE_LINE];
    return `${ABILITY_SNIPE_UPGRADE_FIRE_LINE}: ${upgrade.damageTotalFactor * 100}% total damage over ${(upgrade.duration / 1000).toFixed()}s` + (upgrade.upgradeSynergry ? " (synergry)" : "");
}

function getAbilityUpgradeFireLineUiTextLong(ability: Ability, name: string | undefined): string[] {
    const abilitySnipe = ability as AbilitySnipe;
    const upgrade: AbilityUpgradeFireLine | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_FIRE_LINE];
    const levelText = (upgrade ? `(${upgrade.level + 1})` : "");

    const textLines: string[] = [];
    if (name && name.startsWith("Synergry")) {
        textLines.push(`Synergry ${ABILITY_SNIPE_UPGRADE_FIRE_LINE}`);
        textLines.push(`Most other Upgrades will benefit from fire line`);
    } else {
        textLines.push(ABILITY_SNIPE_UPGRADE_FIRE_LINE + levelText);
        textLines.push(`The main shot create a fire line.`);
        textLines.push(`It stays on the ground for ${DURATION / 1000}s.`);
        textLines.push(`It does a total of ${DAMAGEFACTOR * 100}% damage in its duration.`);
    }    

    return textLines;
}
