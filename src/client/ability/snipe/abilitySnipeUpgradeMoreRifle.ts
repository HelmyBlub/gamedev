import { calcNewPositionMovedInDirection, calculateDirection, getClientInfoByCharacterId } from "../../game.js";
import { ClientInfo, Game, Position } from "../../gameModel.js";
import { Ability, AbilityOwner, UpgradeOptionAbility } from "../ability.js";
import { AbilitySnipe, createAbilityObjectSnipeInitial } from "./abilitySnipe.js";
import { paintSniperRifle } from "./abilitySnipePaint.js";

export const UPGRADE_SNIPE_ABILITY_MORE_RIFLES = "More Rifles";

export type AbilityUpgradeMoreRifles = {
    numberRifles: number,
    rotationDirection: number,
    rotationDistance: number,
    lastSniperRiflePaintDirection: number[],
}

export function getAbilityUpgradeMoreRifles(): UpgradeOptionAbility {
    return {
        name: UPGRADE_SNIPE_ABILITY_MORE_RIFLES, probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySnipe;
            let up: AbilityUpgradeMoreRifles;
            if (as.upgrades[UPGRADE_SNIPE_ABILITY_MORE_RIFLES] === undefined) {
                up = {
                    rotationDirection: 0,
                    rotationDistance: 80,
                    lastSniperRiflePaintDirection: [0],
                    numberRifles: 0,
                }
                as.upgrades[UPGRADE_SNIPE_ABILITY_MORE_RIFLES] = up;
            } else {
                up = as.upgrades[UPGRADE_SNIPE_ABILITY_MORE_RIFLES];
            }
            up.numberRifles += 1;
            up.lastSniperRiflePaintDirection.push(0);
        }
    }
}

export function castSnipeMoreRifles(abilityOwner: AbilityOwner, abilitySnipe: AbilitySnipe, castPosition: Position, game: Game){
    const upgradeMoreRifles: AbilityUpgradeMoreRifles = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_MORE_RIFLES];
    if (!upgradeMoreRifles) return;
    for(let i = 0; i < upgradeMoreRifles.numberRifles; i++){
        const newPosition = getMoreRiflesPosition(abilityOwner, upgradeMoreRifles, i);
        createAbilityObjectSnipeInitial(newPosition, abilityOwner.faction, abilitySnipe, castPosition, game);    
    }
}

export function paintVisualizationMoreRifles(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, abilitySnipe: AbilitySnipe, paintX: number, paintY: number, game: Game) {
    const upgradeMoreRifles: AbilityUpgradeMoreRifles = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_MORE_RIFLES];
    if (!upgradeMoreRifles) return;

    for(let i = 0; i < upgradeMoreRifles.numberRifles; i++){
        const pointDirection = upgradeMoreRifles.lastSniperRiflePaintDirection[i] + Math.PI;
        const newPosition = getMoreRiflesPosition({x:paintX, y: paintY}, upgradeMoreRifles, i);
        paintSniperRifle(ctx, abilitySnipe, newPosition.x, newPosition.y, pointDirection, 0, game);
    }
}

export function tickAbilityUpgradeMoreRifles(abilitySnipe: AbilitySnipe, abilityOwner: AbilityOwner, game: Game) {
    let upgrade: AbilityUpgradeMoreRifles | undefined = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_MORE_RIFLES];
    if (!upgrade) return;
    upgrade.rotationDirection += 0.02;

    if (abilitySnipe.shotNextAllowedTime) {
        const clientInfo: ClientInfo = getClientInfoByCharacterId(abilityOwner.id, game)!;
        for(let i = 0; i < upgrade.numberRifles; i++){
            const position = getMoreRiflesPosition(abilityOwner, upgrade, i);
            upgrade.lastSniperRiflePaintDirection[i] = calculateDirection(position, clientInfo.lastMousePosition);
        }
    }
}

export function abilityUpgradeMoreRiflesUiText(abilitySnipe: AbilitySnipe): string {
    let upgrades: AbilityUpgradeMoreRifles | undefined = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_MORE_RIFLES];
    if (upgrades) {
        return `${UPGRADE_SNIPE_ABILITY_MORE_RIFLES} x${upgrades.numberRifles}`;
    }

    return "";
}

function getMoreRiflesPosition(mainRiflePosition: Position, upgrade: AbilityUpgradeMoreRifles, rifleNumber: number){
    const rifleNumberDirection = upgrade.rotationDirection + (Math.PI * 2 / upgrade.numberRifles) * rifleNumber;
    return calcNewPositionMovedInDirection(mainRiflePosition, rifleNumberDirection, upgrade.rotationDistance);
}