import { Character } from "../../character/characterModel.js";
import { TamerPetCharacter, findPetOwnerInPlayers } from "../../character/playerCharacters/tamerPetCharacter.js";
import { calculateDistance, getCameraPosition } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { isPositionBlocking, moveByDirectionAndDistance } from "../../map/map.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { AbilityOwner, PaintOrderAbility, detectCircleCharacterHit } from "../ability.js";
import { ABILITY_NAME_PET_PAINTER, ABILITY_PET_PAINTER_SHAPES_FUNCTIONS, AbilityObjectPetPainter, AbilityPetPainter } from "./abilityPetPainter.js";

export type AbilityObjectPetPainterTriangle = AbilityObjectPetPainter & {
    tickInterval: number,
    nextTickTime?: number,
    rotation: number,
    rotationSpeed: number,
    range: number,
    centerPos: Position,
}

const TRIANGLESIZE = 30;
const TRIANGLE_DAMAGE_FACTOR = 1;
const PET_PAINTER_TRIANGLE = "Triangle";

export function addAbilityPetPainterTriangle() {
    ABILITY_PET_PAINTER_SHAPES_FUNCTIONS[PET_PAINTER_TRIANGLE] = {
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
    abilityRefId: number,
    faction: string,
    gameTime: number
): AbilityObjectPetPainter {
    let abilityObjectPetPainter: AbilityObjectPetPainterTriangle = {
        type: ABILITY_NAME_PET_PAINTER,
        color: "red",
        x: position.x,
        y: position.y,
        damage: damage * TRIANGLE_DAMAGE_FACTOR,
        faction: faction,
        deleteTime: gameTime + 5000,
        subType: PET_PAINTER_TRIANGLE,
        abilityRefId: abilityRefId,
        tickInterval: 100,
        range: 50,
        rotation: 0,
        rotationSpeed: 0.1,
        centerPos: position,
    }

    return abilityObjectPetPainter;
}

function initShapePaintTriangle(pet: TamerPetCharacter, ability: AbilityPetPainter, game: Game) {
    ability.currentlyPainting = PET_PAINTER_TRIANGLE;
    ability.paintPoints = [];
    pet.forcedMovePosition = getRandomStartPaintPositionTriangle(pet, game);
}

function tickShapeObjectPetPainterTriangle(abilityObject: AbilityObjectPetPainter, game: Game) {
    const triangle = abilityObject as AbilityObjectPetPainterTriangle;
    if (abilityObject.subType === PET_PAINTER_TRIANGLE) {
        triangle.rotation = (triangle.rotation + triangle.rotationSpeed) % (Math.PI * 2);
        const distance = (5000 - (triangle.deleteTime - game.state.time)) / 50;
        triangle.x = triangle.centerPos.x + Math.sin(distance / 10) * distance;
        triangle.y = triangle.centerPos.y + Math.cos(distance / 10) * distance;
    }

    if (triangle.nextTickTime === undefined) triangle.nextTickTime = game.state.time + triangle.tickInterval;
    if (triangle.nextTickTime <= game.state.time) {
        let center: Position = triangleCenter(triangle);
        detectCircleCharacterHit(game.state.map, center, TRIANGLESIZE / 2, triangle.faction, triangle.abilityRefId!, triangle.damage, [], game.state.bossStuff.bosses, game);
        triangle.nextTickTime += triangle.tickInterval;
        if (triangle.nextTickTime <= game.state.time) {
            triangle.nextTickTime = game.state.time + triangle.tickInterval;
        }
    }
}

function triangleCenter(triangle: AbilityObjectPetPainterTriangle): Position {
    const sideLength = TRIANGLESIZE;
    const halfSideLength = sideLength / 2;
    const p2 = {x: triangle.x , y: triangle.y};
    moveByDirectionAndDistance(p2, triangle.rotation, TRIANGLESIZE, false);
    const p3 = {x: p2.x , y: p2.y};
    moveByDirectionAndDistance(p2, triangle.rotation + Math.PI * 2 / 3, TRIANGLESIZE, false);    
    const centerX = (triangle.x + p2.x + p3.x) / 3;
    const centerY = (triangle.y + p2.y + p3.y) / 3;
    return { x: centerX, y: centerY };
}

function paintShapeObjectPetPainterTriangle(ctx: CanvasRenderingContext2D, abilityObject: AbilityObjectPetPainter, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "beforeCharacterPaint") return;
    const cameraPosition = getCameraPosition(game);
    if (abilityObject.subType === PET_PAINTER_TRIANGLE) {
        const triangle = abilityObject as AbilityObjectPetPainterTriangle;
        let paintPos = getPointPaintPosition(ctx, triangle, cameraPosition);
        ctx.fillStyle = triangle.color;
        ctx.strokeStyle = triangle.color;
        ctx.beginPath();
        ctx.moveTo(paintPos.x, paintPos.y);
        moveByDirectionAndDistance(paintPos, triangle.rotation, TRIANGLESIZE, false);
        ctx.lineTo(paintPos.x, paintPos.y);
        moveByDirectionAndDistance(paintPos, triangle.rotation + Math.PI * 2 / 3, TRIANGLESIZE, false);
        ctx.lineTo(paintPos.x, paintPos.y);
        ctx.fill();
    }
}

function paintShapeTriangle(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: AbilityPetPainter, cameraPosition: Position, game: Game) {
    if (ability.currentlyPainting === PET_PAINTER_TRIANGLE) {
        if (!ability.paintPoints || ability.paintPoints.length === 0) return;
        const start = getPointPaintPosition(ctx, ability.paintPoints[0], cameraPosition);
        ctx.fillStyle = "red";
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
}

function getRandomStartPaintPositionTriangle(pet: TamerPetCharacter, game: Game): Position {
    let petOwner: Character = findPetOwnerInPlayers(pet, game)!;
    let blocking = true;
    let position = { x: 0, y: 0 };
    do {
        const randomOffsetX = nextRandom(game.state.randomSeed) * 100 - 60;
        const randomOffsetY = nextRandom(game.state.randomSeed) * 100 - 60;
        position = { x: petOwner.x + randomOffsetX, y: petOwner.y + randomOffsetY };
        blocking = isPositionBlocking(position, game.state.map, game.state.idCounter);
        if (!blocking) {
            let tempPosition = { x: position.x, y: position.y };
            let direction = 0;
            moveByDirectionAndDistance(tempPosition, direction, TRIANGLESIZE, false);
            blocking = isPositionBlocking(tempPosition, game.state.map, game.state.idCounter);
            if (!blocking) {
                direction += Math.PI * 2 / 3;
                moveByDirectionAndDistance(tempPosition, direction, TRIANGLESIZE, false);
                blocking = isPositionBlocking(tempPosition, game.state.map, game.state.idCounter);
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
                const damage = abilityPetPainter.baseDamage * pet.sizeFactor * TRIANGLE_DAMAGE_FACTOR;
                const obj = createAbilityObjectPetPainterTriangle(abilityPetPainter.paintPoints![0], damage, abilityPetPainter.id, pet.faction, game.state.time);
                game.state.abilityObjects.push(obj);
                break;
        }
    } else if (distance > 150) {
        abilityPetPainter.currentlyPainting = undefined;
    }
}