import { calcNewPositionMovedInDirection, getCameraPosition } from "../../game.js";
import { FACTION_ENEMY, FACTION_PLAYER, Game, Position } from "../../gameModel.js";
import { GAME_IMAGES, loadImage } from "../../imageLoad.js";
import { playerInputBindingToDisplayValue } from "../../playerInput.js";
import { Ability, AbilityObject, AbilityOwner, PaintOrderAbility, paintDefaultAbilityStatsUI } from "../ability.js";
import { pushAbilityUpgradesUiTexts } from "../abilityUpgrade.js";
import { ABILITY_NAME_SNIPE, ABILITY_SNIPE_PAINT_FADE_DURATION, ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilityObjectSnipe, AbilitySnipe, getAbilitySnipeDamage, getAbilitySnipeRange, getAbilitySnipeShotFrequency } from "./abilitySnipe.js";
import { paintVisualizationAfterImage } from "./abilitySnipeUpgradeAfterImage.js";
import { paintVisualizationMoreRifles } from "./abilitySnipeUpgradeMoreRifle.js";
import { paintVisualizationStayStill } from "./abilitySnipeUpgradeStayStill.js";

export function paintAbilityObjectSnipe(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "beforeCharacterPaint") return;
    let abilityObjectSnipe = abilityObject as AbilityObjectSnipe;
    const cameraPosition = getCameraPosition(game);
    const snipe = abilityObject as AbilityObjectSnipe;
    const endPos = calcNewPositionMovedInDirection(snipe, snipe.direction, snipe.range);
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    const color = abilityObject.faction === FACTION_PLAYER ? "red" : "black";
    ctx.strokeStyle = color;
    let paintX: number;
    let paintY: number;

    if(abilityObject.faction === FACTION_ENEMY && abilityObjectSnipe.enemyFactionDamageTime! > game.state.time){
        ctx.lineWidth = 1;
        ctx.globalAlpha = 1;
    }else{
        ctx.lineWidth = abilityObjectSnipe.size;
        ctx.globalAlpha = Math.min((snipe.deleteTime - game.state.time) / ABILITY_SNIPE_PAINT_FADE_DURATION, 1);
    }
    ctx.beginPath();
    paintX = Math.floor(snipe.x - cameraPosition.x + centerX);
    paintY = Math.floor(snipe.y - cameraPosition.y + centerY);
    ctx.moveTo(paintX, paintY);
    paintX = Math.floor(endPos.x - cameraPosition.x + centerX);
    paintY = Math.floor(endPos.y - cameraPosition.y + centerY);
    ctx.lineTo(paintX, paintY);
    ctx.stroke();
    ctx.globalAlpha = 1;
}

export function paintAbilitySnipe(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    const abilitySnipe = ability as AbilitySnipe;
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    let paintX = Math.floor(abilityOwner.x - cameraPosition.x + centerX);
    let paintY = Math.floor(abilityOwner.y - cameraPosition.y + centerY);

    const direction = abilitySnipe.lastSniperRiflePaintDirection;
    const distance = 20;
    paintSniperRifle(ctx, abilitySnipe, paintX, paintY, direction, distance, true, game);
    paintVisualizationMoreRifles(ctx, abilityOwner, abilitySnipe, cameraPosition, undefined, game);
    paintVisualizationAfterImage(ctx, abilityOwner, abilitySnipe, cameraPosition, game);
}

export function paintSniperRifle(ctx: CanvasRenderingContext2D, abilitySnipe: AbilitySnipe, paintX: number, paintY: number, pointDirection: number, distance: number, playerMainRifle: boolean, game: Game) {
    let sniperRifleImageRef = GAME_IMAGES[ABILITY_NAME_SNIPE];
    loadImage(sniperRifleImageRef);
    if (sniperRifleImageRef.imageRef?.complete) {
        let sniperRifleImage: HTMLImageElement = sniperRifleImageRef.imageRef;
        ctx.translate(paintX, paintY);
        ctx.rotate(pointDirection + Math.PI);
        ctx.translate(-paintX, -paintY);
        paintX -= Math.floor(sniperRifleImage.width / 2  + distance);
        paintY -= Math.floor(sniperRifleImage.height / 2);
        paintVisualizationStayStill(ctx, abilitySnipe, paintX, paintY, playerMainRifle, game);
        ctx.drawImage(
            sniperRifleImage,
            0,
            0,
            sniperRifleImage.width,
            sniperRifleImage.height,
            paintX,
            paintY,
            sniperRifleImage.width,
            sniperRifleImage.height
        )
        ctx.resetTransform();
    }
}

export function paintAbilitySnipeUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    let snipe = ability as AbilitySnipe;
    let fontSize = size;
    let rectSize = size;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.lineWidth = 1;
    ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.beginPath();
    ctx.rect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.stroke();
    if (snipe.currentCharges < snipe.maxCharges) {
        ctx.fillStyle = "gray";
        let heightFactor: number;
        if (snipe.currentCharges === 0) {
            heightFactor = Math.max((snipe.reloadTime - game.state.time) / snipe.baseRechargeTime, 0);
        } else {
            heightFactor = Math.max((snipe.nextAllowedShotTime - game.state.time) / (snipe.maxShootFrequency / snipe.shotFrequencyTimeDecreaseFaktor), 0);
        }
        ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize * heightFactor);
    }

    ctx.fillStyle = "black";
    ctx.font = fontSize + "px Arial";
    ctx.fillText("" + snipe.currentCharges, drawStartX, drawStartY + rectSize - (rectSize - fontSize * 0.9));

    if (snipe.playerInputBinding) {
        let keyBind = "";
        game.clientKeyBindings[0].keyCodeToActionPressed.forEach((value, key) => {
            if (value.action === snipe.playerInputBinding) {
                keyBind = value.uiDisplayInputValue;
            }
        });
        ctx.fillStyle = "black";
        ctx.font = "10px Arial";
        ctx.fillText(keyBind, drawStartX + 1, drawStartY + 8);
    }
}

export function paintAbilitySnipeStatsUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, game: Game): { width: number, height: number } {
    let abilitySnipe = ability as AbilitySnipe;
    const textLines: string[] = [
        `Ability: ${abilitySnipe.name}`,
        `Key: ${playerInputBindingToDisplayValue(abilitySnipe.playerInputBinding!, game)}`,
        "Snipe in direction of click. Enemies hit by line take damage",
        "Gets XP for killing enemies. More XP more Damage",
        `Ability stats:`,
        `Base Damage: ${Math.round(abilitySnipe.baseDamage)}`,
        `Range: ${getAbilitySnipeRange(abilitySnipe)}`,
    ];

    if (abilitySnipe.leveling) {
        textLines.push(
            `Level: ${abilitySnipe.leveling.level}`,
            `Magazine Size: ${abilitySnipe.maxCharges}`,
            `Shoot Cooldown: ${(getAbilitySnipeShotFrequency(abilitySnipe) / 1000).toFixed(2)}s`,
            `Reload Time: ${(abilitySnipe.baseRechargeTime / 1000).toFixed(2)}s`,
            `Current XP: ${abilitySnipe.leveling.experience.toFixed(0)}`,
            `XP required for Level Up: ${abilitySnipe.leveling.experienceForLevelUp}`,
        );
    }
    pushAbilityUpgradesUiTexts(ABILITY_SNIPE_UPGRADE_FUNCTIONS, textLines, ability);

    return paintDefaultAbilityStatsUI(ctx, textLines, drawStartX, drawStartY);
}
