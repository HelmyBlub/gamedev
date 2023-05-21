import { calcNewPositionMovedInDirection, calculateDirection, getClientInfoByCharacterId } from "../../game.js";
import { ClientInfo, Game, Position } from "../../gameModel.js";
import { Ability, AbilityOwner, AbilityUpgradeOption } from "../ability.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilitySnipe, createAbilityObjectSnipeInitial } from "./abilitySnipe.js";
import { paintSniperRifle } from "./abilitySnipePaint.js";

export const UPGRADE_SNIPE_ABILITY_MORE_RIFLES = "More Rifles";

export type AbilityUpgradeMoreRifles = {
    numberRifles: number,
    rotationDirection: number,
    rotationDistance: number,
    lastSniperRiflePaintDirection: number[],
}

export function addAbilitySnipeUpgradeMoreRifles() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[UPGRADE_SNIPE_ABILITY_MORE_RIFLES] = {
        getAbilityUpgradeUiText: getAbilityUpgradeMoreRiflesUiText,
        getAbilityUpgradeUiTextLong: getAbilityUpgradeMoreRiflesUiTextLong,
        pushAbilityUpgradeOption: pushAbilityUpgradeMoreRifles,
    }
}

export function castSnipeMoreRifles(abilityOwner: AbilityOwner, abilitySnipe: AbilitySnipe, castPosition: Position, game: Game) {
    const upgradeMoreRifles: AbilityUpgradeMoreRifles = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_MORE_RIFLES];
    if (!upgradeMoreRifles) return;
    for (let i = 0; i < upgradeMoreRifles.numberRifles; i++) {
        const newPosition = getMoreRiflesPosition(abilityOwner, upgradeMoreRifles, i);
        createAbilityObjectSnipeInitial(newPosition, abilityOwner.faction, abilitySnipe, castPosition, false, game);
    }
}

export function paintVisualizationMoreRifles(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, abilitySnipe: AbilitySnipe, paintX: number, paintY: number, game: Game) {
    const upgradeMoreRifles: AbilityUpgradeMoreRifles = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_MORE_RIFLES];
    if (!upgradeMoreRifles) return;

    for (let i = 0; i < upgradeMoreRifles.numberRifles; i++) {
        const pointDirection = upgradeMoreRifles.lastSniperRiflePaintDirection[i] + Math.PI;
        const newPosition = getMoreRiflesPosition({ x: paintX, y: paintY }, upgradeMoreRifles, i);
        paintSniperRifle(ctx, abilitySnipe, newPosition.x, newPosition.y, pointDirection, 0, game);
    }
}

export function tickAbilityUpgradeMoreRifles(abilitySnipe: AbilitySnipe, abilityOwner: AbilityOwner, game: Game) {
    let upgrade: AbilityUpgradeMoreRifles | undefined = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_MORE_RIFLES];
    if (!upgrade) return;
    upgrade.rotationDirection += 0.02;

    if (abilitySnipe.shotNextAllowedTime) {
        const clientInfo: ClientInfo = getClientInfoByCharacterId(abilityOwner.id, game)!;
        for (let i = 0; i < upgrade.numberRifles; i++) {
            const position = getMoreRiflesPosition(abilityOwner, upgrade, i);
            upgrade.lastSniperRiflePaintDirection[i] = calculateDirection(position, clientInfo.lastMousePosition);
        }
    }
}

function pushAbilityUpgradeMoreRifles(ability: Ability, upgradeOptions: AbilityUpgradeOption[]) {
    upgradeOptions.push({
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
    });
}

function getAbilityUpgradeMoreRiflesUiText(ability: Ability): string {
    const abilitySnipe = ability as AbilitySnipe;
    let upgrades: AbilityUpgradeMoreRifles = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_MORE_RIFLES];
    return `${UPGRADE_SNIPE_ABILITY_MORE_RIFLES} +${upgrades.numberRifles}`;
}

function getAbilityUpgradeMoreRiflesUiTextLong(ability: Ability): string[] {
    let abilitySnipe = ability as AbilitySnipe;
    let upgrades: AbilityUpgradeMoreRifles | undefined = abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_MORE_RIFLES];
    const textLines: string[] = [];
    textLines.push(UPGRADE_SNIPE_ABILITY_MORE_RIFLES);
    textLines.push(`Add one rifle rotating around.`);
    textLines.push(`It copies your shooting actions.`);

    return textLines;
}

function getMoreRiflesPosition(mainRiflePosition: Position, upgrade: AbilityUpgradeMoreRifles, rifleNumber: number) {
    const rifleNumberDirection = upgrade.rotationDirection + (Math.PI * 2 / upgrade.numberRifles) * rifleNumber;
    return calcNewPositionMovedInDirection(mainRiflePosition, rifleNumberDirection, upgrade.rotationDistance);
}