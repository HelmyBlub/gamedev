import { characterTakeDamage, determineCharactersInDistance } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { TamerPetCharacter, findPetOwnerInPlayers } from "../../character/playerCharacters/tamerPetCharacter.js";
import { calculateDistance, getCameraPosition } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { isPositionBlocking } from "../../map/map.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { AbilityOwner, PaintOrderAbility } from "../ability.js";
import { ABILITY_NAME_PET_PAINTER, ABILITY_PET_PAINTER_SHAPES_FUNCTIONS, AbilityObjectPetPainter, AbilityPetPainter } from "./abilityPetPainter.js";


export type AbilityObjectPetPainterSquare = AbilityObjectPetPainter & {
    size: number,
    range: number,
    damageDone: boolean,
}

const FADETIME = 500;
const SQUARESIZE = 30;
const SQUARE_DAMAGE_FACTOR = 5;
const PET_PAINTER_SQUARE = "Square";

export function addAbilityPetPainterSquare() {
    ABILITY_PET_PAINTER_SHAPES_FUNCTIONS[PET_PAINTER_SQUARE] = {
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
    let abilityObjectPetPainter: AbilityObjectPetPainterSquare = {
        type: ABILITY_NAME_PET_PAINTER,
        size: size,
        color: "",
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

    return abilityObjectPetPainter;
}

function initShapePaintSquare(pet: TamerPetCharacter, ability: AbilityPetPainter, game: Game){
    ability.currentlyPainting = PET_PAINTER_SQUARE;
    ability.paintPoints = [];
    pet.forcedMovePosition = getRandomStartPaintPositionSquare(pet, game);
}

function tickShapeObjectPetPainterSquare(abilityObject: AbilityObjectPetPainter, game: Game) {
    if (abilityObject.subType === PET_PAINTER_SQUARE) {
        detectSquareToCharacterHit(abilityObject as AbilityObjectPetPainterSquare, game);
    }
}

function detectSquareToCharacterHit(petPainter: AbilityObjectPetPainterSquare, game: Game) {
    if (petPainter.damageDone) return;
    petPainter.damageDone = true;
    let maxEnemySizeEstimate = 40;
    let characters = determineCharactersInDistance(petPainter, game.state.map, [], game.state.bossStuff.bosses, petPainter.size + petPainter.range + maxEnemySizeEstimate);
    for (let charIt = characters.length - 1; charIt >= 0; charIt--) {
        let c = characters[charIt];
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
    if (abilityObject.subType === PET_PAINTER_SQUARE) {
        const square = abilityObject as AbilityObjectPetPainterSquare;
        const paintPos = getPointPaintPosition(ctx, square, cameraPosition);
        ctx.fillStyle = "red";
        ctx.globalAlpha = (square.deleteTime - game.state.time) / FADETIME;
        ctx.fillRect(paintPos.x - square.range, paintPos.y, square.size + square.range * 2, square.size);
        ctx.fillRect(paintPos.x, paintPos.y - square.range, square.size, square.size + square.range * 2);
        ctx.globalAlpha = 1;
    }
}

function paintShapeSquare(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: AbilityPetPainter, cameraPosition: Position, game: Game) {
    if (ability.currentlyPainting === PET_PAINTER_SQUARE) {
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

function getRandomStartPaintPositionSquare(pet: TamerPetCharacter, game: Game): Position {
    let petOwner: Character = findPetOwnerInPlayers(pet, game)!;
    let blocking = true;
    let position = { x: 0, y: 0 };
    do {
        const randomOffsetX = nextRandom(game.state.randomSeed) * 100 - 60;
        const randomOffsetY = nextRandom(game.state.randomSeed) * 100 - 60;
        position = { x: petOwner.x + randomOffsetX, y: petOwner.y + randomOffsetY };
        blocking = isPositionBlocking(position, game.state.map, game.state.idCounter);
        if (!blocking) {
            blocking = isPositionBlocking({ x: position.x + SQUARESIZE, y: position.y }, game.state.map, game.state.idCounter);
            if (!blocking) {
                blocking = isPositionBlocking({ x: position.x + SQUARESIZE, y: position.y + SQUARESIZE }, game.state.map, game.state.idCounter);
                if (!blocking) {
                    blocking = isPositionBlocking({ x: position.x, y: position.y + SQUARESIZE }, game.state.map, game.state.idCounter);
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
                const range = 200;
                const damage = abilityPetPainter.baseDamage * pet.sizeFactor * SQUARE_DAMAGE_FACTOR;
                const obj = createAbilityObjectPetPainterSquare(abilityPetPainter.paintPoints![0], SQUARESIZE, damage, abilityPetPainter.id, pet.faction, range, game.state.time);
                game.state.abilityObjects.push(obj);
                break;
        }
    } else if (distance > 150) {
        abilityPetPainter.currentlyPainting = undefined;
    }
}
