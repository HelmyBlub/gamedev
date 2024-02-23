import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { calcNewPositionMovedInDirection, calculateDirection, findClientInfoByCharacterId } from "../../game.js";
import { ClientInfo, Game, Position } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { Ability, AbilityOwner } from "../ability.js";
import { AbilityUpgrade } from "../abilityUpgrade.js";
import { ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilitySnipe, createAbilityObjectSnipeInitial, getOptionsSnipeUpgrade } from "./abilitySnipe.js";
import { paintSniperRifle } from "./abilitySnipePaint.js";
import { ABILITY_SNIPE_UPGRADE_AFTER_IMAGE, castSnipeAfterImage } from "./abilitySnipeUpgradeAfterImage.js";

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
        addSynergyUpgradeOption: addSynergyUpgradeOption,
        getStatsDisplayText: getAbilityUpgradeMoreRiflesUiText,
        getMoreInfoText: getAbilityUpgradeMoreRiflesUiTextLong,
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
    const paintPos = getPointPaintPosition(ctx, position, cameraPosition);

    for (let i = 0; i < upgradeMoreRifles.numberRifles; i++) {
        let pointDirection = upgradeMoreRifles.lastSniperRiflePaintDirection[i];
        if (castPosition) {
            const newPosition = getMoreRiflesPosition(position, upgradeMoreRifles, i);
            pointDirection = calculateDirection(newPosition, castPosition);
        }
        const paintPosition = getMoreRiflesPosition({ x: paintPos.x, y: paintPos.y }, upgradeMoreRifles, i);
        paintSniperRifle(ctx, abilitySnipe, paintPosition.x, paintPosition.y, pointDirection, 0, false, game);
    }
}

export function tickAbilityUpgradeMoreRifles(abilitySnipe: AbilitySnipe, abilityOwner: AbilityOwner, game: Game) {
    const upgrade: AbilityUpgradeMoreRifles | undefined = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES];
    if (!upgrade) return;
    upgrade.rotationDirection += 0.02;

    if (abilitySnipe.shotNextAllowedTime) {
        const clientInfo: ClientInfo | undefined = findClientInfoByCharacterId(abilityOwner.id, game);
        if (clientInfo) {
            for (let i = 0; i < upgrade.numberRifles; i++) {
                const position = getMoreRiflesPosition(abilityOwner, upgrade, i);
                upgrade.lastSniperRiflePaintDirection[i] = calculateDirection(position, clientInfo.lastMousePosition);
            }
        }
    }
}

function getOptionsMoreRifles(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getOptionsSnipeUpgrade(ability, ABILITY_SNIPE_UPGRADE_MORE_RIFLES);
    return options;
}

function executeOptionMoreRifles(ability: Ability, option: AbilityUpgradeOption) {
    const as = ability as AbilitySnipe;
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
    const upgrade: AbilityUpgradeMoreRifles = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES];
    return `${ABILITY_SNIPE_UPGRADE_MORE_RIFLES} +${upgrade.numberRifles}` + (upgrade.upgradeSynergy ? " (Synergy)" : "");
}

function addSynergyUpgradeOption(ability: Ability): boolean {
    if (ability.upgrades[ABILITY_SNIPE_UPGRADE_AFTER_IMAGE]) {
        return true;
    }
    return false;
}

function getAbilityUpgradeMoreRiflesUiTextLong(ability: Ability, option: AbilityUpgradeOption): string[] {
    const textLines: string[] = [];
    if (option.additionalInfo && option.additionalInfo === "Synergy") {
        textLines.push(`List of synergies:`);
        textLines.push(`- ${ABILITY_SNIPE_UPGRADE_AFTER_IMAGE}`);
    } else {
        const upgrade: AbilityUpgradeMoreRifles | undefined = ability.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES];
        textLines.push(`Add one rifle rotating around.`);
        textLines.push(`It copies your shooting actions.`);
        if (upgrade) {
            textLines.push(`Number of rifles from ${upgrade.level} to  ${upgrade.level + 1}`);
        }
    }

    return textLines;
}

function getMoreRiflesPosition(mainRiflePosition: Position, upgrade: AbilityUpgradeMoreRifles, rifleNumber: number) {
    const rifleNumberDirection = upgrade.rotationDirection + (Math.PI * 2 / upgrade.numberRifles) * rifleNumber;
    return calcNewPositionMovedInDirection(mainRiflePosition, rifleNumberDirection, upgrade.rotationDistance);
}