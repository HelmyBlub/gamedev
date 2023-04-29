import { characterTakeDamage, fillRandomUpgradeOptions, getCharactersTouchingLine } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { CHARACTER_TYPE_BOSS_ENEMY } from "../character/enemy/bossEnemy.js";
import { calculateDirection, getCameraPosition, getNextId } from "../game.js";
import { Position, Game, IdCounter } from "../gameModel.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, PaintOrderAbility, UpgradeOptionAbility, findAbilityById, levelingAbilityXpGain } from "./ability.js";

type AbilityObjectSnipe = AbilityObject & {
    damage: number,
    range: number,
    direction: number,
    damageDone: boolean,
    deleteTime: number,
}

type AbilitySnipe = Ability & {
    damage: number,
    range: number,
    size: number,
    baseRechargeTime: number,
    rechargeTimeDecreaseFaktor: number,
    maxCharges: number,
    currentCharges: number,
    nextRechargeTime: number,
    paintFadeDuration: number,
}

const ABILITY_NAME_SNIPE = "Snipe";

export function addSnipeAbility() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_SNIPE] = {
        tickAbility: tickAbilitySnipe,
        tickAbilityObject: tickAbilityObjectSnipe,
        createAbiltiyUpgradeOptions: createAbilitySnipeUpgradeOptions,
        paintAbilityObject: paintAbilityObjectSnipe,
        paintAbilityUI: paintAbilitySnipeUI,
        activeAbilityCast: castSnipe,
        createAbility: createAbilitySnipe,
        deleteAbilityObject: deleteAbilityObjectSnipe,
        paintAbilityStatsUI: paintAbilitySnipeStatsUI,
        setAbilityToLevel: setAbilitySnipeToLevel,
        isPassive: false,
        notInheritable: true,
    };
}

export function createAbilitySnipe(
    idCounter: IdCounter,
    playerInputBinding?: string,
    damage: number = 50,
    range: number = 800,
    size: number = 5,
    rechargeTime: number = 500,
    maxCharges: number = 3
): AbilitySnipe {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_SNIPE,
        damage: damage,
        passive: false,
        playerInputBinding: playerInputBinding,
        baseRechargeTime: rechargeTime,
        currentCharges: maxCharges,
        maxCharges: maxCharges,
        nextRechargeTime: -1,
        range: range,
        rechargeTimeDecreaseFaktor: 1,
        size: size,
        paintFadeDuration: 1000,
    };
}

function createAbilityObjectSnipe(abilityOwner: AbilityOwner, abilitySnipe: AbilitySnipe, direction: number, gameTime: number): AbilityObjectSnipe {
    return {
        type: ABILITY_NAME_SNIPE,
        size: abilitySnipe.size,
        color: "",
        x: abilityOwner.x,
        y: abilityOwner.y,
        damage: abilitySnipe.damage,
        faction: abilityOwner.faction,
        direction: direction,
        range: abilitySnipe.range,
        damageDone: false,
        deleteTime: gameTime + abilitySnipe.paintFadeDuration,
        leveling: abilitySnipe.leveling ? true : undefined,
        abilityRefId: abilitySnipe.id,
    }
}

function setAbilitySnipeToLevel(ability: Ability, level: number) {
    let abilitySnipe = ability as AbilitySnipe;
    abilitySnipe.damage = level * 100;
    abilitySnipe.maxCharges = 2 + level;
    abilitySnipe.range = 800 + level * 50;
    abilitySnipe.rechargeTimeDecreaseFaktor = 1 + level * 0.15;
}

function deleteAbilityObjectSnipe(abilityObject: AbilityObject, game: Game) {
    let abilityObjectSnipe = abilityObject as AbilityObjectSnipe;
    return abilityObjectSnipe.deleteTime <= game.state.time;
}

function castSnipe(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, game: Game) {
    let abilitySnipe = ability as AbilitySnipe;

    if (abilitySnipe.currentCharges > 0) {
        let direction = calculateDirection(abilityOwner, castPosition);
        let abilityObjectSnipt = createAbilityObjectSnipe(abilityOwner, abilitySnipe, direction, game.state.time);
        game.state.abilityObjects.push(abilityObjectSnipt);
        if (abilitySnipe.currentCharges === abilitySnipe.maxCharges) {
            abilitySnipe.nextRechargeTime = game.state.time + abilitySnipe.baseRechargeTime / abilitySnipe.rechargeTimeDecreaseFaktor;
        }
        abilitySnipe.currentCharges--;
    }
}

function paintAbilityObjectSnipe(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
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

function calcAbilityObjectSnipeEndPosition(snipe: AbilityObjectSnipe): Position {
    return {
        x: snipe.x + Math.cos(snipe.direction) * snipe.range,
        y: snipe.y + Math.sin(snipe.direction) * snipe.range,
    }
}


function paintAbilitySnipeUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    let snipe = ability as AbilitySnipe;
    let fontSize = size;
    let rectSize = size;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.beginPath();
    ctx.rect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.stroke();
    if (snipe.currentCharges < snipe.maxCharges) {
        ctx.fillStyle = "gray";
        let heightFactor = (snipe.nextRechargeTime - game.state.time) / (snipe.baseRechargeTime / snipe.rechargeTimeDecreaseFaktor);
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

function paintAbilitySnipeStatsUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, game: Game): { width: number, height: number } {
    let abilitySnipe = ability as AbilitySnipe;
    const abilitySnipeDescription = ["Snipe in direction of click. Enemies hit by line take damage"];
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
    ctx.fillText("Damage: " + abilitySnipe.damage, drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
    ctx.fillText("Range: " + abilitySnipe.range, drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
    if(abilitySnipe.leveling){
        ctx.fillText("Level: " + abilitySnipe.leveling.level, drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
        ctx.fillText("Current XP: " + abilitySnipe.leveling.experience.toFixed(0), drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
        ctx.fillText("XP required for Level Up: " + abilitySnipe.leveling.experienceForLevelUp, drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
    }

    return { width, height };
}

function tickAbilitySnipe(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    let abilitySnipe = ability as AbilitySnipe;
    if (abilitySnipe.nextRechargeTime === -1) {
        abilitySnipe.nextRechargeTime = game.state.time + abilitySnipe.baseRechargeTime / abilitySnipe.rechargeTimeDecreaseFaktor;
    }
    if (abilitySnipe.currentCharges < abilitySnipe.maxCharges) {
        if (game.state.time >= abilitySnipe.nextRechargeTime) {
            abilitySnipe.currentCharges++;
            abilitySnipe.nextRechargeTime += abilitySnipe.baseRechargeTime / abilitySnipe.rechargeTimeDecreaseFaktor;
            if (abilitySnipe.nextRechargeTime <= game.state.time) {
                abilitySnipe.nextRechargeTime = game.state.time + abilitySnipe.baseRechargeTime / abilitySnipe.rechargeTimeDecreaseFaktor;
            }
        }
    }
}

function tickAbilityObjectSnipe(abilityObject: AbilityObject, game: Game) {
    let abilitySnipe = abilityObject as AbilityObjectSnipe;
    if (!abilitySnipe.damageDone) {
        const endPos = calcAbilityObjectSnipeEndPosition(abilitySnipe);
        let characters: Character[] = getCharactersTouchingLine(game, abilitySnipe, endPos, abilitySnipe.size);
        for (let char of characters) {
            characterTakeDamage(char, abilitySnipe.damage, game);
            if (char.hp <= 0) {
                //TODO should be dead, not hp < 0
                if (abilityObject.leveling && abilityObject.abilityRefId !== undefined) {
                    let ability = findAbilityById(abilityObject.abilityRefId, game);
                    if (ability) {
                        levelingAbilityXpGain(ability, char.experienceWorth);
                    }
                    if(char.type === CHARACTER_TYPE_BOSS_ENEMY){
//                        fillRandomUpgradeOptions();
                    }
                }
            }
        }

        abilitySnipe.damageDone = true;
    }
}

function createAbilitySnipeUpgradeOptions(ability: Ability): UpgradeOptionAbility[] {
    let abilitySnipe = ability as AbilitySnipe;
    let upgradeOptions: UpgradeOptionAbility[] = [];
    upgradeOptions.push({
        name: "Line Damage+50", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySnipe;
            as.damage += 50;
        }
    });

    return upgradeOptions;
}
