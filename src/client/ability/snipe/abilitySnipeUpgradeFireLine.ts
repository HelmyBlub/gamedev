import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { calcNewPositionMovedInDirection, calculateDirection } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { Ability } from "../ability.js";
import { createAbilityObjectFireLine } from "../abilityFireLine.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault, getAbilityUpgradeOptionSynergy } from "../abilityUpgrade.js";
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
        getStatsDisplayText: getAbilityUpgradeFireLineUiText,
        getLongExplainText: getAbilityUpgradeFireLineUiTextLong,
        getOptions: getOptionsFireLine,
        executeOption: executeOptionFireLine,
    }
}

export function castSnipeFireLine(startPosition: Position, faction: string, abilitySnipe: AbilitySnipe, castPosition: Position, playerTriggered: boolean, game: Game) {
    const upgradeFireLine: AbilityUpgradeFireLine = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_FIRE_LINE];
    if (!upgradeFireLine || (!playerTriggered && !upgradeFireLine.upgradeSynergry)) return;
    const direction = calculateDirection(startPosition, castPosition);
    const endPosition = calcNewPositionMovedInDirection(startPosition, direction, upgradeFireLine.range);
    const totalDamage = upgradeFireLine.damageTotalFactor * getAbilitySnipeDamage(abilitySnipe, abilitySnipe.baseDamage, false, 0);
    const damagePerTick = totalDamage / (upgradeFireLine.duration / upgradeFireLine.tickInterval);
    const width = 10;
    const color = "red";
    game.state.abilityObjects.push(createAbilityObjectFireLine(faction, startPosition, endPosition, damagePerTick, width, upgradeFireLine.duration, upgradeFireLine.tickInterval, color, abilitySnipe.id, game));
}

function getOptionsFireLine(ability: Ability): UpgradeOptionAndProbability[] {
    let options = getAbilityUpgradeOptionDefault(ability, ABILITY_SNIPE_UPGRADE_FIRE_LINE);
    const upgradeFireLine: AbilityUpgradeFireLine | undefined = ability.upgrades[ABILITY_SNIPE_UPGRADE_FIRE_LINE];

    if (upgradeFireLine && !upgradeFireLine.upgradeSynergry) {
        options.push(getAbilityUpgradeOptionSynergy(ability.name, ABILITY_SNIPE_UPGRADE_FIRE_LINE, upgradeFireLine.level));
    }
    options[0].option.displayLongText = getAbilityUpgradeFireLineUiTextLong(ability, options[0].option as AbilityUpgradeOption);

    return options;
}

function executeOptionFireLine(ability: Ability, option: AbilityUpgradeOption) {
    let as = ability as AbilitySnipe;
    let up: AbilityUpgradeFireLine;
    if (option.additionalInfo === "Synergy") {
        up = as.upgrades[ABILITY_SNIPE_UPGRADE_FIRE_LINE];
        up.upgradeSynergry = true;
    } else {
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
}

function getAbilityUpgradeFireLineUiText(ability: Ability): string {
    const abilitySnipe = ability as AbilitySnipe;
    const upgrade: AbilityUpgradeFireLine = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_FIRE_LINE];
    return `${ABILITY_SNIPE_UPGRADE_FIRE_LINE}: ${upgrade.damageTotalFactor * 100}% total damage over ${(upgrade.duration / 1000).toFixed()}s` + (upgrade.upgradeSynergry ? " (synergry)" : "");
}

function getAbilityUpgradeFireLineUiTextLong(ability: Ability, option: AbilityUpgradeOption): string[] {
    const abilitySnipe = ability as AbilitySnipe;
    const upgrade: AbilityUpgradeFireLine | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_FIRE_LINE];
    const levelText = (upgrade ? `(${upgrade.level + 1})` : "");

    const textLines: string[] = [];
    if (option.additionalInfo && option.additionalInfo === "Synergry") {
        textLines.push(`Synergry ${ABILITY_SNIPE_UPGRADE_FIRE_LINE}`);
        textLines.push(`List of synergies:`);
        textLines.push(`- After Image`);
        textLines.push(`- More Rifles`);
        textLines.push(`- Backwards Shot`);
    } else {
        textLines.push(ABILITY_SNIPE_UPGRADE_FIRE_LINE + levelText);
        textLines.push(`The main shot create a fire line.`);
        textLines.push(`It stays on the ground for ${DURATION / 1000}s.`);
        textLines.push(`It does a total of ${DAMAGEFACTOR * 100}% damage in its duration.`);
    }

    return textLines;
}
