import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { calcNewPositionMovedInDirection, calculateDirection, getClientInfoByCharacterId } from "../../game.js";
import { ClientInfo, Game, Position } from "../../gameModel.js";
import { Ability, AbilityOwner } from "../ability.js";
import { AbilityUpgrade } from "../abilityUpgrade.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilitySnipe, createAbilityObjectSnipeInitial, getOptionsSnipeUpgrade } from "./abilitySnipe.js";
import { paintSniperRifle } from "./abilitySnipePaint.js";
import { castSnipeAfterImage } from "./abilitySnipeUpgradeAfterImage.js";

export const ABILITY_SNIPE_UPGRADE_MORE_RIFLES = "More Rifles";

export type AbilityUpgradeMoreRifles = AbilityUpgrade & {
    numberRifles: number,
    rotationDirection: number,
    rotationDistance: number,
    lastSniperRiflePaintDirection: number[],
    upgradeSynergy: boolean,
}

export function addAbilitySnipeUpgradeMoreRifles() {
    ABILITY_SNIPE_UPGRADE_FUNCTIONS[ABILITY_SNIPE_UPGRADE_MORE_RIFLES] = {
        getStatsDisplayText: getAbilityUpgradeMoreRiflesUiText,
        getLongExplainText: getAbilityUpgradeMoreRiflesUiTextLong,
        getOptions: getOptionsMoreRifles,
        executeOption: executeOptionMoreRifles,
    }
}

export function castSnipeMoreRifles(position: Position, faction: string, abilitySnipe: AbilitySnipe, castPosition: Position, playerTriggered: boolean, game: Game) {
    const upgradeMoreRifles: AbilityUpgradeMoreRifles = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES];
    if (!upgradeMoreRifles) return;
    if (!playerTriggered && !upgradeMoreRifles.upgradeSynergy) return;
    for (let i = 0; i < upgradeMoreRifles.numberRifles; i++) {
        const newPosition = getMoreRiflesPosition(position, upgradeMoreRifles, i);
        createAbilityObjectSnipeInitial(newPosition, faction, abilitySnipe, castPosition, false, false, game);
        if (playerTriggered) castSnipeAfterImage(newPosition, abilitySnipe, castPosition, false, game);
    }
}

export function paintVisualizationMoreRifles(ctx: CanvasRenderingContext2D, position: Position, abilitySnipe: AbilitySnipe, cameraPosition: Position, castPosition: Position | undefined, game: Game) {
    const upgradeMoreRifles: AbilityUpgradeMoreRifles = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES];
    if (!upgradeMoreRifles) return;
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    let paintX = Math.floor(position.x - cameraPosition.x + centerX);
    let paintY = Math.floor(position.y - cameraPosition.y + centerY);

    for (let i = 0; i < upgradeMoreRifles.numberRifles; i++) {
        let pointDirection = upgradeMoreRifles.lastSniperRiflePaintDirection[i];
        if (castPosition) {
            const newPosition = getMoreRiflesPosition(position, upgradeMoreRifles, i);
            pointDirection = calculateDirection(newPosition, castPosition);
        }
        const paintPosition = getMoreRiflesPosition({ x: paintX, y: paintY }, upgradeMoreRifles, i);
        paintSniperRifle(ctx, abilitySnipe, paintPosition.x, paintPosition.y, pointDirection, 0, false, game);
    }
}

export function tickAbilityUpgradeMoreRifles(abilitySnipe: AbilitySnipe, abilityOwner: AbilityOwner, game: Game) {
    let upgrade: AbilityUpgradeMoreRifles | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES];
    if (!upgrade) return;
    upgrade.rotationDirection += 0.02;

    if (abilitySnipe.shotNextAllowedTime) {
        const clientInfo: ClientInfo | undefined = getClientInfoByCharacterId(abilityOwner.id, game);
        if(clientInfo){
            for (let i = 0; i < upgrade.numberRifles; i++) {
                const position = getMoreRiflesPosition(abilityOwner, upgrade, i);
                upgrade.lastSniperRiflePaintDirection[i] = calculateDirection(position, clientInfo.lastMousePosition);
            }
        }
    }
}

function getOptionsMoreRifles(ability: Ability): UpgradeOptionAndProbability[] {
    let options = getOptionsSnipeUpgrade(ability, ABILITY_SNIPE_UPGRADE_MORE_RIFLES);
    return options;
}

function executeOptionMoreRifles(ability: Ability, option: AbilityUpgradeOption) {
    let as = ability as AbilitySnipe;
    let up: AbilityUpgradeMoreRifles;
    if (option.additionalInfo === "Synergy") {
        up = as.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES];
        up.upgradeSynergy = true;
    } else {
        if (as.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES] === undefined) {
            up = {
                level: 0,
                rotationDirection: 0,
                rotationDistance: 80,
                lastSniperRiflePaintDirection: [0],
                numberRifles: 0,
                upgradeSynergy: false,
            }
            as.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES] = up;
        } else {
            up = as.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES];
        }
        up.level++;
        up.numberRifles += 1;
        up.lastSniperRiflePaintDirection.push(0);
    }
}

function getAbilityUpgradeMoreRiflesUiText(ability: Ability): string {
    const abilitySnipe = ability as AbilitySnipe;
    let upgrade: AbilityUpgradeMoreRifles = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES];
    return `${ABILITY_SNIPE_UPGRADE_MORE_RIFLES} +${upgrade.numberRifles}` + (upgrade.upgradeSynergy ? " (Synergy)" : "");
}

function getAbilityUpgradeMoreRiflesUiTextLong(ability: Ability, option: AbilityUpgradeOption): string[] {
    const abilitySnipe = ability as AbilitySnipe;
    const upgrade: AbilityUpgradeMoreRifles | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES];
    const textLines: string[] = [];
    if (option.additionalInfo && option.additionalInfo === "Synergy") {
        textLines.push(`List of synergies:`);
        textLines.push(`- After Image`);
    } else {
        textLines.push(`Add one rifle rotating around.`);
        textLines.push(`It copies your shooting actions.`);
    }

    return textLines;
}

function getMoreRiflesPosition(mainRiflePosition: Position, upgrade: AbilityUpgradeMoreRifles, rifleNumber: number) {
    const rifleNumberDirection = upgrade.rotationDirection + (Math.PI * 2 / upgrade.numberRifles) * rifleNumber;
    return calcNewPositionMovedInDirection(mainRiflePosition, rifleNumberDirection, upgrade.rotationDistance);
}