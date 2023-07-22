import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { calcNewPositionMovedInDirection, calculateDirection, getClientInfoByCharacterId } from "../../game.js";
import { ClientInfo, Game, Position } from "../../gameModel.js";
import { Ability, AbilityOwner } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault, getAbilityUpgradeOptionSynergy } from "../abilityUpgrade.js";
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
        getUiText: getAbilityUpgradeMoreRiflesUiText,
        getUiTextLong: getAbilityUpgradeMoreRiflesUiTextLong,
        getOptions: getOptionsMoreRifles,
        executeOption: executeOptionMoreRifles,
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

export function paintVisualizationMoreRifles(ctx: CanvasRenderingContext2D, position: Position, abilitySnipe: AbilitySnipe, cameraPosition: Position, castPosition: Position | undefined, game: Game) {
    const upgradeMoreRifles: AbilityUpgradeMoreRifles = abilitySnipe.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES];
    if (!upgradeMoreRifles) return;
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    let paintX = Math.floor(position.x - cameraPosition.x + centerX);
    let paintY = Math.floor(position.y - cameraPosition.y + centerY);

    for (let i = 0; i < upgradeMoreRifles.numberRifles; i++) {
        let pointDirection = upgradeMoreRifles.lastSniperRiflePaintDirection[i];
        if(castPosition){
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
        const clientInfo: ClientInfo = getClientInfoByCharacterId(abilityOwner.id, game)!;
        for (let i = 0; i < upgrade.numberRifles; i++) {
            const position = getMoreRiflesPosition(abilityOwner, upgrade, i);
            upgrade.lastSniperRiflePaintDirection[i] = calculateDirection(position, clientInfo.lastMousePosition);
        }
    }
}

function getOptionsMoreRifles(ability: Ability): UpgradeOptionAndProbability[] {
    let options = getAbilityUpgradeOptionDefault(ability.name, ABILITY_SNIPE_UPGRADE_MORE_RIFLES);
    const upgradeMoreRifles: AbilityUpgradeMoreRifles | undefined = ability.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES];

    if (upgradeMoreRifles && !upgradeMoreRifles.upgradeSynergry) {
        options.push(getAbilityUpgradeOptionSynergy(ability.name, ABILITY_SNIPE_UPGRADE_MORE_RIFLES, upgradeMoreRifles.level));
    }

    return options;
}

function executeOptionMoreRifles(ability: Ability, option: AbilityUpgradeOption) {
    let as = ability as AbilitySnipe;
    let up: AbilityUpgradeMoreRifles;
    if (option.additionalInfo === "Synergy") {
        up = as.upgrades[ABILITY_SNIPE_UPGRADE_MORE_RIFLES];
        up.upgradeSynergry = true;
    } else {
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