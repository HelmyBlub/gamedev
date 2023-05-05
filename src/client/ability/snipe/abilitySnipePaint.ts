import { getCameraPosition } from "../../game.js";
import { Game } from "../../gameModel.js";
import { Ability, AbilityObject, PaintOrderAbility } from "../ability.js";
import { AbilityObjectSnipe, AbilitySnipe, calcAbilityObjectSnipeEndPosition, getAbilitySnipeDamage, getAbilitySnipeRange, getShotFrequency } from "./abilitySnipe.js";
import { UPGRADE_SNIPE_ABILITY_NO_MISS_CHAIN, abilityUpgradeNoMissChainUiText } from "./abilitySnipeUpgradeChainHit.js";
import { UPGRADE_SNIPE_ABILITY_SPLIT_SHOT, abilityUpgradeSplitOnHitUiText } from "./abilitySnipeUpgradeSplitShot.js";

export function paintAbilityObjectSnipe(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "afterCharacterPaint") return;
    const cameraPosition = getCameraPosition(game);
    const snipe = abilityObject as AbilityObjectSnipe;
    const endPos = calcAbilityObjectSnipeEndPosition(snipe);
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    ctx.strokeStyle = "red";
    let paintX: number;
    let paintY: number;

    ctx.lineWidth = abilityObject.size;
    ctx.globalAlpha = Math.min((snipe.deleteTime - game.state.time) / 1000, 1);
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
        if(snipe.currentCharges === 0){
            heightFactor = Math.max((snipe.reloadTime - game.state.time) / snipe.baseRechargeTime, 0);
        }else{
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
    const abilitySnipeDescription = [
        "Snipe in direction of click. Enemies hit by line take damage",
        "Gets XP for killing enemies. More XP more Damage"
    ];
    const fontSize = 14;
    const width = 425;
    const height = 200;
    ctx.fillStyle = "white";
    ctx.fillRect(drawStartX, drawStartY, width, height);
    ctx.font = fontSize + "px Arial";
    ctx.fillStyle = "black";
    let textLineCounter = 1;
    ctx.fillText("Ability:" + abilitySnipe.name, drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
    for (let desc of abilitySnipeDescription) {
        ctx.fillText(desc, drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
    }

    textLineCounter++;
    ctx.fillText("Ability stats: ", drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
    ctx.fillText("Damage: " + getAbilitySnipeDamage(abilitySnipe), drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
    ctx.fillText("Range: " + getAbilitySnipeRange(abilitySnipe), drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
    if (abilitySnipe.leveling) {
        ctx.fillText("Level: " + abilitySnipe.leveling.level, drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
        ctx.fillText("Clip Size: " + abilitySnipe.maxCharges, drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
        ctx.fillText("Shoot Cooldown: " + (getShotFrequency(abilitySnipe)/1000).toFixed(2) + "s", drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
        ctx.fillText("Reload Time: " + (abilitySnipe.baseRechargeTime/1000).toFixed(2) + "s", drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
        
        ctx.fillText("Current XP: " + abilitySnipe.leveling.experience.toFixed(0), drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
        ctx.fillText("XP required for Level Up: " + abilitySnipe.leveling.experienceForLevelUp, drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
        if (abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_NO_MISS_CHAIN]) {
            ctx.fillText(abilityUpgradeNoMissChainUiText(abilitySnipe), drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
        }
        if (abilitySnipe.upgrades[UPGRADE_SNIPE_ABILITY_SPLIT_SHOT]) {
            ctx.fillText(abilityUpgradeSplitOnHitUiText(abilitySnipe), drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
        }
    }

    return { width, height };
}
