import { calculateDistance } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { Ability, AbilityUpgradeOption } from "../ability.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilityObjectSnipe, AbilitySnipe, createAbilityObjectSnipeBranch } from "./abilitySnipe.js";

export const UPGRADE_SNIPE_ABILITY_SPLIT_SHOT = "Split Shot";

export type AbilityUpgradeSplitShot = {
    shotSplitsPerHit: number,
}

export function addAbilitySnipeUpgradeSplitShot() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[UPGRADE_SNIPE_ABILITY_SPLIT_SHOT] = {
        getAbilityUpgradeUiText: getAbilityUpgradeSplitShotUiText,
        pushAbilityUpgradeOption: pushAbilityUpgradeSplitShot,
    }
}

export function abilityUpgradeOnSnipeHit(position: Position, abilitySnipe: AbilitySnipe | undefined, abilityObjectSnipe: AbilityObjectSnipe, game: Game) {
    let upgrades: AbilityUpgradeSplitShot | undefined = abilitySnipe?.upgrades[UPGRADE_SNIPE_ABILITY_SPLIT_SHOT];
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
        name: UPGRADE_SNIPE_ABILITY_SPLIT_SHOT, probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySnipe;
            let up: AbilityUpgradeSplitShot;
            if (as.upgrades[UPGRADE_SNIPE_ABILITY_SPLIT_SHOT] === undefined) {
                up = {
                    shotSplitsPerHit: 0,
                }
                as.upgrades[UPGRADE_SNIPE_ABILITY_SPLIT_SHOT] = up;
            } else {
                up = as.upgrades[UPGRADE_SNIPE_ABILITY_SPLIT_SHOT];
            }

            up.shotSplitsPerHit++;
        }
    });
}

function getAbilityUpgradeSplitShotUiText(ability: Ability): string {
    const abilitySnipe = ability as AbilitySnipe;
    let upgrades: AbilityUpgradeSplitShot = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_SPLIT_SHOT];
    return "Split On Hit +" + upgrades.shotSplitsPerHit;
}
