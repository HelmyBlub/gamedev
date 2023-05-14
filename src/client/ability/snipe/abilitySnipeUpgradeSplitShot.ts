import { calculateDistance } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { Ability, UpgradeOptionAbility } from "../ability.js";
import { AbilityObjectSnipe, AbilitySnipe, createAbilityObjectSnipeBranch } from "./abilitySnipe.js";

export const UPGRADE_SNIPE_ABILITY_SPLIT_SHOT = "Snipe Split Shot";

export type AbilityUpgradeSplitShot = {
    shotSplitsPerHit: number,
}

export function getAbilityUpgradeSplitShot(): UpgradeOptionAbility {
    return {
        name: "Shot Split on Hit", probabilityFactor: 1, upgrade: (a: Ability) => {
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
    }
}

export function abilityUpgradeSplitOnHitUiText(abilitySnipe: AbilitySnipe): string {
    let upgrades: AbilityUpgradeSplitShot | undefined = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_SPLIT_SHOT];
    if (upgrades) {
        return "Split On Hit +" + upgrades.shotSplitsPerHit;
    }
    return "";
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