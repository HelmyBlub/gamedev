import { Character } from "../../character/characterModel.js";
import { TamerPetCharacter, findPetOwnerInPlayers } from "../../character/playerCharacters/tamerPetCharacter.js";
import { calculateDistance, getCameraPosition } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { isPositionBlocking, moveByDirectionAndDistance } from "../../map/map.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { AbilityObject, AbilityOwner, PaintOrderAbility } from "../ability.js";
import { ABILITY_NAME_PET_PAINTER, ABILITY_PET_PAINTER_SHAPES_FUNCTIONS, AbilityObjectPetPainter, AbilityPetPainter } from "./abilityPetPainter.js";

export type AbilityObjectPetPainterTriangle = AbilityObjectPetPainter & {
    tickInterval: number,
    nextTickTime?: number,
    rotation: number,
    rotationSpeed: number,
    range: number,
}

const TRIANGESIZE = 30;
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
        deleteTime: gameTime + 2500,
        subType: PET_PAINTER_TRIANGLE,
        abilityRefId: abilityRefId,
        tickInterval: 100,
        range: 50,
        rotation: 0,
        rotationSpeed: 0.1,
    }

    return abilityObjectPetPainter;
}

function initShapePaintTriangle(pet: TamerPetCharacter, ability: AbilityPetPainter, game: Game){
    ability.currentlyPainting = PET_PAINTER_TRIANGLE;
    ability.paintPoints = [];
    pet.forcedMovePosition = getRandomStartPaintPositionTriangle(pet, game);
}

function tickShapeObjectPetPainterTriangle(abilityObject: AbilityObjectPetPainter, game: Game) {
    if (abilityObject.subType === PET_PAINTER_TRIANGLE) {
        const triangle = abilityObject as AbilityObjectPetPainterTriangle;
        triangle.rotation = (triangle.rotation + triangle.rotationSpeed) % (Math.PI * 2);
    }
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
        moveByDirectionAndDistance(paintPos, triangle.rotation, TRIANGESIZE, false);
        ctx.lineTo(paintPos.x, paintPos.y);
        moveByDirectionAndDistance(paintPos, triangle.rotation + Math.PI * 2 / 3, TRIANGESIZE, false);
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
            moveByDirectionAndDistance(tempPosition, direction, TRIANGESIZE, false);
            blocking = isPositionBlocking(tempPosition, game.state.map, game.state.idCounter);
            if (!blocking) {
                direction += Math.PI * 2 / 3;
                moveByDirectionAndDistance(tempPosition, direction, TRIANGESIZE, false);
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
                moveByDirectionAndDistance(nextPosition, 0, TRIANGESIZE, false);
                pet.forcedMovePosition = nextPosition;
                break;
            case 1:
                abilityPetPainter.paintPoints!.push(targetPos);
                nextPosition = { x: targetPos.x, y: targetPos.y };
                moveByDirectionAndDistance(nextPosition, Math.PI * 2 / 3, TRIANGESIZE, false);
                pet.forcedMovePosition = nextPosition;
                break;
            case 2:
                abilityPetPainter.paintPoints!.push(targetPos);
                nextPosition = { x: targetPos.x, y: targetPos.y };
                moveByDirectionAndDistance(nextPosition, Math.PI * 2 / 3 * 2, TRIANGESIZE, false);
                pet.forcedMovePosition = nextPosition;
                break;
            case 3:
                abilityPetPainter.currentlyPainting = undefined;
                pet.forcedMovePosition = undefined;
                const obj = createAbilityObjectPetPainterTriangle(abilityPetPainter.paintPoints![0], abilityPetPainter.baseDamage, abilityPetPainter.id, pet.faction, game.state.time);
                game.state.abilityObjects.push(obj);
                break;
        }
    } else if (distance > 150) {
        abilityPetPainter.currentlyPainting = undefined;
    }
}