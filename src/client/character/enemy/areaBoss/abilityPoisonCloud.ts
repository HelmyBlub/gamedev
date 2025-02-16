import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityObjectCircle, AbilityOwner, PaintOrderAbility } from "../../../ability/ability.js";
import { calculateDirection, calculateDistance, getCameraPosition, getNextId } from "../../../game.js";
import { FACTION_ENEMY, FACTION_PLAYER, Game, IdCounter, Position } from "../../../gameModel.js";
import { getPointPaintPosition } from "../../../gamePaint.js";

export const ABILITY_NAME_POISON_CLOUD = "PoisonCloud";
export type AbilityPoisonCloud = Ability & {
    objectDuration: number,
    moveSpeed: number,
    radius: number,
    cooldown: number,
    lastCastTime?: number,
}

export type AbilityObjectPoisonCloud = AbilityObjectCircle & {
    subType: "PoisonCloud",
    deleteTime: number,
    tickInterval: number,
    nextTickTime?: number,
}

export type AbilityObjectPoisonCloudTraveling = AbilityObjectCircle & {
    subType: "PoisonCloudTraveling",
    targetPosition: Position,
    moveSpeed: number,
    toDelete: boolean,
}

export function addAbilityPoisonCloud() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_POISON_CLOUD] = {
        createAbility: createAbilityPoisonCloud,
        deleteAbilityObject: deleteObject,
        paintAbilityObject: paintAbilityObject,
        tickAbility: tickAbility,
        tickAbilityObject: tickAbilityObject,
        canBeUsedByBosses: true,
    };
}

export function createAbilityPoisonCloud(
    idCounter: IdCounter,
): AbilityPoisonCloud {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_POISON_CLOUD,
        objectDuration: 10000,
        radius: 20,
        cooldown: 2000,
        passive: true,
        moveSpeed: 4,
        upgrades: {},
    };
}

function createObjectPoisonCloudTraveling(x: number, y: number, abilityIdRef: number, owner: AbilityOwner): AbilityObjectPoisonCloudTraveling {
    return {
        type: ABILITY_NAME_POISON_CLOUD,
        x: owner.x,
        y: owner.y,
        radius: 2,
        damage: 0,
        color: "black",
        faction: owner.faction,
        subType: "PoisonCloudTraveling",
        moveSpeed: 5,
        targetPosition: { x, y },
        toDelete: false,
        abilityIdRef: abilityIdRef,
    }
}

function createObjectPoisonCloud(abilityObject: AbilityObjectPoisonCloudTraveling, gameTime: number): AbilityObjectPoisonCloud {
    return {
        type: ABILITY_NAME_POISON_CLOUD,
        x: abilityObject.targetPosition.x,
        y: abilityObject.targetPosition.y,
        radius: 20,
        color: "black",
        damage: abilityObject.damage,
        faction: abilityObject.faction,
        deleteTime: gameTime + 20000,
        subType: "PoisonCloud",
        tickInterval: 250,
        abilityIdRef: abilityObject.abilityIdRef,
    }
}

function paintAbilityObject(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    const poisonCloud = abilityObject as AbilityObjectPoisonCloud;
    const cameraPosition = getCameraPosition(game);
    const paintPos = getPointPaintPosition(ctx, abilityObject, cameraPosition, game.UI.zoom);

    ctx.fillStyle = abilityObject.color;
    if (abilityObject.faction === FACTION_ENEMY) ctx.fillStyle = "black";
    if (poisonCloud.subType === "PoisonCloud") {
        if (paintOrder === "beforeCharacterPaint") {
            ctx.globalAlpha = abilityObject.faction === FACTION_ENEMY ? 0.9 : 0.65;
            if (abilityObject.faction === FACTION_PLAYER) ctx.globalAlpha *= game.UI.playerGlobalAlphaMultiplier;
            ctx.beginPath();
            ctx.arc(
                paintPos.x,
                paintPos.y,
                poisonCloud.radius, 0, 2 * Math.PI
            );
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    } else if (poisonCloud.subType === "PoisonCloudTraveling") {
        if (paintOrder === "afterCharacterPaint") {
            if (abilityObject.faction === FACTION_PLAYER) ctx.globalAlpha *= game.UI.playerGlobalAlphaMultiplier;
            ctx.beginPath();
            ctx.arc(
                paintPos.x,
                paintPos.y,
                5, 0, poisonCloud.radius * Math.PI
            );
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
}

function tickAbility(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const poisonCloud = ability as AbilityPoisonCloud;

    cast(abilityOwner, poisonCloud, game);
}

function tickAbilityObject(abilityObject: AbilityObject, game: Game) {
    const poisonCloud = abilityObject as AbilityObjectPoisonCloud;
    if (poisonCloud.subType === "PoisonCloud") {
        if (poisonCloud.nextTickTime === undefined) poisonCloud.nextTickTime = game.state.time + poisonCloud.tickInterval;
        if (poisonCloud.nextTickTime <= game.state.time) {
            //TODO hit player
            poisonCloud.nextTickTime += poisonCloud.tickInterval;
        }
    } else {
        const travelingObject = abilityObject as AbilityObjectPoisonCloudTraveling;
        if (travelingObject.toDelete) return;
        const distance = calculateDistance(travelingObject, travelingObject.targetPosition);
        if (distance <= travelingObject.moveSpeed) {
            const fireCircle = createObjectPoisonCloud(travelingObject, game.state.time);
            game.state.abilityObjects.push(fireCircle);
            travelingObject.toDelete = true;
        } else {
            const direction = calculateDirection(travelingObject, travelingObject.targetPosition);
            travelingObject.x = travelingObject.x + Math.cos(direction) * travelingObject.moveSpeed;
            travelingObject.y = travelingObject.y + Math.sin(direction) * travelingObject.moveSpeed;
        }
    }
}

function deleteObject(abilityObject: AbilityObject, game: Game): boolean {
    const abilityObjectFireCircle = abilityObject as AbilityObjectPoisonCloud;
    if (abilityObjectFireCircle.subType === "PoisonCloud") {
        return abilityObjectFireCircle.deleteTime <= game.state.time;
    } else {
        const abilityObjectFireCircleTraveling = abilityObject as AbilityObjectPoisonCloudTraveling;
        return abilityObjectFireCircleTraveling.toDelete;
    }
}

function cast(abilityOwner: AbilityOwner, ability: AbilityPoisonCloud, game: Game) {
    if (ability.lastCastTime === undefined || ability.lastCastTime + ability.cooldown < game.state.time) {
        //TODO find target position
        const targetPos = { x: 0, y: 0 };
        game.state.abilityObjects.push(createObjectPoisonCloudTraveling(targetPos.x, targetPos.y, ability.id, abilityOwner));
        ability.lastCastTime = game.state.time;
    }
}
