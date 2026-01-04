import { calculateDirection, calculateDistance, getCameraPosition, getNextId } from "../game.js";
import { FACTION_ENEMY, FACTION_PLAYER, Game, IdCounter, Position } from "../gameModel.js";
import { getPointPaintPosition } from "../gamePaint.js";
import { PlayerAbilityActionData, playerInputBindingToDisplayValue } from "../input/playerInput.js";
import { nextRandom } from "../randomNumberGenerator.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, detectAbilityObjectCircleToCharacterHit, PaintOrderAbility, AbilityObjectCircle, paintAbilityUiKeyBind, DefaultAbilityCastData } from "./ability.js";

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
    subType: "FireCircle",
    deleteTime: number,
    tickInterval: number,
    nextTickTime?: number,
}

export type AbilityObjectFireCircleTraveling = AbilityObjectCircle & {
    subType: "FireCircleTraveling",
    targetPosition: Position,
    duration: number,
    moveSpeed: number,
    toDelete: boolean,
}

export function addAbilityFireCircle() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_FIRE_CIRCLE] = {
        activeAbilityCast: castFireCircle,
        createAbility: createAbilityFireCircle,
        deleteAbilityObject: deleteObjectFireCircle,
        paintAbilityUI: paintAbilityFireCircleUI,
        paintAbilityObject: paintAbilityObjectFireCircle,
        resetAbility: resetAbility,
        setAbilityToLevel: setAbilityFireCircleToLevel,
        setAbilityToBossLevel: setAbilityFireCircleToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        tickAbility: tickAbilityFireCircle,
        tickAbilityObject: tickAbilityObjectFireCircle,
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

function createObjectFireCircleTraveling(x: number, y: number, damage: number, faction: string, duration: number, radius: number, moveSpeed: number, abilityIdRef: number, owner: AbilityOwner): AbilityObjectFireCircleTraveling {
    return {
        type: ABILITY_NAME_FIRE_CIRCLE,
        x: owner.x,
        y: owner.y,
        radius: radius,
        color: "red",
        damage: damage,
        faction: faction,
        duration: duration,
        subType: "FireCircleTraveling",
        moveSpeed: moveSpeed,
        targetPosition: { x, y },
        toDelete: false,
        abilityIdRef: abilityIdRef,
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
        subType: "FireCircle",
        tickInterval: 250,
        abilityIdRef: abilityObject.abilityIdRef,
    }
}

function resetAbility(ability: Ability) {
    const shoot = ability as AbilityFireCircle;
    shoot.nextRechargeTime = -1;
}

function paintAbilityObjectFireCircle(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    const abilityObjectFireCircle = abilityObject as AbilityObjectFireCircle;
    const cameraPosition = getCameraPosition(game);
    const paintPos = getPointPaintPosition(ctx, abilityObject, cameraPosition, game.UI.zoom);

    ctx.fillStyle = abilityObject.color;
    if (abilityObject.faction === FACTION_ENEMY) ctx.fillStyle = "black";
    if (abilityObjectFireCircle.subType === "FireCircle") {
        if (paintOrder === "beforeCharacterPaint") {
            ctx.globalAlpha = abilityObject.faction === FACTION_ENEMY ? 0.9 : 0.65;
            if (abilityObject.faction === FACTION_PLAYER) ctx.globalAlpha *= game.UI.playerGlobalAlphaMultiplier;
            ctx.beginPath();
            ctx.arc(
                paintPos.x,
                paintPos.y,
                abilityObjectFireCircle.radius, 0, 2 * Math.PI
            );
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    } else if (abilityObjectFireCircle.subType === "FireCircleTraveling") {
        if (paintOrder === "afterCharacterPaint") {
            if (abilityObject.faction === FACTION_PLAYER) ctx.globalAlpha *= game.UI.playerGlobalAlphaMultiplier;
            ctx.beginPath();
            ctx.arc(
                paintPos.x,
                paintPos.y,
                5, 0, 2 * Math.PI
            );
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
}

function setAbilityFireCircleToLevel(ability: Ability, level: number) {
    const abilityFireCircle = ability as AbilityFireCircle;
    abilityFireCircle.damage = level * 100;
    abilityFireCircle.radius = 10 + level * 5;
    abilityFireCircle.objectDuration = 2000 + level * 500;
    abilityFireCircle.rechargeTimeDecreaseFaktor = 1 + 0.30 * level;
    if (abilityFireCircle.rechargeTimeDecreaseFaktor > 4) {
        const over = abilityFireCircle.rechargeTimeDecreaseFaktor - 4;
        abilityFireCircle.rechargeTimeDecreaseFaktor = 4;
        abilityFireCircle.damage *= 1 + over;
    }
}

function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const abilityFireCircle = ability as AbilityFireCircle;
    abilityFireCircle.damage = level * 0.5 * damageFactor;
    abilityFireCircle.radius = 15 + (level / 5) * 5;
    abilityFireCircle.objectDuration = 5000;
    abilityFireCircle.baseRechargeTime = 2000;
    abilityFireCircle.rechargeTimeDecreaseFaktor = 1 + (level / 5) * 0.50;
    abilityFireCircle.moveSpeed = 2;
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
    const defaultData: DefaultAbilityCastData = {
        action: "AI",
        isKeydown: true,
        castPosition: castRandomPosition,
    };
    castFireCircle(abilityOwner, abilityFireCircle, defaultData, game);
}

function paintAbilityFireCircleUI(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
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
        paintAbilityUiKeyBind(ctx, fireCircle.playerInputBinding, drawStartX, drawStartY, game);
    }
}

function tickAbilityObjectFireCircle(abilityObject: AbilityObject, game: Game) {
    const abilityObjectFireCircle = abilityObject as AbilityObjectFireCircle;
    if (abilityObjectFireCircle.subType === "FireCircle") {
        if (abilityObjectFireCircle.nextTickTime === undefined) abilityObjectFireCircle.nextTickTime = game.state.time + abilityObjectFireCircle.tickInterval;
        if (abilityObjectFireCircle.nextTickTime <= game.state.time) {
            detectAbilityObjectCircleToCharacterHit(game.state.map, abilityObjectFireCircle, game);
            abilityObjectFireCircle.nextTickTime += abilityObjectFireCircle.tickInterval;
        }
    } else if (abilityObjectFireCircle.subType === "FireCircleTraveling") {
        const travelingObject = abilityObject as AbilityObjectFireCircleTraveling;
        if (travelingObject.toDelete) return;
        const distance = calculateDistance(travelingObject, travelingObject.targetPosition);
        if (distance <= travelingObject.moveSpeed) {
            const fireCircle = createObjectFireCircle(travelingObject, game.state.time);
            game.state.abilityObjects.push(fireCircle);
            travelingObject.toDelete = true;
        } else {
            const direction = calculateDirection(travelingObject, travelingObject.targetPosition);
            travelingObject.x = travelingObject.x + Math.cos(direction) * travelingObject.moveSpeed;
            travelingObject.y = travelingObject.y + Math.sin(direction) * travelingObject.moveSpeed;
        }
    }
}

function deleteObjectFireCircle(abilityObject: AbilityObject, game: Game): boolean {
    const abilityObjectFireCircle = abilityObject as AbilityObjectFireCircle;
    if (abilityObjectFireCircle.subType === "FireCircle") {
        return abilityObjectFireCircle.deleteTime <= game.state.time;
    } else {
        const abilityObjectFireCircleTraveling = abilityObject as AbilityObjectFireCircleTraveling;
        return abilityObjectFireCircleTraveling.toDelete;
    }
}

function castFireCircle(abilityOwner: AbilityOwner, ability: Ability, data: PlayerAbilityActionData, game: Game) {
    if (!data.isKeydown) return;
    const abilityFireCircle = ability as AbilityFireCircle;
    if (abilityFireCircle.currentCharges > 0) {
        const castPosition = (data as DefaultAbilityCastData).castPosition!;
        game.state.abilityObjects.push(createObjectFireCircleTraveling(
            castPosition.x,
            castPosition.y,
            abilityFireCircle.damage,
            abilityOwner.faction,
            abilityFireCircle.objectDuration,
            abilityFireCircle.radius,
            abilityFireCircle.moveSpeed,
            abilityFireCircle.id,
            abilityOwner
        ));
        if (abilityFireCircle.currentCharges === abilityFireCircle.maxCharges) {
            abilityFireCircle.nextRechargeTime = game.state.time + abilityFireCircle.baseRechargeTime / abilityFireCircle.rechargeTimeDecreaseFaktor;
        }
        abilityFireCircle.currentCharges--;
    }
}
