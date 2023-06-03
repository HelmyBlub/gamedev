import { calcNewPositionMovedInDirection, calculateDirection, getClientInfoByCharacterId } from "../../game.js";
import { ClientInfo, Game, Position } from "../../gameModel.js";
import { Ability, AbilityOwner, AbilityUpgradeOption } from "../ability.js";
import { AbilityUpgrade } from "../abilityUpgrade.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilitySnipe, createAbilityObjectSnipeInitial } from "./abilitySnipe.js";
import { paintSniperRifle } from "./abilitySnipePaint.js";
import { ABILITY_SNIPE_UPGRADE_AFTER_IMAGE, AbilityUpgradeAfterImage, castSnipeAfterImage } from "./abilitySnipeUpgradeAfterImage.js";

export const ABILITY_SNIPE_UPGRADE_MORE_RIFLES = "More Rifles";

export type AbilityUpgradeMoreRifles = AbilityUpgrade & {
    numberRifles: number,
    rotationDirection: number,
    rotationDistance: number,
    lastSniperRiflePaintDirection: number[],
    upgradeSynergry: boolean,
}

export function addAbilitySnipeUpgradeMoreRifles() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[ABILITY_SNIPE_UPGRADE_MORE_RIFLES] = {
        getAbilityUpgradeUiText: getAbilityUpgradeMoreRiflesUiText,
        getAbilityUpgradeUiTextLong: getAbilityUpgradeMoreRiflesUiTextLong,
        pushAbilityUpgradeOption: pushAbilityUpgradeMoreRifles,
    }
}

export function castSnipeMoreRifles(position: Position, faction: string, abilitySnipe: AbilitySnipe, castPosition: Position, playerTriggered: boolean, game: Game) {
    const upgradeMoreRifles: AbilityUpgradeMoreRifles = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES];
    if (!upgradeMoreRifles) return;
    if (!playerTriggered && !upgradeMoreRifles.upgradeSynergry) return;
    for (let i = 0; i < upgradeMoreRifles.numberRifles; i++) {
        const newPosition = getMoreRiflesPosition(position, upgradeMoreRifles, i);
        createAbilityObjectSnipeInitial(newPosition, faction, abilitySnipe, castPosition, false, false, game);
        if (playerTriggered) castSnipeAfterImage(newPosition, abilitySnipe, castPosition, false, game);
    }
}

export function paintVisualizationMoreRifles(ctx: CanvasRenderingContext2D, position: Position, abilitySnipe: AbilitySnipe, cameraPosition: Position, game: Game) {
    const upgradeMoreRifles: AbilityUpgradeMoreRifles = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES];
    if (!upgradeMoreRifles) return;
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    let paintX = Math.floor(position.x - cameraPosition.x + centerX);
    let paintY = Math.floor(position.y - cameraPosition.y + centerY);

    for (let i = 0; i < upgradeMoreRifles.numberRifles; i++) {
        const pointDirection = upgradeMoreRifles.lastSniperRiflePaintDirection[i];
        const newPosition = getMoreRiflesPosition({ x: paintX, y: paintY }, upgradeMoreRifles, i);
        paintSniperRifle(ctx, abilitySnipe, newPosition.x, newPosition.y, pointDirection, 0, false, game);
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
    const upgradeMoreRifles: AbilityUpgradeMoreRifles | undefined = ability.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES];
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
                    upgradeSynergry: false,
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
    if (upgradeMoreRifles && !upgradeMoreRifles.upgradeSynergry) {
        const probability = 0.3 * upgradeMoreRifles.level;
        upgradeOptions.push({
            name: `Synergry ${ABILITY_SNIPE_UPGRADE_MORE_RIFLES}`,
            upgradeName: ABILITY_SNIPE_UPGRADE_MORE_RIFLES,
            probabilityFactor: probability,
            upgrade: (a: Ability) => {
                let up: AbilityUpgradeMoreRifles = a.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES];
                up.upgradeSynergry = true;
            }
        });
    }
}

function getAbilityUpgradeMoreRiflesUiText(ability: Ability): string {
    const abilitySnipe = ability as AbilitySnipe;
    let upgrade: AbilityUpgradeMoreRifles = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES];
    return `${ABILITY_SNIPE_UPGRADE_MORE_RIFLES} +${upgrade.numberRifles}` + (upgrade.upgradeSynergry ? " (synergry)" : "");
}

function getAbilityUpgradeMoreRiflesUiTextLong(ability: Ability, name: string | undefined): string[] {
    const abilitySnipe = ability as AbilitySnipe;
    const upgrade: AbilityUpgradeMoreRifles | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES];
    const levelText = (upgrade ? `(${upgrade.level + 1})` : "");
    const textLines: string[] = [];
    if (name && name.startsWith("Synergry")) {
        textLines.push(`Synergry ${ABILITY_SNIPE_UPGRADE_MORE_RIFLES}`);
        textLines.push(`List of synergies:`);
        textLines.push(`- After Image`);
    } else {
        textLines.push(ABILITY_SNIPE_UPGRADE_MORE_RIFLES + levelText);
        textLines.push(`Add one rifle rotating around.`);
        textLines.push(`It copies your shooting actions.`);
    }

    return textLines;
}

function getMoreRiflesPosition(mainRiflePosition: Position, upgrade: AbilityUpgradeMoreRifles, rifleNumber: number) {
    const rifleNumberDirection = upgrade.rotationDirection + (Math.PI * 2 / upgrade.numberRifles) * rifleNumber;
    return calcNewPositionMovedInDirection(mainRiflePosition, rifleNumberDirection, upgrade.rotationDistance);
}