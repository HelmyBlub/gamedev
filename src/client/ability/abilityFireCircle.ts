import { Character } from "../character/characterModel.js";
import { Game, Position } from "../gameModel.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, detectAbilityObjectToCharacterHit, UpgradeOptionAbility } from "./ability.js";

const ABILITY_NAME = "FireCircle";
export type AbilityFireCircle = Ability & {
    objectDuration: number,
    damage: number,
    size: number,
    baseRechargeTime: number,
    rechargeTimeDecreaseFaktor: number,
    maxCharges: number,
    currentCharges: number,
    nextRechargeTime: number,
}

export type AbilityObjectFireCircle = AbilityObject & {
    deleteTime: number,
}

export function addFireCircleAbility() {
    ABILITIES_FUNCTIONS[ABILITY_NAME] = {
        tickAbility: tickAbilityFireCircle,
        createAbiltiyUpgradeOptions: createAbiltiyFireCircleUpgradeOptions,
        activeAbilityCast: castFireCircle,
        tickAbilityObject: tickAbilityObject,
        deleteAbilityObject: deleteObjectFireCircle,
        paintAbilityUI: paintAbilityFireCircleUI,
    };
}

export function createAbilityFireCircle(
    playerInputBinding: string,
    objectDuration: number = 2000,
    damage: number = 10,
    size: number = 30,
    rechargeTime: number = 2000,
    maxCharges: number = 3
): AbilityFireCircle {
    return {
        name: ABILITY_NAME,
        objectDuration: objectDuration,
        damage: damage,
        size: size,
        baseRechargeTime: rechargeTime,
        rechargeTimeDecreaseFaktor: 1,
        maxCharges: maxCharges,
        currentCharges: maxCharges,
        nextRechargeTime: 0,
        passive: false,
        playerInputBinding: playerInputBinding,
    };
}

function createObjectFireCircle(x: number, y: number, damage: number, faction: string, gameTime: number, duration: number, size: number): AbilityObjectFireCircle {
    return {
        type: ABILITY_NAME,
        x: x,
        y: y,
        size: size,
        color: "red",
        damage: damage,
        faction: faction,
        deleteTime: gameTime + duration,
        paintOrder: "beforeCharacterPaint",
    }
}

function tickAbilityFireCircle(character: Character, ability: Ability, game: Game) {
    let abilityFireCircle = ability as AbilityFireCircle;
    if (abilityFireCircle.currentCharges < abilityFireCircle.maxCharges) {
        if (game.state.time >= abilityFireCircle.nextRechargeTime) {
            abilityFireCircle.currentCharges++;
            abilityFireCircle.nextRechargeTime += abilityFireCircle.baseRechargeTime / abilityFireCircle.rechargeTimeDecreaseFaktor;
        }
    }
}

function paintAbilityFireCircleUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    let fireCircle = ability as AbilityFireCircle;
    let fontSize = size;
    let rectSize = size;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.beginPath();
    ctx.rect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.stroke();
    if (fireCircle.currentCharges < fireCircle.maxCharges) {
        ctx.fillStyle = "gray";
        let heightFactor = (fireCircle.nextRechargeTime - game.state.time) / (fireCircle.baseRechargeTime / fireCircle.rechargeTimeDecreaseFaktor);
        ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize * heightFactor);
    }

    ctx.fillStyle = "black";
    ctx.font = fontSize + "px Arial";
    ctx.fillText("" + fireCircle.currentCharges, drawStartX, drawStartY + rectSize - (rectSize - fontSize * 0.9));

    if (fireCircle.playerInputBinding) {
        let keyBind = "";
        game.clientKeyBindings[0].keyCodeToActionPressed.forEach((value, key) => {
            if (value.action === fireCircle.playerInputBinding) {
                keyBind = value.uiDisplayInputValue;
            }
        });
        ctx.fillStyle = "black";
        ctx.font = "10px Arial";
        ctx.fillText(keyBind, drawStartX + 1, drawStartY + 8);
    }
}

function tickAbilityObject(abilityObject: AbilityObject, game: Game) {
    detectAbilityObjectToCharacterHit(game.state.map, abilityObject, game.state.players);
}

function deleteObjectFireCircle(abilityObject: AbilityObject, game: Game): boolean {
    let abilityFireCircle = abilityObject as AbilityObjectFireCircle;
    return abilityFireCircle.deleteTime <= game.state.time;
}

function createAbiltiyFireCircleUpgradeOptions(): UpgradeOptionAbility[] {
    let upgradeOptions: UpgradeOptionAbility[] = [];
    upgradeOptions.push({
        name: "Damage+10", upgrade: (a: Ability) => {
            let as = a as AbilityFireCircle;
            as.damage += 10;
        },
    });
    upgradeOptions.push({
        name: "Size+", upgrade: (a: Ability) => {
            let as = a as AbilityFireCircle;
            let addSize = Math.max(1, 10 - (as.size - 30) / 40);
            as.size += addSize;
        },
    });
    upgradeOptions.push({
        name: "Duration+", upgrade: (a: Ability) => {
            let as = a as AbilityFireCircle;
            as.objectDuration += 250;
        },
    });
    upgradeOptions.push({
        name: "RechargeTime-", upgrade: (a: Ability) => {
            let as = a as AbilityFireCircle;
            as.rechargeTimeDecreaseFaktor += 0.15;
        },
    });

    return upgradeOptions;
}

function castFireCircle(character: Character, ability: Ability, castPosition: Position, game: Game) {
    let abilityFireCircle = ability as AbilityFireCircle;
    if (abilityFireCircle.currentCharges > 0) {
        game.state.abilityObjects.push(createObjectFireCircle(
            castPosition.x,
            castPosition.y,
            abilityFireCircle.damage,
            character.faction,
            game.state.time,
            abilityFireCircle.objectDuration,
            abilityFireCircle.size
        ));
        if (abilityFireCircle.currentCharges === abilityFireCircle.maxCharges) {
            abilityFireCircle.nextRechargeTime = game.state.time + abilityFireCircle.baseRechargeTime / abilityFireCircle.rechargeTimeDecreaseFaktor;
        }
        abilityFireCircle.currentCharges--;
    }
}
