import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityObjectCircle, AbilityOwner, PaintOrderAbility } from "../../../ability/ability.js";
import { calculateDirection, calculateDistance, getCameraPosition, getNextId } from "../../../game.js";
import { FACTION_ENEMY, FACTION_PLAYER, Game, IdCounter, Position } from "../../../gameModel.js";
import { getPointPaintPosition } from "../../../gamePaint.js";
import { calculateMovePosition } from "../../../map/map.js";
import { nextRandom } from "../../../randomNumberGenerator.js";
import { characterTakeDamage, determineClosestCharacter, getPlayerCharacters } from "../../character.js";
import { Character } from "../../characterModel.js";

export const ABILITY_NAME_POISON_CLOUD = "PoisonCloud";
export type AbilityPoisonCloud = Ability & {
    cooldown: number,
    lastCastTime?: number,
}

export type AbilityObjectPoisonCloud = AbilityObjectCircle & {
    subType: "PoisonCloud",
    deleteTime: number,
    tickInterval: number,
    nextTickTime?: number,
    moveTo?: Position,
}

export type AbilityObjectPoisonCloudTraveling = AbilityObjectCircle & {
    subType: "PoisonCloudTraveling",
    targetPosition: Position,
    moveSpeed: number,
    toDelete: boolean,
}

const MAX_DINSTANCE = 1000;
const HP_COST = 2;
const HP_PER_CENT_DAMAGE = 0.01;
const CLOUD_MOVE_SPEED = 1;
const CLOUD_RADIUS = 50;
const COOLDOWN = 2000;
const CLOUD_DURATION = 10000;


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
        cooldown: COOLDOWN,
        passive: true,
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
        radius: CLOUD_RADIUS,
        color: "black",
        damage: abilityObject.damage,
        faction: abilityObject.faction,
        deleteTime: gameTime + CLOUD_DURATION,
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
            ctx.globalAlpha = 0.8;
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
    if (poisonCloud.lastCastTime === undefined || poisonCloud.lastCastTime + poisonCloud.cooldown < game.state.time) {
        poisonCloud.lastCastTime = game.state.time;
        const closest = determineClosestCharacter(abilityOwner, getPlayerCharacters(game.state.players));
        if (!closest.minDistanceCharacter || closest.minDistance > MAX_DINSTANCE) return;
        const targetPos = { x: closest.minDistanceCharacter.x, y: closest.minDistanceCharacter.y };
        game.state.abilityObjects.push(createObjectPoisonCloudTraveling(targetPos.x, targetPos.y, ability.id, abilityOwner));
        const owner = abilityOwner as Character;
        owner.isDamageImmune = false;
        characterTakeDamage(owner, HP_COST, game, undefined, ability.name);
        owner.isDamageImmune = true;
    }
}

function tickAbilityObject(abilityObject: AbilityObject, game: Game) {
    const poisonCloud = abilityObject as AbilityObjectPoisonCloud;
    if (poisonCloud.moveTo) {
        const direction = calculateDirection(poisonCloud, poisonCloud.moveTo);
        const newPos = calculateMovePosition(poisonCloud, direction, CLOUD_MOVE_SPEED, false);
        poisonCloud.x = newPos.x;
        poisonCloud.y = newPos.y;
        if (calculateDistance(abilityObject, poisonCloud.moveTo) < CLOUD_MOVE_SPEED) {
            poisonCloud.moveTo = undefined;
        }
    } else {
        poisonCloud.moveTo = {
            x: poisonCloud.x + nextRandom(game.state.randomSeed) * 100 - 50,
            y: poisonCloud.y + nextRandom(game.state.randomSeed) * 100 - 50,
        }
    }
    if (poisonCloud.subType === "PoisonCloud") {
        if (poisonCloud.nextTickTime === undefined) poisonCloud.nextTickTime = game.state.time + poisonCloud.tickInterval;
        if (poisonCloud.nextTickTime <= game.state.time) {
            poisonCloud.nextTickTime += poisonCloud.tickInterval;
            const playerChars = getPlayerCharacters(game.state.players);
            for (let player of playerChars) {
                const distance = calculateDistance(abilityObject, player);
                if (distance < poisonCloud.radius + player.width / 2) {
                    const damage = player.maxHp * HP_PER_CENT_DAMAGE;
                    characterTakeDamage(player, damage, game, undefined, abilityObject.type, abilityObject);
                }
            }
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

