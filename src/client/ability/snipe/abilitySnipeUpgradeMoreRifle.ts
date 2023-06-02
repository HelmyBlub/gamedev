import { calcNewPositionMovedInDirection, calculateDirection, getClientInfoByCharacterId } from "../../game.js";
import { ClientInfo, Game, Position } from "../../gameModel.js";
import { Ability, AbilityOwner, AbilityUpgradeOption } from "../ability.js";
import { AbilityUpgrade } from "../abilityUpgrade.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilitySnipe, createAbilityObjectSnipeInitial } from "./abilitySnipe.js";
import { paintSniperRifle } from "./abilitySnipePaint.js";

export const ABILITY_SNIPE_UPGRADE_MORE_RIFLES = "More Rifles";

export type AbilityUpgradeMoreRifles = AbilityUpgrade & {
    numberRifles: number,
    rotationDirection: number,
    rotationDistance: number,
    lastSniperRiflePaintDirection: number[],
}

export function addAbilitySnipeUpgradeMoreRifles() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[ABILITY_SNIPE_UPGRADE_MORE_RIFLES] = {
        getAbilityUpgradeUiText: getAbilityUpgradeMoreRiflesUiText,
        getAbilityUpgradeUiTextLong: getAbilityUpgradeMoreRiflesUiTextLong,
        pushAbilityUpgradeOption: pushAbilityUpgradeMoreRifles,
    }
}

export function castSnipeMoreRifles(abilityOwner: AbilityOwner, abilitySnipe: AbilitySnipe, castPosition: Position, game: Game) {
    const upgradeMoreRifles: AbilityUpgradeMoreRifles = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES];
    if (!upgradeMoreRifles) return;
    for (let i = 0; i < upgradeMoreRifles.numberRifles; i++) {
        const newPosition = getMoreRiflesPosition(abilityOwner, upgradeMoreRifles, i);
        createAbilityObjectSnipeInitial(newPosition, abilityOwner.faction, abilitySnipe, castPosition, false, false, game);
    }
}

export function paintVisualizationMoreRifles(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, abilitySnipe: AbilitySnipe, paintX: number, paintY: number, game: Game) {
    const upgradeMoreRifles: AbilityUpgradeMoreRifles = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES];
    if (!upgradeMoreRifles) return;

    for (let i = 0; i < upgradeMoreRifles.numberRifles; i++) {
        const pointDirection = upgradeMoreRifles.lastSniperRiflePaintDirection[i];
        const newPosition = getMoreRiflesPosition({ x: paintX, y: paintY }, upgradeMoreRifles, i);
        paintSniperRifle(ctx, abilitySnipe, newPosition.x, newPosition.y, pointDirection, 0, game);
    }
}

export function tickAbilityUpgradeMoreRifles(abilitySnipe: AbilitySnipe, abilityOwner: AbilityOwner, game: Game) {
    let upgrade: AbilityUpgradeMoreRifles | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES];
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
        name: ABILITY_SNIPE_UPGRADE_MORE_RIFLES, probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySnipe;
            let up: AbilityUpgradeMoreRifles;
            if (as.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES] === undefined) {
                up = {
                    level: 0,
                    rotationDirection: 0,
                    rotationDistance: 80,
                    lastSniperRiflePaintDirection: [0],
                    numberRifles: 0,
                }
                as.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES] = up;
            } else {
                up = as.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES];
            }
            up.level++;
            up.numberRifles += 1;
            up.lastSniperRiflePaintDirection.push(0);
        }
    });
}

function getAbilityUpgradeMoreRiflesUiText(ability: Ability): string {
    const abilitySnipe = ability as AbilitySnipe;
    let upgrades: AbilityUpgradeMoreRifles = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES];
    return `${ABILITY_SNIPE_UPGRADE_MORE_RIFLES} +${upgrades.numberRifles}`;
}

function getAbilityUpgradeMoreRiflesUiTextLong(ability: Ability): string[] {
    const abilitySnipe = ability as AbilitySnipe;
    const upgrade: AbilityUpgradeMoreRifles | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES];
    const levelText = (upgrade ? `(${upgrade.level + 1})` : "");
    const textLines: string[] = [];
    textLines.push(ABILITY_SNIPE_UPGRADE_MORE_RIFLES + levelText);
    textLines.push(`Add one rifle rotating around.`);
    textLines.push(`It copies your shooting actions.`);

    return textLines;
}

function getMoreRiflesPosition(mainRiflePosition: Position, upgrade: AbilityUpgradeMoreRifles, rifleNumber: number) {
    const rifleNumberDirection = upgrade.rotationDirection + (Math.PI * 2 / upgrade.numberRifles) * rifleNumber;
    return calcNewPositionMovedInDirection(mainRiflePosition, rifleNumberDirection, upgrade.rotationDistance);
}