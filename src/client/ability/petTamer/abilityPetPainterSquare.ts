import { characterTakeDamage, determineCharactersInDistance } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { TamerPetCharacter, findPetOwner } from "../../character/playerCharacters/tamer/tamerPetCharacter.js";
import { calculateDistance, getCameraPosition } from "../../game.js";
import { FACTION_ENEMY, FACTION_PLAYER, Game, Position } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { isPositionBlocking } from "../../map/map.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { AbilityObject, AbilityOwner, PaintOrderAbility } from "../ability.js";
import { ABILITY_NAME_PET_PAINTER, ABILITY_PET_PAINTER_SHAPES_FUNCTIONS, AbilityObjectPetPainter, AbilityPetPainter, createShapeAbilityPetPainter } from "./abilityPetPainter.js";
import { ABILITY_PET_PAINTER_UPGRADE_FACTORY, AbilityPetPainterUpgradeFactory } from "./abilityPetPainterUpgradeFactory.js";
import { AbilityPetPainterUpgradeSplit } from "./abilityPetPainterUpgradeSplit.js";


export type AbilityObjectPetPainterSquare = AbilityObjectPetPainter & {
    size: number,
    range: number,
    damageDone: boolean,
    tickInterval?: number,
    nextTickTime?: number,
}

const FADETIME = 500;
const SQUARESIZE = 30;
const SQUARE_DAMAGE_FACTOR = 10;
const PET_PAINTER_SQUARE = "Square";

export function addAbilityPetPainterSquare() {
    ABILITY_PET_PAINTER_SHAPES_FUNCTIONS[PET_PAINTER_SQUARE] = {
        createShape: createShapeSquare,
        createSplitShape: createSplitShape,
        paintShape: paintShapeSquare,
        paintShapeObject: paintShapeObjectPetPainterSquare,
        tickShape: tickSquare,
        tickShapeObject: tickShapeObjectPetPainterSquare,
        initShapePaint: initShapePaintSquare,
    }
}

function createAbilityObjectPetPainterSquare(
    position: Position,
    size: number,
    damage: number,
    abilityRefId: number,
    faction: string,
    range: number,
    gameTime: number
): AbilityObjectPetPainter {
    const abilityObjectPetPainter: AbilityObjectPetPainterSquare = {
        type: ABILITY_NAME_PET_PAINTER,
        size: size,
        color: "red",
        x: position.x,
        y: position.y,
        damage: damage,
        faction: faction,
        range: range,
        deleteTime: gameTime + FADETIME,
        damageDone: false,
        subType: PET_PAINTER_SQUARE,
        abilityRefId: abilityRefId,
    }
    if (faction === FACTION_ENEMY) {
        abilityObjectPetPainter.color = "black";
    }
    return abilityObjectPetPainter;
}

function createAbilityObjectPetPainterSquareFactory(
    position: Position,
    size: number,
    damage: number,
    abilityRefId: number,
    faction: string,
    range: number,
    duration: number,
    spawnInterval: number,
    gameTime: number
): AbilityObjectPetPainter {
    const abilityObjectPetPainter: AbilityObjectPetPainterSquare = {
        type: ABILITY_NAME_PET_PAINTER,
        size: size,
        color: "red",
        x: position.x,
        y: position.y,
        damage: damage,
        faction: faction,
        range: range,
        deleteTime: gameTime + duration * 2,
        damageDone: false,
        subType: PET_PAINTER_SQUARE,
        abilityRefId: abilityRefId,
        tickInterval: spawnInterval * 2,
        isFactory: true,
    }
    if (faction === FACTION_ENEMY) {
        abilityObjectPetPainter.color = "black";
    }
    return abilityObjectPetPainter;
}

function createSplitShape(abilityObject: AbilityObjectPetPainter, upgrade: AbilityPetPainterUpgradeSplit, game: Game): AbilityObjectPetPainter {
    const square = abilityObject as AbilityObjectPetPainterSquare;
    const random = Math.floor(nextRandom(game.state.randomSeed) * 4);
    const position: Position = { x: square.x + square.size / 4, y: square.y + square.size / 4 };
    switch (random) {
        case 0:
            position.x += square.range;
            break;
        case 1:
            position.x -= square.range;
            break;
        case 2:
            position.y += square.range;
            break;
        case 3:
            position.y -= square.range;
            break;
    }
    return createAbilityObjectPetPainterSquare(
        position,
        square.size / 2,
        square.damage * upgrade.damageFactor,
        square.abilityRefId!,
        square.faction,
        square.range / 2,
        game.state.time
    );
}

function createShapeSquare(pet: TamerPetCharacter, abilityPetPainter: AbilityPetPainter, game: Game): AbilityObject {
    const range = 200;
    const damage = abilityPetPainter.baseDamage * pet.sizeFactor * SQUARE_DAMAGE_FACTOR;
    const factoryUpgrade = abilityPetPainter.upgrades[ABILITY_PET_PAINTER_UPGRADE_FACTORY] as AbilityPetPainterUpgradeFactory;
    if (factoryUpgrade) {
        return createAbilityObjectPetPainterSquareFactory(abilityPetPainter.paintPoints![0], SQUARESIZE, damage, abilityPetPainter.id, pet.faction, range, factoryUpgrade.duration, factoryUpgrade.spawnInterval, game.state.time);
    } else {
        return createAbilityObjectPetPainterSquare(abilityPetPainter.paintPoints![0], SQUARESIZE, damage, abilityPetPainter.id, pet.faction, range, game.state.time);
    }
}

function initShapePaintSquare(pet: TamerPetCharacter, ability: AbilityPetPainter, game: Game) {
    pet.forcedMovePosition = getRandomStartPaintPositionSquare(pet, game);
    if(!pet.forcedMovePosition) return;
    ability.currentlyPainting = PET_PAINTER_SQUARE;
    ability.paintPoints = [];
}

function tickShapeObjectPetPainterSquare(abilityObject: AbilityObjectPetPainter, game: Game) {
    if (abilityObject.isFactory) {
        const factory = abilityObject as AbilityObjectPetPainterSquare;
        if (factory.nextTickTime === undefined) factory.nextTickTime = game.state.time + factory.tickInterval!;
        if (factory.nextTickTime <= game.state.time) {
            const shape = createAbilityObjectPetPainterSquare(factory, factory.size, factory.damage, factory.abilityRefId!, factory.faction, factory.range, game.state.time);
            game.state.abilityObjects.push(shape);
            factory.nextTickTime += factory.tickInterval!;
            if (factory.nextTickTime <= game.state.time) {
                factory.nextTickTime = game.state.time + factory.tickInterval!;
            }
        }
    } else {
        detectSquareToCharacterHit(abilityObject as AbilityObjectPetPainterSquare, game);
    }
}

function detectSquareToCharacterHit(petPainter: AbilityObjectPetPainterSquare, game: Game) {
    if (petPainter.damageDone) return;
    petPainter.damageDone = true;
    const maxEnemySizeEstimate = 40;
    const characters = determineCharactersInDistance(petPainter, game.state.map, [], game.state.bossStuff.bosses, petPainter.size + petPainter.range + maxEnemySizeEstimate);
    for (let charIt = characters.length - 1; charIt >= 0; charIt--) {
        const c = characters[charIt];
        if (c.isDead || c.faction === petPainter.faction) continue;
        let getHit = false;
        if (c.x >= petPainter.x - petPainter.range && c.x <= petPainter.x + petPainter.size + petPainter.range
            && c.y >= petPainter.y && c.y <= petPainter.y + petPainter.size) {
            getHit = true; //horizintal
        } else if (c.y >= petPainter.y - petPainter.range && c.y <= petPainter.y + petPainter.size + petPainter.range
            && c.x >= petPainter.x && c.x <= petPainter.x + petPainter.size) {
            getHit = true; //vertical
        }
        if (getHit) {
            characterTakeDamage(c, petPainter.damage, game, petPainter.abilityRefId);
        }
    }
}

function paintShapeObjectPetPainterSquare(ctx: CanvasRenderingContext2D, abilityObject: AbilityObjectPetPainter, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "beforeCharacterPaint") return;
    const cameraPosition = getCameraPosition(game);
    const square = abilityObject as AbilityObjectPetPainterSquare;
    const paintPos = getPointPaintPosition(ctx, square, cameraPosition);
    ctx.fillStyle = abilityObject.color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = (square.deleteTime - game.state.time) / FADETIME;
    if(abilityObject.faction === FACTION_PLAYER) ctx.globalAlpha *= game.UI.playerGlobalAlphaMultiplier;
    if (square.isFactory) {
        ctx.rect(paintPos.x, paintPos.y, square.size, square.size);
        ctx.stroke();
    } else {
        ctx.fillRect(paintPos.x - square.range, paintPos.y, square.size + square.range * 2, square.size);
        ctx.fillRect(paintPos.x, paintPos.y - square.range, square.size, square.size + square.range * 2);
    }
    ctx.globalAlpha = 1;
}

function paintShapeSquare(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: AbilityPetPainter, cameraPosition: Position, game: Game) {
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

function getRandomStartPaintPositionSquare(pet: TamerPetCharacter, game: Game): Position | undefined{
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
            blocking = isPositionBlocking({ x: position.x + SQUARESIZE, y: position.y }, game.state.map, game.state.idCounter, game);
            if (!blocking) {
                blocking = isPositionBlocking({ x: position.x + SQUARESIZE, y: position.y + SQUARESIZE }, game.state.map, game.state.idCounter, game);
                if (!blocking) {
                    blocking = isPositionBlocking({ x: position.x, y: position.y + SQUARESIZE }, game.state.map, game.state.idCounter, game);
                }
            }
        }
    } while (blocking);
    return position;
}

function tickSquare(pet: TamerPetCharacter, abilityPetPainter: AbilityPetPainter, game: Game) {
    const targetPos = pet.forcedMovePosition!;
    const distance = calculateDistance(pet, targetPos);
    if (distance < pet.moveSpeed) {
        switch (abilityPetPainter.paintPoints!.length) {
            case 0:
                abilityPetPainter.paintPoints!.push(targetPos);
                pet.forcedMovePosition = { x: targetPos.x + SQUARESIZE, y: targetPos.y };
                break;
            case 1:
                abilityPetPainter.paintPoints!.push(targetPos);
                pet.forcedMovePosition = { x: targetPos.x, y: targetPos.y + SQUARESIZE };
                break;
            case 2:
                abilityPetPainter.paintPoints!.push(targetPos);
                pet.forcedMovePosition = { x: targetPos.x - SQUARESIZE, y: targetPos.y };
                break;
            case 3:
                abilityPetPainter.paintPoints!.push(targetPos);
                pet.forcedMovePosition = { x: targetPos.x, y: targetPos.y - SQUARESIZE };
                break;
            case 4:
                abilityPetPainter.currentlyPainting = undefined;
                pet.forcedMovePosition = undefined;
                createShapeAbilityPetPainter(PET_PAINTER_SQUARE, pet, abilityPetPainter, game);
                break;
        }
    } else if (distance > 150) {
        abilityPetPainter.currentlyPainting = undefined;
    }
}
