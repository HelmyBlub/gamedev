import { Character } from "../character/characterModel.js";
import { calculateDirection, getCameraPosition, getNextId } from "../game.js";
import { FACTION_ENEMY, FACTION_PLAYER, Game, IdCounter, Position } from "../gameModel.js";
import { getPointPaintPosition } from "../gamePaint.js";
import { nextRandom } from "../randomNumberGenerator.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, PaintOrderAbility, detectAbilityObjectCircleToCharacterHit, AbilityObjectCircle, findAbilityById } from "./ability.js";

export type AbilityCircleAround = Ability & {
}

type AbilityObjectCircleAround = AbilityObjectCircle & {
    damage: number,
    tickInterval: number,
    removeTime: number,
    nextTickTime?: number,
    center: Position,
    distanceFromCenter: number,
    abilityRefDoOnHit?: boolean,
}

export const ABILITY_NAME_CIRCLE_AROUND = "CircleAround";

export function addAbilityCircleAround() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_CIRCLE_AROUND] = {
        createAbility: createAbilityCircleAround,
        deleteAbilityObject: deleteAbilityObjectCircleAround,
        paintAbilityObject: paintAbilityObjectCircleAround,
        tickAbilityObject: tickAbilityObjectCircleAround,
    };
}

export function createAbilityObjectCircleAround(
    position: Position,
    damagePerSecond: number,
    radius: number,
    faction: string,
    abilityIdRef: number,
    duration: number,
    game: Game
): AbilityObjectCircleAround {
    const tickInterval = 100;
    const damage = damagePerSecond * (tickInterval / 1000);
    const object: AbilityObjectCircleAround = {
        type: ABILITY_NAME_CIRCLE_AROUND,
        color: "red",
        damage: damage,
        faction: faction,
        radius: radius,
        abilityIdRef: abilityIdRef,
        removeTime: game.state.time + duration,
        tickInterval: tickInterval,
        center: { x: position.x, y: position.y },
        distanceFromCenter: 1,
        x: 0,
        y: 0,
    };
    const randomDirection = nextRandom(game.state.randomSeed) * Math.PI * 2;
    object.x = object.center.x + Math.cos(randomDirection);
    object.y = object.center.y + Math.sin(randomDirection);

    return object;
}

function createAbilityCircleAround(
    idCounter: IdCounter,
    playerInputBinding?: string,
): AbilityCircleAround {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_CIRCLE_AROUND,
        passive: true,
        upgrades: {},
    };
}

function deleteAbilityObjectCircleAround(abilityObject: AbilityObject, game: Game): boolean {
    const abilityObjectCircleAround = abilityObject as AbilityObjectCircleAround;
    return abilityObjectCircleAround.removeTime !== undefined && abilityObjectCircleAround.removeTime <= game.state.time;
}

function paintAbilityObjectCircleAround(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "beforeCharacterPaint") return;
    const abilityObjectCircleAround = abilityObject as AbilityObjectCircleAround;
    const cameraPosition = getCameraPosition(game);
    const paintPos = getPointPaintPosition(ctx, abilityObject, cameraPosition, game.UI.zoom);

    if (abilityObject.faction === FACTION_PLAYER) ctx.globalAlpha *= game.UI.playerGlobalAlphaMultiplier;
    ctx.fillStyle = abilityObject.faction === FACTION_ENEMY ? "black" : abilityObject.color;
    ctx.beginPath();
    const radius = abilityObjectCircleAround.radius;
    ctx.moveTo(paintPos.x + radius, paintPos.y + radius);
    ctx.lineTo(paintPos.x - radius, paintPos.y + radius);
    ctx.lineTo(paintPos.x, paintPos.y - radius);
    ctx.lineTo(paintPos.x + radius, paintPos.y + radius);
    ctx.fill();
    ctx.globalAlpha = 1;
}

function tickAbilityObjectCircleAround(abilityObject: AbilityObject, game: Game) {
    const abilityObjectCircleAround = abilityObject as AbilityObjectCircleAround;
    if (abilityObjectCircleAround.nextTickTime === undefined || abilityObjectCircleAround.nextTickTime <= game.state.time) {
        abilityObjectCircleAround.nextTickTime = game.state.time + abilityObjectCircleAround.tickInterval;
        detectAbilityObjectCircleToCharacterHit(game.state.map, abilityObjectCircleAround, game);
    }

    const currDirection = calculateDirection(abilityObjectCircleAround.center, abilityObject);
    const newDirection = currDirection + 0.05 % (Math.PI * 2);
    abilityObjectCircleAround.distanceFromCenter += (100 - abilityObjectCircleAround.distanceFromCenter) / 20;
    abilityObjectCircleAround.x = abilityObjectCircleAround.center.x + Math.cos(newDirection) * abilityObjectCircleAround.distanceFromCenter;
    abilityObjectCircleAround.y = abilityObjectCircleAround.center.y + Math.sin(newDirection) * abilityObjectCircleAround.distanceFromCenter;
}
