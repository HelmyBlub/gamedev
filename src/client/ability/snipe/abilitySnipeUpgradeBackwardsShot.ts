import { calcNewPositionMovedInDirection, calculateDirection } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { Ability, AbilityOwner, AbilityUpgradeOption } from "../ability.js";
import { AbilityUpgrade } from "../abilityUpgrade.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilitySnipe, createAbilityObjectSnipeInitial } from "./abilitySnipe.js";

export const ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT = "Backwards Shot";

export type AbilityUpgradeBackwardsShot = AbilityUpgrade & {
}

export function addAbilitySnipeUpgradeBackwardsShot() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT] = {
        getAbilityUpgradeUiText: getAbilityUpgradeBackwardsShotUiText,
        getAbilityUpgradeUiTextLong: getAbilityUpgradeBackwardsShotUiTextLong,
        pushAbilityUpgradeOption: pushAbilityUpgradeBackwardsShot,
    }
}

export function castSnipeBackwardsShot(abilityOwner: AbilityOwner, abilitySnipe: AbilitySnipe, castPosition: Position, game: Game) {
    const upgradeBackwardsShot: AbilityUpgradeBackwardsShot = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT];
    if (!upgradeBackwardsShot) return;
    for (let i = 0; i < upgradeBackwardsShot.level; i++) {
        const newCastPosition = getBackwardsShotPosition(abilityOwner, castPosition, upgradeBackwardsShot, i);
        createAbilityObjectSnipeInitial(abilityOwner, abilityOwner.faction, abilitySnipe, newCastPosition, false, game);
    }
}

function pushAbilityUpgradeBackwardsShot(ability: Ability, upgradeOptions: AbilityUpgradeOption[]) {
    upgradeOptions.push({
        name: ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT, probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySnipe;
            let up: AbilityUpgradeBackwardsShot;
            if (as.upgrades[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT] === undefined) {
                up = {
                    level: 0,
                }
                as.upgrades[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT] = up;
            } else {
                up = as.upgrades[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT];
            }
            up.level++;
        }
    });
}

function getAbilityUpgradeBackwardsShotUiText(ability: Ability): string {
    const abilitySnipe = ability as AbilitySnipe;
    let upgrades: AbilityUpgradeBackwardsShot = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT];
    return `${ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT} +${upgrades.level}`;
}

function getAbilityUpgradeBackwardsShotUiTextLong(ability: Ability): string[] {
    const abilitySnipe = ability as AbilitySnipe;
    const upgrade: AbilityUpgradeBackwardsShot | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT];
    const levelText = (upgrade ? `(${upgrade.level + 1})` : "");
    const textLines: string[] = [];
    textLines.push(ABILITY_SNIPE_UPGRADE_BACKWARDWS_SHOT + levelText);
    textLines.push(`When shooting, you also shot an additional`);
    textLines.push(`shot backwards.`);

    return textLines;
}

function getBackwardsShotPosition(ownerPosition: Position, castPosition: Position, upgrade: AbilityUpgradeBackwardsShot, backwardsShotNumber: number) {
    const originalDirection = calculateDirection(ownerPosition, castPosition);
    const shotAngleChange = 0.1;
    const shotsSpreadAngle = shotAngleChange * (upgrade.level - 1);
    const shotBackwardsAngleStart = originalDirection + Math.PI - shotsSpreadAngle / 2;
    const newDirection = shotBackwardsAngleStart + backwardsShotNumber * shotAngleChange;
    return calcNewPositionMovedInDirection(ownerPosition, newDirection, 40);
}