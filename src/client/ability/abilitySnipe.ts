import { characterTakeDamage, getCharactersTouchingLine } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { calculateDirection, getCameraPosition, getNextId } from "../game.js";
import { Position, Game, IdCounter } from "../gameModel.js";
import { nextRandom } from "../randomNumberGenerator.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, PaintOrderAbility, UpgradeOptionAbility, findAbilityById, levelingAbilityXpGain } from "./ability.js";

type AbilityObjectSnipe = AbilityObject & {
    damage: number,
    range: number,
    direction: number,
    damageDone: boolean,
    deleteTime: number,
    splitOnHit?: boolean,
}

type AbilitySnipe = Ability & {
    baseDamage: number,
    baseRange: number,
    size: number,
    baseRechargeTime: number,
    rechargeTimeDecreaseFaktor: number,
    maxCharges: number,
    currentCharges: number,
    nextRechargeTime: number,
    paintFadeDuration: number,
    upgrades: {
        damageMultiplier: number,
        rangeMultiplier: number,
        noMissChainCounter?: number,
        noMissCounterCap?: number,
        noMissBonusDamageFactorAdd?: number,
        shotSplitOnHit?: boolean,
        shotSplitsPerHit?: number,
    }
}

const ABILITY_NAME_SNIPE = "Snipe";

export function addSnipeAbility() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_SNIPE] = {
        tickAbility: tickAbilitySnipe,
        tickAbilityObject: tickAbilityObjectSnipe,
        createAbiltiyUpgradeOptions: createAbilitySnipeUpgradeOptions,
        createAbiltiyBossUpgradeOptions: createAbilityBossSnipeUpgradeOptions,
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
        baseDamage: damage,
        passive: false,
        playerInputBinding: playerInputBinding,
        baseRechargeTime: rechargeTime,
        currentCharges: maxCharges,
        maxCharges: maxCharges,
        nextRechargeTime: -1,
        baseRange: range,
        rechargeTimeDecreaseFaktor: 1,
        size: size,
        paintFadeDuration: 1000,
        upgrades: {
            damageMultiplier: 1,
            rangeMultiplier: 1,
        }
    };
}

function createAbilityObjectSnipe(startPos: Position, abilityRefId: number | undefined, abilitySnipe: AbilitySnipe, faction: string, direction: number, splitOnHit: boolean | undefined, gameTime: number): AbilityObjectSnipe {
    return {
        type: ABILITY_NAME_SNIPE,
        size: abilitySnipe.size,
        color: "",
        x: startPos.x,
        y: startPos.y,
        damage: getDamage(abilitySnipe),
        faction: faction,
        direction: direction,
        range: getRange(abilitySnipe),
        damageDone: false,
        deleteTime: gameTime + abilitySnipe.paintFadeDuration,
        leveling: abilitySnipe.leveling ? true : undefined,
        abilityRefId: abilityRefId,
        splitOnHit: splitOnHit,
    }
}

function setAbilitySnipeToLevel(ability: Ability, level: number) {
    let abilitySnipe = ability as AbilitySnipe;
    abilitySnipe.baseDamage = level * 100;
    abilitySnipe.maxCharges = 2 + level;
    abilitySnipe.baseRange = 800 + level * 50;
    abilitySnipe.rechargeTimeDecreaseFaktor = 1 + level * 0.15;
}

function getDamage(abilitySnipe: AbilitySnipe) {
    let damage = abilitySnipe.baseDamage * abilitySnipe.upgrades.damageMultiplier;
    if(abilitySnipe.upgrades.noMissChainCounter){
       damage *= 1 + (abilitySnipe.upgrades.noMissChainCounter * abilitySnipe.upgrades.noMissBonusDamageFactorAdd!);
    }
    return damage;
}

function getRange(abilitySnipe: AbilitySnipe) {
    return abilitySnipe.baseRange * abilitySnipe.upgrades.rangeMultiplier;
}

function deleteAbilityObjectSnipe(abilityObject: AbilityObject, game: Game) {
    let abilityObjectSnipe = abilityObject as AbilityObjectSnipe;
    return abilityObjectSnipe.deleteTime <= game.state.time;
}

function castSnipe(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, game: Game) {
    let abilitySnipe = ability as AbilitySnipe;

    if (abilitySnipe.currentCharges > 0) {
        let direction = calculateDirection(abilityOwner, castPosition);
        let abilityObjectSnipt = createAbilityObjectSnipe(abilityOwner, abilitySnipe.id, abilitySnipe, abilityOwner.faction, direction, abilitySnipe.upgrades.shotSplitOnHit, game.state.time);
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
    ctx.fillText("Damage: " + getDamage(abilitySnipe), drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
    ctx.fillText("Range: " + getRange(abilitySnipe), drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
    if (abilitySnipe.leveling) {
        ctx.fillText("Level: " + abilitySnipe.leveling.level, drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
        ctx.fillText("Current XP: " + abilitySnipe.leveling.experience.toFixed(0), drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
        ctx.fillText("XP required for Level Up: " + abilitySnipe.leveling.experienceForLevelUp, drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
        if(abilitySnipe.upgrades.noMissChainCounter !== undefined){
            ctx.fillText("Chain Bonus: " + (abilitySnipe.upgrades.noMissChainCounter * abilitySnipe.upgrades.noMissBonusDamageFactorAdd! * 100).toFixed() + "%", drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
        }
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
    let abilityObjectSnipe = abilityObject as AbilityObjectSnipe;
    if (!abilityObjectSnipe.damageDone) {
        const endPos = calcAbilityObjectSnipeEndPosition(abilityObjectSnipe);
        let characters: Character[] = getCharactersTouchingLine(game, abilityObjectSnipe, endPos, abilityObjectSnipe.size);
        let abilitySnipe = abilityObject.abilityRefId !== undefined ? findAbilityById(abilityObject.abilityRefId, game) as AbilitySnipe : undefined;
        let hitSomething: boolean = false;
        for (let char of characters) {
            if (char.isDead) continue;
            hitSomething = true;
            characterTakeDamage(char, abilityObjectSnipe.damage, game);
            if(abilityObjectSnipe.splitOnHit){
                for(let i = 0; i < abilitySnipe!.upgrades.shotSplitsPerHit!; i++){
                    const randomDirectionChange = nextRandom(game.state.randomSeed) / 2;
                    let abilityObjectSnipt = createAbilityObjectSnipe(char, undefined, abilitySnipe!, abilityObjectSnipe.faction, abilityObjectSnipe.direction + randomDirectionChange, false, game.state.time);
                    game.state.abilityObjects.push(abilityObjectSnipt);
                }
            }

            if (char.isDead) {
                if (abilityObject.leveling && abilityObject.abilityRefId !== undefined) {
                    if (abilitySnipe) {
                        levelingAbilityXpGain(abilitySnipe, char.experienceWorth);
                    }
                }
            }
        }
        if (abilitySnipe && abilitySnipe.upgrades.noMissChainCounter !== undefined){
            if(hitSomething){
                if(abilitySnipe.upgrades.noMissChainCounter < abilitySnipe.upgrades.noMissCounterCap!){
                    abilitySnipe.upgrades.noMissChainCounter++;
                } 
            }else{
                abilitySnipe.upgrades.noMissChainCounter = 0;
            }
        }
        abilityObjectSnipe.damageDone = true;
    }
}

function createAbilitySnipeUpgradeOptions(ability: Ability): UpgradeOptionAbility[] {
    let abilitySnipe = ability as AbilitySnipe;
    let upgradeOptions: UpgradeOptionAbility[] = [];
    upgradeOptions.push({
        name: "Snipe Damage+50", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySnipe;
            as.baseDamage += 50;
        }
    });

    return upgradeOptions;
}

function createAbilityBossSnipeUpgradeOptions(ability: Ability): UpgradeOptionAbility[] {
    let abilitySnipe = ability as AbilitySnipe;
    let upgradeOptions: UpgradeOptionAbility[] = [];
    upgradeOptions.push({
        name: "+200% Damage, Range halved", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySnipe;
            as.upgrades.damageMultiplier += 2;
            as.upgrades.rangeMultiplier /= 2;
        }
    });

    upgradeOptions.push({
        name: "No Miss Chain-> damage 1%-50% bonus damage", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySnipe;
            if (as.upgrades.noMissChainCounter === undefined) {
                as.upgrades.noMissChainCounter = 0;
                as.upgrades.noMissBonusDamageFactorAdd = 0;
                as.upgrades.noMissCounterCap = 50;
            }
            if (as.upgrades.noMissBonusDamageFactorAdd !== undefined) {
                as.upgrades.noMissBonusDamageFactorAdd += 0.01;
            }
        }
    });

    upgradeOptions.push({
        name: "Shot Split on Hit", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySnipe;
            if(!as.upgrades.shotSplitOnHit){
                as.upgrades.shotSplitOnHit = true;
                as.upgrades.shotSplitsPerHit = 0;
            }
            as.upgrades.shotSplitsPerHit!++;
        }
    });

    return upgradeOptions;
}

