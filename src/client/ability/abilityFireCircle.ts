import { calculateDirection, calculateDistance, getCameraPosition, getNextId } from "../game.js";
import { FACTION_ENEMY, Game, IdCounter, Position } from "../gameModel.js";
import { getPointPaintPosition } from "../gamePaint.js";
import { nextRandom } from "../randomNumberGenerator.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, detectAbilityObjectCircleToCharacterHit, PaintOrderAbility, AbilityObjectCircle } from "./ability.js";

export const ABILITY_NAME_FIRE_CIRCLE = "FireCircle";
export type AbilityFireCircle = Ability & {
    objectDuration: number,
    moveSpeed: number,
    damage: number,
    radius: number,
    baseRechargeTime: number,
    rechargeTimeDecreaseFaktor: number,
    maxCharges: number,
    currentCharges: number,
    nextRechargeTime: number,
}

export type AbilityObjectFireCircle = AbilityObjectCircle & {
    subType: "FireCircel",
    deleteTime: number,
    tickInterval: number,
    nextTickTime?: number,
}

export type AbilityObjectFireCircleTraveling = AbilityObjectCircle & {
    subType: "FireCircelTraveling",
    targetPosition: Position,
    duration: number,
    moveSpeed: number,
    toDelete: boolean,
}

export function addAbilityFireCircle() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_FIRE_CIRCLE] = {
        tickAbility: tickAbilityFireCircle,
        activeAbilityCast: castFireCircle,
        tickAbilityObject: tickAbilityObjectFireCircle,
        deleteAbilityObject: deleteObjectFireCircle,
        paintAbilityUI: paintAbilityFireCircleUI,
        createAbility: createAbilityFireCircle,
        setAbilityToLevel: setAbilityFireCircleToLevel,
        paintAbilityObject: paintAbilityObjectFireCircle,
        setAbilityToBossLevel: setAbilityFireCircleToBossLevel,
        canBeUsedByBosses: true,
    };
}

function createAbilityFireCircle(
    idCounter: IdCounter,
    playerInputBinding?: string,
    objectDuration: number = 2000,
    damage: number = 10,
    radius: number = 15,
    rechargeTime: number = 2000,
    maxCharges: number = 3
): AbilityFireCircle {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_FIRE_CIRCLE,
        objectDuration: objectDuration,
        damage: damage,
        radius: radius,
        baseRechargeTime: rechargeTime,
        rechargeTimeDecreaseFaktor: 1,
        maxCharges: maxCharges,
        currentCharges: 0,
        nextRechargeTime: -1,
        passive: false,
        playerInputBinding: playerInputBinding,
        moveSpeed: 4,
        upgrades: {},
    };
}

function createObjectFireCircleTraveling(x: number, y: number, damage: number, faction: string, duration: number, radius: number, moveSpeed: number, owner: AbilityOwner): AbilityObjectFireCircleTraveling {
    return {
        type: ABILITY_NAME_FIRE_CIRCLE,
        x: owner.x,
        y: owner.y,
        radius: radius,
        color: "red",
        damage: damage,
        faction: faction,
        duration: duration,
        subType: "FireCircelTraveling",
        moveSpeed: moveSpeed,
        targetPosition: { x, y },
        toDelete: false,
    }
}

function createObjectFireCircle(abilityObject: AbilityObjectFireCircleTraveling, gameTime: number): AbilityObjectFireCircle {
    return {
        type: ABILITY_NAME_FIRE_CIRCLE,
        x: abilityObject.targetPosition.x,
        y: abilityObject.targetPosition.y,
        radius: abilityObject.radius,
        color: "red",
        damage: abilityObject.damage,
        faction: abilityObject.faction,
        deleteTime: gameTime + abilityObject.duration,
        subType: "FireCircel",
        tickInterval: 250,
    }
}

function paintAbilityObjectFireCircle(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    const abilityObjectFireCircle = abilityObject as AbilityObjectFireCircle;
    const cameraPosition = getCameraPosition(game);
    const paintPos = getPointPaintPosition(ctx, abilityObject, cameraPosition);

    ctx.fillStyle = abilityObject.color;
    if (abilityObject.faction === FACTION_ENEMY) ctx.fillStyle = "black";
    if (abilityObjectFireCircle.subType === "FireCircel") {
        if (paintOrder === "beforeCharacterPaint") {
            ctx.globalAlpha = abilityObject.faction === FACTION_ENEMY ? 0.9 : 0.65;
            ctx.beginPath();
            ctx.arc(
                paintPos.x,
                paintPos.y,
                abilityObjectFireCircle.radius, 0, 2 * Math.PI
            );
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    } else if (abilityObjectFireCircle.subType === "FireCircelTraveling") {
        if (paintOrder === "afterCharacterPaint") {
            ctx.beginPath();
            ctx.arc(
                paintPos.x,
                paintPos.y,
                5, 0, 2 * Math.PI
            );
            ctx.fill();
        }
    }
}

function setAbilityFireCircleToLevel(ability: Ability, level: number) {
    const abilityFireCircle = ability as AbilityFireCircle;
    abilityFireCircle.damage = level * 100;
    abilityFireCircle.radius = 10 + level * 5;
    abilityFireCircle.objectDuration = 2000 + level * 500;
    abilityFireCircle.rechargeTimeDecreaseFaktor = 1 + 0.30 * level;
}

function setAbilityFireCircleToBossLevel(ability: Ability, level: number) {
    const abilityFireCircle = ability as AbilityFireCircle;
    abilityFireCircle.damage = level * 10;
    abilityFireCircle.radius = 15 + level * 5;
    abilityFireCircle.objectDuration = 5000;
    abilityFireCircle.baseRechargeTime = 2000;
    abilityFireCircle.rechargeTimeDecreaseFaktor = 1 + level * 0.50;
    abilityFireCircle.moveSpeed = 2;
}

function tickAbilityFireCircle(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityFireCircle = ability as AbilityFireCircle;
    if (abilityFireCircle.nextRechargeTime === -1) {
        abilityFireCircle.nextRechargeTime = game.state.time + abilityFireCircle.baseRechargeTime / abilityFireCircle.rechargeTimeDecreaseFaktor;
    }
    if (abilityFireCircle.currentCharges < abilityFireCircle.maxCharges) {
        if (game.state.time >= abilityFireCircle.nextRechargeTime) {
            abilityFireCircle.currentCharges++;
            abilityFireCircle.nextRechargeTime += abilityFireCircle.baseRechargeTime / abilityFireCircle.rechargeTimeDecreaseFaktor;
            if (abilityFireCircle.nextRechargeTime <= game.state.time) {
                abilityFireCircle.nextRechargeTime = game.state.time + abilityFireCircle.baseRechargeTime / abilityFireCircle.rechargeTimeDecreaseFaktor;
            }
        }
    }

    if (ability.passive) {
        if (abilityFireCircle.currentCharges > 0) {
            autoCastAbility(abilityOwner, abilityFireCircle, game);
        }
    }
}

function autoCastAbility(abilityOwner: AbilityOwner, abilityFireCircle: AbilityFireCircle, game: Game) {
    let areaSize = 20 + abilityFireCircle.radius * 2;
    if (abilityOwner.faction === FACTION_ENEMY) areaSize += 50;
    const castRandomPosition = {
        x: abilityOwner.x + nextRandom(game.state.randomSeed) * areaSize * 2 - areaSize,
        y: abilityOwner.y + nextRandom(game.state.randomSeed) * areaSize * 2 - areaSize
    };

    castFireCircle(abilityOwner, abilityFireCircle, castRandomPosition, true, game);
}

function paintAbilityFireCircleUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    const fireCircle = ability as AbilityFireCircle;
    const fontSize = size;
    const rectSize = size;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.beginPath();
    ctx.rect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.stroke();
    if (fireCircle.currentCharges < fireCircle.maxCharges) {
        ctx.fillStyle = "gray";
        const heightFactor = (fireCircle.nextRechargeTime - game.state.time) / (fireCircle.baseRechargeTime / fireCircle.rechargeTimeDecreaseFaktor);
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

function tickAbilityObjectFireCircle(abilityObject: AbilityObject, game: Game) {
    const abilityObjectFireCircle = abilityObject as AbilityObjectFireCircle;
    if (abilityObjectFireCircle.subType === "FireCircel") {
        if (abilityObjectFireCircle.nextTickTime === undefined) abilityObjectFireCircle.nextTickTime = game.state.time + abilityObjectFireCircle.tickInterval;
        if (abilityObjectFireCircle.nextTickTime <= game.state.time) {
            detectAbilityObjectCircleToCharacterHit(game.state.map, abilityObjectFireCircle, game);
            abilityObjectFireCircle.nextTickTime += abilityObjectFireCircle.tickInterval;
        }
    } else if (abilityObjectFireCircle.subType === "FireCircelTraveling") {
        const ability = abilityObject as AbilityObjectFireCircleTraveling;
        if (ability.toDelete) return;
        const distance = calculateDistance(ability, ability.targetPosition);
        if (distance <= ability.moveSpeed) {
            const fireCircle = createObjectFireCircle(ability, game.state.time);
            game.state.abilityObjects.push(fireCircle);
            ability.toDelete = true;
        } else {
            const direction = calculateDirection(ability, ability.targetPosition);
            ability.x = ability.x + Math.cos(direction) * ability.moveSpeed;
            ability.y = ability.y + Math.sin(direction) * ability.moveSpeed;
        }
    }
}

function deleteObjectFireCircle(abilityObject: AbilityObject, game: Game): boolean {
    const abilityObjectFireCircle = abilityObject as AbilityObjectFireCircle;
    if (abilityObjectFireCircle.subType === "FireCircel") {
        return abilityObjectFireCircle.deleteTime <= game.state.time;
    } else {
        const abilityObjectFireCircleTraveling = abilityObject as AbilityObjectFireCircleTraveling;
        return abilityObjectFireCircleTraveling.toDelete;
    }
}

function castFireCircle(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, isKeydown: boolean, game: Game) {
    if (!isKeydown) return;
    const abilityFireCircle = ability as AbilityFireCircle;
    if (abilityFireCircle.currentCharges > 0) {
        game.state.abilityObjects.push(createObjectFireCircleTraveling(
            castPosition.x,
            castPosition.y,
            abilityFireCircle.damage,
            abilityOwner.faction,
            abilityFireCircle.objectDuration,
            abilityFireCircle.radius,
            abilityFireCircle.moveSpeed,
            abilityOwner
        ));
        if (abilityFireCircle.currentCharges === abilityFireCircle.maxCharges) {
            abilityFireCircle.nextRechargeTime = game.state.time + abilityFireCircle.baseRechargeTime / abilityFireCircle.rechargeTimeDecreaseFaktor;
        }
        abilityFireCircle.currentCharges--;
    }
}
