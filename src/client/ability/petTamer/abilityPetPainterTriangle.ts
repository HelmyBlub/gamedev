import { Character } from "../../character/characterModel.js";
import { TamerPetCharacter, findPetOwner } from "../../character/playerCharacters/tamer/tamerPetCharacter.js";
import { calculateDistance, getCameraPosition } from "../../game.js";
import { FACTION_ENEMY, FACTION_PLAYER, Game, Position } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { isPositionBlocking, moveByDirectionAndDistance } from "../../map/map.js";
import { RandomSeed, nextRandom } from "../../randomNumberGenerator.js";
import { AbilityOwner, PaintOrderAbility, detectCircleCharacterHit } from "../ability.js";
import { ABILITY_NAME_PET_PAINTER, ABILITY_PET_PAINTER_SHAPES_FUNCTIONS, AbilityObjectPetPainter, AbilityPetPainter, createShapeAbilityPetPainter } from "./abilityPetPainter.js";
import { ABILITY_PET_PAINTER_UPGRADE_FACTORY, AbilityPetPainterUpgradeFactory } from "./abilityPetPainterUpgradeFactory.js";
import { AbilityPetPainterUpgradeSplit } from "./abilityPetPainterUpgradeSplit.js";

export type AbilityObjectPetPainterTriangle = AbilityObjectPetPainter & {
    tickInterval: number,
    nextTickTime?: number,
    rotation: number,
    rotationSpeed: number,
    range: number,
    centerPos: Position,
    rotationOffset: number,
    sideLength: number,
}

const TRIANGLESIZE = 30;
const DURATION = 10000;
const TRIANGLE_DAMAGE_FACTOR = 1;
const PET_PAINTER_TRIANGLE = "Triangle";

export function addAbilityPetPainterTriangle() {
    ABILITY_PET_PAINTER_SHAPES_FUNCTIONS[PET_PAINTER_TRIANGLE] = {
        createShape: createShapeTriangle,
        createSplitShape: createSplitShape,
        paintShape: paintShapeTriangle,
        paintShapeObject: paintShapeObjectPetPainterTriangle,
        tickShape: tickTriangle,
        tickShapeObject: tickShapeObjectPetPainterTriangle,
        initShapePaint: initShapePaintTriangle,
    }
}

function createAbilityObjectPetPainterTriangle(
    position: Position,
    damage: number,
    size: number,
    abilityIdRef: number,
    faction: string,
    randomSeed: RandomSeed,
    gameTime: number
): AbilityObjectPetPainterTriangle {
    const abilityObjectPetPainter: AbilityObjectPetPainterTriangle = {
        type: ABILITY_NAME_PET_PAINTER,
        color: "red",
        x: position.x,
        y: position.y,
        sideLength: size,
        damage: damage * TRIANGLE_DAMAGE_FACTOR,
        faction: faction,
        deleteTime: gameTime + DURATION,
        subType: PET_PAINTER_TRIANGLE,
        abilityIdRef: abilityIdRef,
        tickInterval: 100,
        range: 50,
        rotation: 0,
        rotationSpeed: nextRandom(randomSeed) > 0.5 ? 0.1 : -0.1,
        centerPos: position,
        rotationOffset: nextRandom(randomSeed) * Math.PI * 2,
    }
    if (faction === FACTION_ENEMY) {
        abilityObjectPetPainter.color = "black";
    }
    return abilityObjectPetPainter;
}

function createAbilityObjectPetPainterTriangleFactory(
    position: Position,
    damage: number,
    size: number,
    abilityIdRef: number,
    faction: string,
    duration: number,
    spawnInterval: number,
    gameTime: number
): AbilityObjectPetPainterTriangle {
    const abilityObjectPetPainter: AbilityObjectPetPainterTriangle = {
        type: ABILITY_NAME_PET_PAINTER,
        color: "red",
        x: position.x,
        y: position.y,
        damage: damage * TRIANGLE_DAMAGE_FACTOR,
        sideLength: size,
        faction: faction,
        deleteTime: gameTime + duration,
        subType: PET_PAINTER_TRIANGLE,
        abilityIdRef: abilityIdRef,
        tickInterval: spawnInterval,
        range: 50,
        rotation: 0,
        rotationSpeed: 0,
        centerPos: position,
        rotationOffset: 0,
        isFactory: true,
    }
    if (faction === FACTION_ENEMY) {
        abilityObjectPetPainter.color = "black";
    }
    return abilityObjectPetPainter;
}

function createSplitShape(abilityObject: AbilityObjectPetPainter, upgrade: AbilityPetPainterUpgradeSplit, game: Game): AbilityObjectPetPainter {
    const triangle = abilityObject as AbilityObjectPetPainterTriangle;
    return createAbilityObjectPetPainterTriangle(
        triangle,
        triangle.damage * upgrade.damageFactor,
        triangle.sideLength / 2,
        triangle.abilityIdRef!,
        triangle.faction,
        game.state.randomSeed,
        game.state.time
    );
}

function createShapeTriangle(pet: TamerPetCharacter, abilityPetPainter: AbilityPetPainter, game: Game): AbilityObjectPetPainter {
    const damage = abilityPetPainter.baseDamage * pet.sizeFactor * TRIANGLE_DAMAGE_FACTOR;
    const factoryUpgrade = abilityPetPainter.upgrades[ABILITY_PET_PAINTER_UPGRADE_FACTORY] as AbilityPetPainterUpgradeFactory;
    if (factoryUpgrade) {
        return createAbilityObjectPetPainterTriangleFactory(abilityPetPainter.paintPoints![0], damage, TRIANGLESIZE, abilityPetPainter.id, pet.faction, factoryUpgrade.duration, factoryUpgrade.spawnInterval, game.state.time);
    } else {
        return createAbilityObjectPetPainterTriangle(abilityPetPainter.paintPoints![0], damage, TRIANGLESIZE, abilityPetPainter.id, pet.faction, game.state.randomSeed, game.state.time);
    }
}

function initShapePaintTriangle(pet: TamerPetCharacter, ability: AbilityPetPainter, game: Game) {
    pet.forcedMovePosition = getRandomStartPaintPositionTriangle(pet, game);
    if(!pet.forcedMovePosition) return;
    ability.currentlyPainting = PET_PAINTER_TRIANGLE;
    ability.paintPoints = [];
}

function tickShapeObjectPetPainterTriangle(abilityObject: AbilityObjectPetPainter, game: Game) {
    const triangle = abilityObject as AbilityObjectPetPainterTriangle;
    if (abilityObject.isFactory) {
        const factory = abilityObject as AbilityObjectPetPainterTriangle;
        if (factory.nextTickTime === undefined) factory.nextTickTime = game.state.time + factory.tickInterval!;
        if (factory.nextTickTime <= game.state.time) {
            const shape = createAbilityObjectPetPainterTriangle(factory, factory.damage, TRIANGLESIZE, factory.abilityIdRef!, factory.faction, game.state.randomSeed, game.state.time);
            game.state.abilityObjects.push(shape);
            factory.nextTickTime += factory.tickInterval!;
            if (factory.nextTickTime <= game.state.time) {
                factory.nextTickTime = game.state.time + factory.tickInterval!;
            }
        }
    } else {
        triangle.rotation = (triangle.rotation + triangle.rotationSpeed) % (Math.PI * 2);
        const direction = triangle.rotationSpeed < 0 ? -1 : 1;
        const distance = (DURATION - (triangle.deleteTime - game.state.time)) / DURATION * 100;
        triangle.x = triangle.centerPos.x + Math.sin(distance / 10 + triangle.rotationOffset) * distance * direction;
        triangle.y = triangle.centerPos.y + Math.cos(distance / 10 + triangle.rotationOffset) * distance * direction;
        if (triangle.nextTickTime === undefined) triangle.nextTickTime = game.state.time + triangle.tickInterval;
        if (triangle.nextTickTime <= game.state.time) {
            const center: Position = triangleCenter(triangle);
            detectCircleCharacterHit(game.state.map, center, triangle.sideLength / 2, triangle.faction, triangle.abilityIdRef!, triangle.damage, game);
            triangle.nextTickTime += triangle.tickInterval;
            if (triangle.nextTickTime <= game.state.time) {
                triangle.nextTickTime = game.state.time + triangle.tickInterval;
            }
        }
    }
}

function triangleCenter(triangle: AbilityObjectPetPainterTriangle): Position {
    const p2 = { x: triangle.x, y: triangle.y };
    moveByDirectionAndDistance(p2, triangle.rotation, triangle.sideLength, false);
    const p3 = { x: p2.x, y: p2.y };
    moveByDirectionAndDistance(p2, triangle.rotation + Math.PI * 2 / 3, triangle.sideLength, false);
    const centerX = (triangle.x + p2.x + p3.x) / 3;
    const centerY = (triangle.y + p2.y + p3.y) / 3;
    return { x: centerX, y: centerY };
}

function paintShapeObjectPetPainterTriangle(ctx: CanvasRenderingContext2D, abilityObject: AbilityObjectPetPainter, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "beforeCharacterPaint") return;
    const cameraPosition = getCameraPosition(game);
    const triangle = abilityObject as AbilityObjectPetPainterTriangle;
    const paintPos = getPointPaintPosition(ctx, triangle, cameraPosition);
    const startPos = { x: paintPos.x, y: paintPos.y };
    if(abilityObject.faction === FACTION_PLAYER) ctx.globalAlpha *= game.UI.playerGlobalAlphaMultiplier;
    ctx.fillStyle = triangle.color;
    ctx.strokeStyle = triangle.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(paintPos.x, paintPos.y);
    moveByDirectionAndDistance(paintPos, triangle.rotation, triangle.sideLength, false);
    ctx.lineTo(paintPos.x, paintPos.y);
    moveByDirectionAndDistance(paintPos, triangle.rotation + Math.PI * 2 / 3, triangle.sideLength, false);
    ctx.lineTo(paintPos.x, paintPos.y);
    ctx.lineTo(startPos.x, startPos.y);
    !abilityObject.isFactory ? ctx.fill() : ctx.stroke();
    ctx.globalAlpha = 1;
}

function paintShapeTriangle(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: AbilityPetPainter, cameraPosition: Position, game: Game) {
    if (!ability.paintPoints || ability.paintPoints.length === 0) return;
    const start = getPointPaintPosition(ctx, ability.paintPoints[0], cameraPosition);
    ctx.fillStyle = "red";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    for (let i = 1; i < ability.paintPoints!.length; i++) {
        const nextPoint = getPointPaintPosition(ctx, ability.paintPoints![i], cameraPosition);
        ctx.lineTo(nextPoint.x, nextPoint.y);
    }
    const petPoint = getPointPaintPosition(ctx, abilityOwner, cameraPosition);
    ctx.lineTo(petPoint.x, petPoint.y);
    ctx.stroke();
}

function getRandomStartPaintPositionTriangle(pet: TamerPetCharacter, game: Game): Position | undefined {
    const petOwner: Character = findPetOwner(pet, game)!;
    if(!petOwner) return undefined;
    let blocking = true;
    let position = { x: 0, y: 0 };
    do {
        const randomOffsetX = nextRandom(game.state.randomSeed) * 100 - 60;
        const randomOffsetY = nextRandom(game.state.randomSeed) * 100 - 60;
        position = { x: petOwner.x + randomOffsetX, y: petOwner.y + randomOffsetY };
        blocking = isPositionBlocking(position, game.state.map, game.state.idCounter, game);
        if (!blocking) {
            const tempPosition = { x: position.x, y: position.y };
            let direction = 0;
            moveByDirectionAndDistance(tempPosition, direction, TRIANGLESIZE, false);
            blocking = isPositionBlocking(tempPosition, game.state.map, game.state.idCounter, game);
            if (!blocking) {
                direction += Math.PI * 2 / 3;
                moveByDirectionAndDistance(tempPosition, direction, TRIANGLESIZE, false);
                blocking = isPositionBlocking(tempPosition, game.state.map, game.state.idCounter, game);
            }
        }
    } while (blocking);
    return position;
}

function tickTriangle(pet: TamerPetCharacter, abilityPetPainter: AbilityPetPainter, game: Game) {
    const targetPos = pet.forcedMovePosition!;
    const distance = calculateDistance(pet, targetPos);
    let nextPosition: Position;
    if (distance < pet.moveSpeed) {
        switch (abilityPetPainter.paintPoints!.length) {
            case 0:
                abilityPetPainter.paintPoints!.push(targetPos);
                nextPosition = { x: targetPos.x, y: targetPos.y };
                moveByDirectionAndDistance(nextPosition, 0, TRIANGLESIZE, false);
                pet.forcedMovePosition = nextPosition;
                break;
            case 1:
                abilityPetPainter.paintPoints!.push(targetPos);
                nextPosition = { x: targetPos.x, y: targetPos.y };
                moveByDirectionAndDistance(nextPosition, Math.PI * 2 / 3, TRIANGLESIZE, false);
                pet.forcedMovePosition = nextPosition;
                break;
            case 2:
                abilityPetPainter.paintPoints!.push(targetPos);
                nextPosition = { x: targetPos.x, y: targetPos.y };
                moveByDirectionAndDistance(nextPosition, Math.PI * 2 / 3 * 2, TRIANGLESIZE, false);
                pet.forcedMovePosition = nextPosition;
                break;
            case 3:
                abilityPetPainter.currentlyPainting = undefined;
                pet.forcedMovePosition = undefined;
                createShapeAbilityPetPainter(PET_PAINTER_TRIANGLE, pet, abilityPetPainter, game);
                break;
        }
    } else if (distance > 150) {
        abilityPetPainter.currentlyPainting = undefined;
    }
}