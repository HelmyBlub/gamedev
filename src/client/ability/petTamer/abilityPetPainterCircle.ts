import { Character } from "../../character/characterModel.js";
import { TamerPetCharacter, findPetOwnerInPlayers } from "../../character/playerCharacters/tamerPetCharacter.js";
import { calculateDistance, getCameraPosition } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { calculateMovePosition, isPositionBlocking, calculateBounceAngle } from "../../map/map.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { AbilityObject, AbilityObjectCircle, AbilityOwner, PaintOrderAbility, detectAbilityObjectCircleToCharacterHit } from "../ability.js";
import { ABILITY_NAME_PET_PAINTER, ABILITY_PET_PAINTER_SHAPES_FUNCTIONS, AbilityObjectPetPainter, AbilityPetPainter, createShapeAbilityPetPainter } from "./abilityPetPainter.js";

export type AbilityObjectPetPainterCircle = AbilityObjectPetPainter & AbilityObjectCircle & {
    tickInterval: number,
    nextTickTime?: number,
    direction: number,
    moveSpeed: number,
}

const PET_PAINTER_CIRCLE = "Circle";
const CIRCLE_DAMAGE_FACTOR = 1;
const CIRCLERADIUS = 15;

export function addAbilityPetPainterCircle() {
    ABILITY_PET_PAINTER_SHAPES_FUNCTIONS[PET_PAINTER_CIRCLE] = {
        createShape: createShapeCircle,
        paintShape: paintShapeCircle,
        paintShapeObject: paintShapeObjectPetPainterCircle,
        tickShape: tickCircle,
        tickShapeObject: tickShapeObjectPetPainterCircle,
        initShapePaint: initShapePaintCircle,
    }
}

function createAbilityObjectPetPainterCircle(
    position: Position,
    damage: number,
    abilityRefId: number,
    faction: string,
    radius: number,
    rollDirection: number,
    gameTime: number
): AbilityObjectPetPainter {
    let abilityObjectPetPainter: AbilityObjectPetPainterCircle = {
        type: ABILITY_NAME_PET_PAINTER,
        color: "red",
        x: position.x,
        y: position.y,
        damage: damage,
        faction: faction,
        deleteTime: gameTime + 5000,
        subType: PET_PAINTER_CIRCLE,
        abilityRefId: abilityRefId,
        radius: radius,
        direction: rollDirection,
        moveSpeed: 4,
        tickInterval: 100,
    }

    return abilityObjectPetPainter;
}

function createShapeCircle(pet: TamerPetCharacter, abilityPetPainter: AbilityPetPainter, game: Game): AbilityObject{
    const randomDirection = nextRandom(game.state.randomSeed) * Math.PI * 2;
    const damage = abilityPetPainter.baseDamage * pet.sizeFactor * CIRCLE_DAMAGE_FACTOR;
    return createAbilityObjectPetPainterCircle(abilityPetPainter.paintCircle!.middle, damage, abilityPetPainter.id, pet.faction, CIRCLERADIUS, randomDirection, game.state.time);
}

function initShapePaintCircle(pet: TamerPetCharacter, ability: AbilityPetPainter, game: Game){
    ability.currentlyPainting = PET_PAINTER_CIRCLE;
    const startPoint = getRandomStartPaintPositionCircle(pet, game);
    ability.paintCircle = {
        middle: { x: startPoint.x, y: startPoint.y },
        currentAngle: 0,
    };
    pet.forcedMovePosition = { x: startPoint.x, y: startPoint.y - CIRCLERADIUS };
}

function tickShapeObjectPetPainterCircle(abilityObject: AbilityObjectPetPainter, game: Game) {
    if (abilityObject.subType === PET_PAINTER_CIRCLE) {
        const circle = abilityObject as AbilityObjectPetPainterCircle;
        let newPosition = calculateMovePosition(circle, circle.direction, circle.moveSpeed, false);
        if (isPositionBlocking(newPosition, game.state.map, game.state.idCounter)) {
            circle.direction = calculateBounceAngle(newPosition, circle.direction, game.state.map);
        } else {
            circle.x = newPosition.x;
            circle.y = newPosition.y;
        }

        if (circle.nextTickTime === undefined) circle.nextTickTime = game.state.time + circle.tickInterval;
        if (circle.nextTickTime <= game.state.time) {
            detectAbilityObjectCircleToCharacterHit(game.state.map, circle, [], game.state.bossStuff.bosses, game);
            circle.nextTickTime += circle.tickInterval;
            if (circle.nextTickTime <= game.state.time) {
                circle.nextTickTime = game.state.time + circle.tickInterval;
            }
        }
    }
}

function paintShapeObjectPetPainterCircle(ctx: CanvasRenderingContext2D, abilityObject: AbilityObjectPetPainter, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "beforeCharacterPaint") return;
    const cameraPosition = getCameraPosition(game);
    if (abilityObject.subType === PET_PAINTER_CIRCLE) {
        const circle = abilityObject as AbilityObjectPetPainterCircle;
        const paintPos = getPointPaintPosition(ctx, circle, cameraPosition);
        ctx.fillStyle = circle.color;
        ctx.strokeStyle = circle.color;
        ctx.beginPath();
        ctx.arc(paintPos.x, paintPos.y, circle.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function paintShapeCircle(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: AbilityPetPainter, cameraPosition: Position, game: Game) {
    if (ability.currentlyPainting === PET_PAINTER_CIRCLE) {
        if (!ability.paintCircle) return;
        const middle = getPointPaintPosition(ctx, ability.paintCircle.middle, cameraPosition);
        ctx.fillStyle = "red";
        ctx.strokeStyle = "red";
        ctx.beginPath();
        ctx.arc(middle.x, middle.y, CIRCLERADIUS, -Math.PI / 2, ability.paintCircle.currentAngle - Math.PI / 2);
        ctx.stroke();
    }
}

function getRandomStartPaintPositionCircle(pet: TamerPetCharacter, game: Game): Position {
    let petOwner: Character = findPetOwnerInPlayers(pet, game)!;
    let blocking = true;
    let position = { x: 0, y: 0 };
    do {
        const randomOffsetX = nextRandom(game.state.randomSeed) * 100 - 60;
        const randomOffsetY = nextRandom(game.state.randomSeed) * 100 - 60;
        position = { x: petOwner.x + randomOffsetX, y: petOwner.y + randomOffsetY };
        const centerTilePosX = Math.floor(position.x / game.state.map.tileSize) * game.state.map.tileSize + Math.floor(game.state.map.tileSize / 2);
        const centerTilePosY = Math.floor(position.y / game.state.map.tileSize) * game.state.map.tileSize + Math.floor(game.state.map.tileSize / 2);
        position = { x: centerTilePosX, y: centerTilePosY };
        blocking = isPositionBlocking(position, game.state.map, game.state.idCounter);
    } while (blocking);
    return position;
}

function tickCircle(pet: TamerPetCharacter, abilityPetPainter: AbilityPetPainter, game: Game) {
    const targetPos = pet.forcedMovePosition!;
    const distance = calculateDistance(pet, targetPos);
    if (distance < pet.moveSpeed) {
        abilityPetPainter.paintCircle!.currentAngle += Math.PI / 10;
        const angle = abilityPetPainter.paintCircle!.currentAngle;
        if (angle > Math.PI * 2) {
            abilityPetPainter.currentlyPainting = undefined;
            pet.forcedMovePosition = undefined;
            createShapeAbilityPetPainter(PET_PAINTER_CIRCLE, pet, abilityPetPainter, game);
        } else {
            let nextPosition: Position = {
                x: abilityPetPainter.paintCircle!.middle.x + Math.sin(angle) * CIRCLERADIUS,
                y: abilityPetPainter.paintCircle!.middle.y - Math.cos(angle) * CIRCLERADIUS
            }
            pet.forcedMovePosition = nextPosition;
        }
    } else if (distance > 150) {
        abilityPetPainter.currentlyPainting = undefined;
    }
}

