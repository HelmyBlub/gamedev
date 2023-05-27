import { calculateDistance } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { Ability, AbilityUpgradeOption } from "../ability.js";
import { AbilityUpgrade } from "../abilityUpgrade.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilityObjectSnipe, AbilitySnipe, createAbilityObjectSnipeBranch } from "./abilitySnipe.js";

export const ABILITY_SNIPE_UPGRADE_SPLIT_SHOT = "Split Shot";

export type AbilityUpgradeSplitShot = AbilityUpgrade & {
    shotSplitsPerHit: number,
}

export function addAbilitySnipeUpgradeSplitShot() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[ABILITY_SNIPE_UPGRADE_SPLIT_SHOT] = {
        getAbilityUpgradeUiText: getAbilityUpgradeSplitShotUiText,
        getAbilityUpgradeUiTextLong: getAbilityUpgradeSplitShotUiTextLong,
        pushAbilityUpgradeOption: pushAbilityUpgradeSplitShot,
    }
}

export function abilityUpgradeOnSnipeHit(position: Position, abilitySnipe: AbilitySnipe | undefined, abilityObjectSnipe: AbilityObjectSnipe, game: Game) {
    let upgrades: AbilityUpgradeSplitShot | undefined = abilitySnipe?.upgrades[ABILITY_SNIPE_UPGRADE_SPLIT_SHOT];
    if (!abilityObjectSnipe.preventSplitOnHit && upgrades && abilitySnipe) {
        for (let i = 0; i < upgrades.shotSplitsPerHit!; i++) {
            const remainingRange = abilityObjectSnipe.remainingRange !== undefined ? abilityObjectSnipe.remainingRange : 0;
            const range = abilityObjectSnipe.range + remainingRange - calculateDistance(position, abilityObjectSnipe);
            const randomDirectionChange = nextRandom(game.state.randomSeed) / 2;
            const newDirection = abilityObjectSnipe.direction + randomDirectionChange;
            createAbilityObjectSnipeBranch(abilitySnipe, abilityObjectSnipe, position, newDirection, range, game);
        }
    }
}

function pushAbilityUpgradeSplitShot(ability: Ability, upgradeOptions: AbilityUpgradeOption[]) {
    upgradeOptions.push({
        name: ABILITY_SNIPE_UPGRADE_SPLIT_SHOT, probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySnipe;
            let up: AbilityUpgradeSplitShot;
            if (as.upgrades[ABILITY_SNIPE_UPGRADE_SPLIT_SHOT] === undefined) {
                up = {
                    level: 0,
                    shotSplitsPerHit: 0,
                }
                as.upgrades[ABILITY_SNIPE_UPGRADE_SPLIT_SHOT] = up;
            } else {
                up = as.upgrades[ABILITY_SNIPE_UPGRADE_SPLIT_SHOT];
            }
            up.level++;
            up.shotSplitsPerHit++;
        }
    });
}

function getAbilityUpgradeSplitShotUiText(ability: Ability): string {
    const abilitySnipe = ability as AbilitySnipe;
    const upgrades: AbilityUpgradeSplitShot = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_SPLIT_SHOT];
    return "Split On Hit +" + upgrades.shotSplitsPerHit;
}

function getAbilityUpgradeSplitShotUiTextLong(ability: Ability): string[] {
    const abilitySnipe = ability as AbilitySnipe;
    const upgrade: AbilityUpgrade | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_SPLIT_SHOT];
    const levelText = (upgrade ? `(${upgrade.level + 1})` : "");

    const textLines: string[] = [];
    textLines.push(ABILITY_SNIPE_UPGRADE_SPLIT_SHOT + levelText);
    textLines.push(`For every enemy hit with the main shot,`);
    textLines.push(`it will split in two.`);
    textLines.push(`The split part can not split again.`);

    return textLines;
}