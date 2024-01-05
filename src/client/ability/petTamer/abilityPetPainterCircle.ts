import { Character } from "../../character/characterModel.js";
import { TamerPetCharacter, findPetOwner } from "../../character/playerCharacters/tamer/tamerPetCharacter.js";
import { calculateDistance, getCameraPosition } from "../../game.js";
import { FACTION_ENEMY, FACTION_PLAYER, Game, Position } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { calculateBounceAngle, calculateMovePosition, isPositionBlocking } from "../../map/map.js";
import { RandomSeed, nextRandom } from "../../randomNumberGenerator.js";
import { AbilityObject, AbilityObjectCircle, AbilityOwner, PaintOrderAbility, detectAbilityObjectCircleToCharacterHit } from "../ability.js";
import { ABILITY_NAME_PET_PAINTER, ABILITY_PET_PAINTER_SHAPES_FUNCTIONS, AbilityObjectPetPainter, AbilityPetPainter, createShapeAbilityPetPainter } from "./abilityPetPainter.js";
import { ABILITY_PET_PAINTER_UPGRADE_FACTORY, AbilityPetPainterUpgradeFactory } from "./abilityPetPainterUpgradeFactory.js";
import { AbilityPetPainterUpgradeSplit } from "./abilityPetPainterUpgradeSplit.js";

export type AbilityObjectPetPainterCircle = AbilityObjectPetPainter & AbilityObjectCircle & {
    tickInterval: number,
    nextTickTime?: number,
    direction: number,
    moveSpeed: number,
}

const PET_PAINTER_CIRCLE = "Circle";
const CIRCLE_DAMAGE_FACTOR = 1;
const DURATION = 7000;
const CIRCLERADIUS = 15;

export function addAbilityPetPainterCircle() {
    ABILITY_PET_PAINTER_SHAPES_FUNCTIONS[PET_PAINTER_CIRCLE] = {
        createShape: createShapeCircle,
        createSplitShape: createSplitShape,
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
    abilityIdRef: number,
    faction: string,
    radius: number,
    randomSeed: RandomSeed,
    gameTime: number
): AbilityObjectPetPainter {
    const abilityObjectPetPainter: AbilityObjectPetPainterCircle = {
        type: ABILITY_NAME_PET_PAINTER,
        color: "red",
        x: position.x,
        y: position.y,
        damage: damage,
        faction: faction,
        deleteTime: gameTime + DURATION,
        subType: PET_PAINTER_CIRCLE,
        abilityIdRef: abilityIdRef,
        radius: radius,
        direction: nextRandom(randomSeed) * Math.PI * 2,
        moveSpeed: 4,
        tickInterval: 100,
    }

    if (faction === FACTION_ENEMY) {
        abilityObjectPetPainter.color = "black";
    }

    return abilityObjectPetPainter;
}

function createAbilityObjectPetPainterCircleFactory(
    position: Position,
    damage: number,
    abilityIdRef: number,
    faction: string,
    radius: number,
    duration: number,
    spawnInterval: number,
    gameTime: number
): AbilityObjectPetPainter {
    const abilityObjectPetPainter: AbilityObjectPetPainterCircle = {
        type: ABILITY_NAME_PET_PAINTER,
        color: "red",
        x: position.x,
        y: position.y,
        damage: damage,
        faction: faction,
        deleteTime: gameTime + duration,
        subType: PET_PAINTER_CIRCLE,
        abilityIdRef: abilityIdRef,
        radius: radius,
        direction: 0,
        moveSpeed: 4,
        tickInterval: spawnInterval,
        isFactory: true,
    }

    return abilityObjectPetPainter;
}

function createSplitShape(abilityObject: AbilityObjectPetPainter, upgrade: AbilityPetPainterUpgradeSplit, game: Game): AbilityObjectPetPainter {
    const circle = abilityObject as AbilityObjectPetPainterCircle;
    return createAbilityObjectPetPainterCircle(
        circle,
        circle.damage * upgrade.damageFactor,
        circle.abilityIdRef!,
        circle.faction,
        circle.radius / 2,
        game.state.randomSeed,
        game.state.time
    );
}

function createShapeCircle(pet: TamerPetCharacter, abilityPetPainter: AbilityPetPainter, game: Game): AbilityObject {
    const damage = abilityPetPainter.baseDamage * pet.sizeFactor * CIRCLE_DAMAGE_FACTOR;
    const factoryUpgrade = abilityPetPainter.upgrades[ABILITY_PET_PAINTER_UPGRADE_FACTORY] as AbilityPetPainterUpgradeFactory;
    if (factoryUpgrade) {
        return createAbilityObjectPetPainterCircleFactory(abilityPetPainter.paintCircle!.middle, damage, abilityPetPainter.id, pet.faction, CIRCLERADIUS, factoryUpgrade.duration, factoryUpgrade.spawnInterval, game.state.time);
    } else {
        return createAbilityObjectPetPainterCircle(abilityPetPainter.paintCircle!.middle, damage, abilityPetPainter.id, pet.faction, CIRCLERADIUS, game.state.randomSeed, game.state.time);
    }
}

function initShapePaintCircle(pet: TamerPetCharacter, ability: AbilityPetPainter, game: Game) {
    const startPoint = getRandomStartPaintPositionCircle(pet, game);
    if(!startPoint) return;
    ability.currentlyPainting = PET_PAINTER_CIRCLE;
    ability.paintCircle = {
        middle: { x: startPoint.x, y: startPoint.y },
        currentAngle: 0,
    };
    pet.forcedMovePosition = { x: startPoint.x, y: startPoint.y - CIRCLERADIUS };
}

function tickShapeObjectPetPainterCircle(abilityObject: AbilityObjectPetPainter, game: Game) {
    if (abilityObject.isFactory) {
        const circleFactory = abilityObject as AbilityObjectPetPainterCircle;
        if (circleFactory.nextTickTime === undefined) circleFactory.nextTickTime = game.state.time + circleFactory.tickInterval;
        if (circleFactory.nextTickTime <= game.state.time) {
            const shape = createAbilityObjectPetPainterCircle(circleFactory, circleFactory.damage, circleFactory.abilityIdRef!, circleFactory.faction, circleFactory.radius, game.state.randomSeed, game.state.time);
            game.state.abilityObjects.push(shape);
            circleFactory.nextTickTime += circleFactory.tickInterval;
            if (circleFactory.nextTickTime <= game.state.time) {
                circleFactory.nextTickTime = game.state.time + circleFactory.tickInterval;
            }
        }
    } else {
        const circle = abilityObject as AbilityObjectPetPainterCircle;
        const newPosition = calculateMovePosition(circle, circle.direction, circle.moveSpeed, false);
        if (isPositionBlocking(newPosition, game.state.map, game.state.idCounter, game)) {
            circle.direction = calculateBounceAngle(circle, circle.direction, game);
        } else {
            circle.x = newPosition.x;
            circle.y = newPosition.y;
        }

        if (circle.nextTickTime === undefined) circle.nextTickTime = game.state.time + circle.tickInterval;
        if (circle.nextTickTime <= game.state.time) {
            detectAbilityObjectCircleToCharacterHit(game.state.map, circle, game);
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
    const circle = abilityObject as AbilityObjectPetPainterCircle;
    const paintPos = getPointPaintPosition(ctx, circle, cameraPosition);
    if(abilityObject.faction === FACTION_PLAYER) ctx.globalAlpha *= game.UI.playerGlobalAlphaMultiplier;
    ctx.fillStyle = circle.color;
    ctx.strokeStyle = circle.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(paintPos.x, paintPos.y, circle.radius, 0, Math.PI * 2);
    !abilityObject.isFactory ? ctx.fill() : ctx.stroke();
    ctx.globalAlpha = 1;
}

function paintShapeCircle(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: AbilityPetPainter, cameraPosition: Position, game: Game) {
    if (!ability.paintCircle) return;
    const middle = getPointPaintPosition(ctx, ability.paintCircle.middle, cameraPosition);
    ctx.fillStyle = "red";
    ctx.strokeStyle = "red";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(middle.x, middle.y, CIRCLERADIUS, -Math.PI / 2, ability.paintCircle.currentAngle - Math.PI / 2);
    ctx.stroke();
}

function getRandomStartPaintPositionCircle(pet: TamerPetCharacter, game: Game): Position | undefined{
    const petOwner: Character = findPetOwner(pet, game)!;
    if(!petOwner) return undefined;
    let blocking = true;
    let position = { x: 0, y: 0 };
    do {
        const randomOffsetX = nextRandom(game.state.randomSeed) * 100 - 60;
        const randomOffsetY = nextRandom(game.state.randomSeed) * 100 - 60;
        position = { x: petOwner.x + randomOffsetX, y: petOwner.y + randomOffsetY };
        const centerTilePosX = Math.floor(position.x / game.state.map.tileSize) * game.state.map.tileSize + Math.floor(game.state.map.tileSize / 2);
        const centerTilePosY = Math.floor(position.y / game.state.map.tileSize) * game.state.map.tileSize + Math.floor(game.state.map.tileSize / 2);
        position = { x: centerTilePosX, y: centerTilePosY };
        blocking = isPositionBlocking(position, game.state.map, game.state.idCounter, game);
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
            const nextPosition: Position = {
                x: abilityPetPainter.paintCircle!.middle.x + Math.sin(angle) * CIRCLERADIUS,
                y: abilityPetPainter.paintCircle!.middle.y - Math.cos(angle) * CIRCLERADIUS
            }
            pet.forcedMovePosition = nextPosition;
        }
    } else if (distance > 150) {
        abilityPetPainter.currentlyPainting = undefined;
    }
}

