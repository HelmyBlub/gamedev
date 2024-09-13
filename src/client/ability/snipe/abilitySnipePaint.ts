import { calcNewPositionMovedInDirection, getCameraPosition } from "../../game.js";
import { FACTION_ENEMY, FACTION_PLAYER, Game, Position } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { GAME_IMAGES, loadImage } from "../../imageLoad.js";
import { playerInputBindingToDisplayValue } from "../../input/playerInput.js";
import { MoreInfoPart, createMoreInfosPart } from "../../moreInfo.js";
import { Ability, AbilityObject, AbilityOwner, PaintOrderAbility, getAbilityNameUiText, paintAbilityUiDefault, paintAbilityUiKeyBind } from "../ability.js";
import { pushAbilityUpgradesUiTexts } from "../abilityUpgrade.js";
import { ABILITY_NAME_SNIPE, ABILITY_SNIPE_DAMAGE_PER_LEVEL, ABILITY_SNIPE_MAGAZIN_SIZE_PER_LEVEL, ABILITY_SNIPE_PAINT_FADE_DURATION, ABILITY_SNIPE_RANGE_PER_LEVEL, ABILITY_SNIPE_SNIPE_FREQUENCY_PER_LEVEL, ABILITY_SNIPE_UPGRADE_FUNCTIONS, AbilityObjectSnipe, AbilitySnipe, getAbilitySnipeRange, getAbilitySnipeShotFrequency, getSniperRiflePosition, IMAGE_NAME_SNIPE_AIM } from "./abilitySnipe.js";
import { paintVisualizationAfterImage } from "./abilitySnipeUpgradeAfterImage.js";
import { paintVisualizationMoreRifles } from "./abilitySnipeUpgradeMoreRifle.js";
import { paintVisualizationStayStill } from "./abilitySnipeUpgradeStayStill.js";
import { abilitySnipeUpgradeNoMissChainPaintStacks } from "./abilitySnipeUpgradeNoMissChain.js";

export function paintAbilityObjectSnipe(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "beforeCharacterPaint" && abilityObject.faction === FACTION_PLAYER) return;
    if (paintOrder !== "afterCharacterPaint" && abilityObject.faction === FACTION_ENEMY) return;
    const abilityObjectSnipe = abilityObject as AbilityObjectSnipe;
    const cameraPosition = getCameraPosition(game);
    const snipe = abilityObject as AbilityObjectSnipe;
    const endPos = calcNewPositionMovedInDirection(snipe, snipe.direction, snipe.range);
    const color = abilityObject.faction === FACTION_PLAYER ? "red" : "black";
    ctx.strokeStyle = color;

    if (abilityObject.faction === FACTION_ENEMY && abilityObjectSnipe.enemyFactionDamageTime! > game.state.time) {
        ctx.lineWidth = 1;
        ctx.globalAlpha = 1;
    } else {
        ctx.lineWidth = abilityObjectSnipe.size;
        ctx.globalAlpha = Math.min((snipe.deleteTime - game.state.time) / ABILITY_SNIPE_PAINT_FADE_DURATION, 1);
    }
    if (abilityObject.faction === FACTION_PLAYER) ctx.globalAlpha *= game.UI.playerGlobalAlphaMultiplier;
    ctx.beginPath();
    let paintPos = getPointPaintPosition(ctx, snipe, cameraPosition, game.UI.zoom);
    ctx.moveTo(paintPos.x, paintPos.y);
    paintPos = getPointPaintPosition(ctx, endPos, cameraPosition, game.UI.zoom);
    ctx.lineTo(paintPos.x, paintPos.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
}

export function paintAbilitySnipe(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    const abilitySnipe = ability as AbilitySnipe;
    const riflePos = getSniperRiflePosition(abilitySnipe, abilityOwner);
    const paintPos = getPointPaintPosition(ctx, riflePos, cameraPosition, game.UI.zoom);
    const direction = abilitySnipe.lastSniperRiflePaintDirection;
    const distance = 20;
    paintSniperRifle(ctx, abilitySnipe, paintPos.x, paintPos.y, direction, distance, true, game);
    paintVisualizationMoreRifles(ctx, abilityOwner, abilitySnipe, cameraPosition, undefined, game);
    paintVisualizationAfterImage(ctx, abilityOwner, abilitySnipe, cameraPosition, game);
    abilitySnipeUpgradeNoMissChainPaintStacks(ctx, abilitySnipe, abilityOwner, cameraPosition, game);
}

export function paintAbilitySnipeAccessoire(ctx: CanvasRenderingContext2D, ability: Ability, paintPosition: Position, game: Game) {
    const abilitySnipe = ability as AbilitySnipe;
    paintSniperRifle(ctx, abilitySnipe, paintPosition.x, paintPosition.y, Math.PI, 0, true, game);
}

export function paintSniperRifle(ctx: CanvasRenderingContext2D, abilitySnipe: AbilitySnipe, paintX: number, paintY: number, pointDirection: number, distance: number, playerMainRifle: boolean, game: Game) {
    const sniperRifleImageRef = GAME_IMAGES[ABILITY_NAME_SNIPE];
    loadImage(sniperRifleImageRef);
    if (sniperRifleImageRef.imageRef?.complete) {
        const sniperRifleImage: HTMLImageElement = sniperRifleImageRef.imageRef;
        ctx.save();
        ctx.translate(paintX, paintY);
        ctx.rotate(pointDirection + Math.PI);
        ctx.translate(-paintX, -paintY);
        paintX -= Math.floor(sniperRifleImage.width / 2 + distance);
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
        ctx.restore();
    }
}

export function paintAbilitySnipeUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    const snipe = ability as AbilitySnipe;
    let heightFactor: number = 0;
    if (snipe.currentCharges < snipe.maxCharges) {
        ctx.fillStyle = "gray";
        if (snipe.currentCharges === 0) {
            heightFactor = Math.max((snipe.reloadTime - game.state.time) / snipe.baseRechargeTime, 0);
        } else {
            heightFactor = Math.max((snipe.nextAllowedShotTime - game.state.time) / (snipe.maxShootFrequency / snipe.shotFrequencyTimeDecreaseFaktor), 0);
        }
    }
    paintAbilityUiDefault(ctx, ability, drawStartX, drawStartY, size, game, IMAGE_NAME_SNIPE_AIM, heightFactor, snipe.currentCharges);
}

export function createAbilitySnipeMoreInfos(ctx: CanvasRenderingContext2D, ability: Ability, game: Game): MoreInfoPart {
    const abilitySnipe = ability as AbilitySnipe;
    const textLines: string[] = getAbilityNameUiText(ability);
    textLines.push(
        `Key: ${playerInputBindingToDisplayValue(abilitySnipe.playerInputBinding!, game)}`,
        "Snipe in direction of click. Enemies hit by line take damage",
        `Ability stats:`,
        `Base Damage: ${Math.round(abilitySnipe.baseDamage)}`,
        `Range: ${getAbilitySnipeRange(abilitySnipe)}`,
    );

    if (abilitySnipe.level) {
        textLines.push(`Level: ${abilitySnipe.level.level}`);
        if (abilitySnipe.level.leveling) {
            textLines.push(
                `  XP: ${abilitySnipe.level.leveling.experience.toFixed(0)}/${abilitySnipe.level.leveling.experienceForLevelUp}`,
                `  on level up you gain:`,
                `    +${ABILITY_SNIPE_RANGE_PER_LEVEL} range`,
                `    +${ABILITY_SNIPE_DAMAGE_PER_LEVEL} damage`,
                `    +${ABILITY_SNIPE_MAGAZIN_SIZE_PER_LEVEL} magazin size (capped at ${abilitySnipe.maxMagazineSize})`,
                `    +${(ABILITY_SNIPE_SNIPE_FREQUENCY_PER_LEVEL * 100).toFixed()}% snipe frequency (capped at ${(1000 / abilitySnipe.minimumShotFrequency).toFixed()} snipes per second)`,
            );
        }
    }

    textLines.push(
        `Magazine Size: ${abilitySnipe.maxCharges}`,
        `Shoot Cooldown: ${(getAbilitySnipeShotFrequency(abilitySnipe) / 1000).toFixed(2)}s`,
        `Reload Time: ${(abilitySnipe.baseRechargeTime / 1000).toFixed(2)}s`,
    );

    pushAbilityUpgradesUiTexts(ABILITY_SNIPE_UPGRADE_FUNCTIONS, textLines, ability);

    return createMoreInfosPart(ctx, textLines);
}
