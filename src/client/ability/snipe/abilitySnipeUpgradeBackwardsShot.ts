import { calcNewPositionMovedInDirection, calculateDirection } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { Ability, AbilityOwner, AbilityUpgradeOption } from "../ability.js";
import { AbilityUpgrade } from "../abilityUpgrade.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilitySnipe, createAbilityObjectSnipeInitial } from "./abilitySnipe.js";

export const ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT = "Backwards Shot";

export type AbilityUpgradeBackwardsShot = AbilityUpgrade & {
    upgradeSynergry: boolean,
}

export function addAbilitySnipeUpgradeBackwardsShot() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT] = {
        getAbilityUpgradeUiText: getAbilityUpgradeBackwardsShotUiText,
        getAbilityUpgradeUiTextLong: getAbilityUpgradeBackwardsShotUiTextLong,
        pushAbilityUpgradeOption: pushAbilityUpgradeBackwardsShot,
    }
}

export function castSnipeBackwardsShot(startPosition: Position, faction: string, abilitySnipe: AbilitySnipe, castPosition: Position, playerTriggered: boolean, game: Game) {
    const upgradeBackwardsShot: AbilityUpgradeBackwardsShot = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT];
    if (!upgradeBackwardsShot) return;
    if (!playerTriggered && !upgradeBackwardsShot.upgradeSynergry) return;

    for (let i = 0; i < upgradeBackwardsShot.level; i++) {
        const newCastPosition = getBackwardsShotPosition(startPosition, castPosition, upgradeBackwardsShot, i);
        createAbilityObjectSnipeInitial(startPosition, faction, abilitySnipe, newCastPosition, false, true, game);
    }
}

function pushAbilityUpgradeBackwardsShot(ability: Ability, upgradeOptions: AbilityUpgradeOption[]) {
    const upgradeBackwardsShot: AbilityUpgradeBackwardsShot| undefined = ability.upgrades[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT];   
    upgradeOptions.push({
        name: ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT, probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySnipe;
            let up: AbilityUpgradeBackwardsShot;
            if (as.upgrades[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT] === undefined) {
                up = {
                    level: 0,
                    upgradeSynergry: false,
                }
                as.upgrades[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT] = up;
            } else {
                up = as.upgrades[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT];
            }
            up.level++;
        }
    });
    if (upgradeBackwardsShot && !upgradeBackwardsShot.upgradeSynergry) {
        const probability = 0.3 * upgradeBackwardsShot.level;
        upgradeOptions.push({
            name: `Synergry ${ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT}`,
            upgradeName: ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT,
            probabilityFactor: probability,
            upgrade: (a: Ability) => {
                let up: AbilityUpgradeBackwardsShot = a.upgrades[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT];
                up.upgradeSynergry = true;
            }
        });
    }    
}

function getAbilityUpgradeBackwardsShotUiText(ability: Ability): string {
    const abilitySnipe = ability as AbilitySnipe;
    let upgrade: AbilityUpgradeBackwardsShot = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT];
    return `${ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT} +${upgrade.level}` + (upgrade.upgradeSynergry ? " (synergry)" : "");
}

function getAbilityUpgradeBackwardsShotUiTextLong(ability: Ability, name: string | undefined): string[] {
    const abilitySnipe = ability as AbilitySnipe;
    const upgrade: AbilityUpgradeBackwardsShot | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT];
    const levelText = (upgrade ? `(${upgrade.level + 1})` : "");
    const textLines: string[] = [];
    if (name && name.startsWith("Synergry")) {
        textLines.push(`Synergry ${ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT}`);
        textLines.push(`Most other upgrades will benefit from backwards shot`);
    } else {
        textLines.push(ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT + levelText);
        textLines.push(`When shooting, you also shot an additional`);
        textLines.push(`shot backwards.`);
    }

    return textLines;
}

function getBackwardsShotPosition(startPosition: Position, castPosition: Position, upgrade: AbilityUpgradeBackwardsShot, backwardsShotNumber: number) {
    const originalDirection = calculateDirection(startPosition, castPosition);
    const shotAngleChange = 0.1;
    const shotsSpreadAngle = shotAngleChange * (upgrade.level - 1);
    const shotBackwardsAngleStart = originalDirection + Math.PI - shotsSpreadAngle / 2;
    const newDirection = shotBackwardsAngleStart + backwardsShotNumber * shotAngleChange;
    return calcNewPositionMovedInDirection(startPosition, newDirection, 40);
}