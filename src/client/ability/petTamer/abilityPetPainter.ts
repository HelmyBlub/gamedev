import { characterTakeDamage, determineCharactersInDistance, getPlayerCharacters } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { TamerPetCharacter } from "../../character/playerCharacters/tamerPetCharacter.js";
import { calculateDistance, getCameraPosition, getNextId } from "../../game.js";
import { IdCounter, Game, Position } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { calculateBounceAngle, calculateMovePosition, isPositionBlocking } from "../../map/map.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityObjectCircle, AbilityOwner, AbilityUpgradeOption, PaintOrderAbility, detectAbilityObjectCircleToCharacterHit } from "../ability.js";

export type AbilityPetPainter = Ability & {
    baseDamage: number,
    currentlyPainting?: Shape,
    paintPoints?: Position[],
    paintCircle?: {
        middle: Position,
        currentAngle: number,
    }
}

export type AbilityObjectPetPainter = AbilityObject & {
    subType: Shape,
    deleteTime: number,
}

export type AbilityObjectPetPainterSquare = AbilityObjectPetPainter & {
    subType: "Square",
    size: number,
    range: number,
    damageDone: boolean,
}

export type AbilityObjectPetPainterCircle = AbilityObjectPetPainter & AbilityObjectCircle & {
    subType: "Circle",
    tickInterval: number,
    nextTickTime?: number,
    direction: number,
    moveSpeed: number,
}

export const ABILITY_NAME_PET_PAINTER = "Painter";
const FADETIME = 500;
const SQUARESIZE = 30;
const SQUARE_DAMAGE_FACTOR = 5;
const CIRCLE_DAMAGE_FACTOR = 1;
const CIRCLERADIUS = 15;
const PAINTER_SHAPES = ["Circle", "Square"] as const;
type Shape = typeof PAINTER_SHAPES[number];

export function addAbilityPetPainter() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_PET_PAINTER] = {
        tickAbility: tickAbilityPetPainter,
        tickAbilityObject: tickAbilityObjectPetPainter,
        createAbilityUpgradeOptions: createAbiltiyPetPainterUpgradeOptions,
        createAbility: createAbilityPetPainter,
        paintAbility: paintAbilityPetPainter,
        paintAbilityObject: paintAbilityObjectPetPainter,
        deleteAbilityObject: deleteAbilityObjectPetPainter,
        setAbilityToLevel: setAbilityPetPainterToLevel,
        isPassive: true,
    };
}

export function createAbilityPetPainter(idCounter: IdCounter): AbilityPetPainter {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_PET_PAINTER,
        baseDamage: 100,
        passive: true,
        upgrades: {},
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
        damage: damage * SQUARE_DAMAGE_FACTOR,
        faction: faction,
        range: range,
        deleteTime: gameTime + FADETIME,
        damageDone: false,
        subType: "Square",
        abilityRefId: abilityRefId,
    }

    return abilityObjectPetPainter;
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
        damage: damage * CIRCLE_DAMAGE_FACTOR,
        faction: faction,
        deleteTime: gameTime + 5000,
        subType: "Circle",
        abilityRefId: abilityRefId,
        radius: radius,
        direction: rollDirection,
        moveSpeed: 4,
        tickInterval: 100,
    }

    return abilityObjectPetPainter;
}

function setAbilityPetPainterToLevel(ability: Ability, level: number) {
    let abilityPetPainter = ability as AbilityPetPainter;
    abilityPetPainter.baseDamage = level * 100;
}

function tickAbilityObjectPetPainter(abilityObject: AbilityObject, game: Game) {
    let petPainter = abilityObject as AbilityObjectPetPainter;
    if(petPainter.subType === "Square"){
        detectAbilityObjectToCharacterHit(petPainter as AbilityObjectPetPainterSquare, game);
    }else if(petPainter.subType === "Circle"){
        const circle = petPainter as AbilityObjectPetPainterCircle;
        let newPosition = calculateMovePosition(circle, circle.direction, circle.moveSpeed, false);
        if(isPositionBlocking(newPosition, game.state.map, game.state.idCounter)){
            circle.direction = calculateBounceAngle(newPosition, circle.direction, game.state.map);
        }else{
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

function detectAbilityObjectToCharacterHit(petPainter: AbilityObjectPetPainterSquare, game: Game) {
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

function deleteAbilityObjectPetPainter(abilityObject: AbilityObject, game: Game) {
    const abilityObjectPetPainter = abilityObject as AbilityObjectPetPainter;
    return abilityObjectPetPainter.deleteTime <= game.state.time;
}

function paintAbilityObjectPetPainter(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "beforeCharacterPaint") return;
    const cameraPosition = getCameraPosition(game);
    const petPainter = abilityObject as AbilityObjectPetPainter;
    if (petPainter.subType === "Square") {
        const paintPos = getPointPaintPosition(ctx, petPainter, cameraPosition);
        const square = abilityObject as AbilityObjectPetPainterSquare;
        ctx.fillStyle = "red";
        ctx.globalAlpha = (petPainter.deleteTime - game.state.time) / FADETIME;
        ctx.fillRect(paintPos.x - square.range, paintPos.y, square.size + square.range * 2, square.size);
        ctx.fillRect(paintPos.x, paintPos.y - square.range, square.size, square.size + square.range * 2);
        ctx.globalAlpha = 1;
    }else if(petPainter.subType === "Circle"){
        const paintPos = getPointPaintPosition(ctx, petPainter, cameraPosition);
        const circle = abilityObject as AbilityObjectPetPainterCircle;
        ctx.fillStyle = circle.color;
        ctx.strokeStyle = circle.color;
        ctx.beginPath();
        ctx.arc(paintPos.x, paintPos.y, circle.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function paintAbilityPetPainter(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    let abilityPetPainter = ability as AbilityPetPainter;
    if (!abilityPetPainter.currentlyPainting) return;

    if (abilityPetPainter.currentlyPainting === "Square") {
        if (!abilityPetPainter.paintPoints || abilityPetPainter.paintPoints.length === 0) return;
        const start = getPointPaintPosition(ctx, abilityPetPainter.paintPoints[0], cameraPosition);
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        for (let i = 1; i < abilityPetPainter.paintPoints!.length; i++) {
            const nextPoint = getPointPaintPosition(ctx, abilityPetPainter.paintPoints![i], cameraPosition);
            ctx.lineTo(nextPoint.x, nextPoint.y);
        }
        const petPoint = getPointPaintPosition(ctx, abilityOwner, cameraPosition);
        ctx.lineTo(petPoint.x, petPoint.y);
        ctx.stroke();
    }else if (abilityPetPainter.currentlyPainting === "Circle") {
        if (!abilityPetPainter.paintCircle) return;
        const middle = getPointPaintPosition(ctx, abilityPetPainter.paintCircle.middle, cameraPosition);
        ctx.fillStyle = "red";
        ctx.strokeStyle = "red";
        ctx.beginPath();
        ctx.arc(middle.x, middle.y, CIRCLERADIUS, -Math.PI/2, abilityPetPainter.paintCircle.currentAngle - Math.PI/2);
        ctx.stroke();
    }
}

function createAbiltiyPetPainterUpgradeOptions(): AbilityUpgradeOption[] {
    let upgradeOptions: AbilityUpgradeOption[] = [];
    return upgradeOptions;
}

function getRandomStartPaintPosition(pet: TamerPetCharacter, shape: Shape, game: Game): Position {
    let petOwner: Character = findPetOwnerInPlayers(pet, game)!;
    let blocking = true;
    let position = { x: 0, y: 0 };
    do {
        const randomOffsetX = nextRandom(game.state.randomSeed) * 100 - 60;
        const randomOffsetY = nextRandom(game.state.randomSeed) * 100 - 60;
        position = { x: petOwner.x + randomOffsetX, y: petOwner.y + randomOffsetY };
        if (shape === "Square") {
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
        } else if (shape === "Circle") {
            const centerTilePosX = Math.floor(position.x / game.state.map.tileSize) * game.state.map.tileSize + Math.floor(game.state.map.tileSize / 2);
            const centerTilePosY = Math.floor(position.y / game.state.map.tileSize) * game.state.map.tileSize + Math.floor(game.state.map.tileSize / 2);
            position = { x: centerTilePosX, y: centerTilePosY };
            blocking = isPositionBlocking(position, game.state.map, game.state.idCounter);
        }
    } while (blocking);
    return position;
}

function findPetOwnerInPlayers(pet: TamerPetCharacter, game: Game): Character | undefined {
    let playerCharacters = getPlayerCharacters(game.state.players);
    for (let character of playerCharacters) {
        if (character.pets?.includes(pet)) {
            return character;
        }
    }
    return undefined;
}

function tickAbilityPetPainter(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityPetPainter = ability as AbilityPetPainter;
    const pet = abilityOwner as TamerPetCharacter;
    if (!abilityPetPainter.currentlyPainting) {
        let randomShape = PAINTER_SHAPES[Math.floor(PAINTER_SHAPES.length * nextRandom(game.state.randomSeed))];
        abilityPetPainter.currentlyPainting = randomShape;
        const startPoint = getRandomStartPaintPosition(pet, abilityPetPainter.currentlyPainting, game);
        if(abilityPetPainter.currentlyPainting === "Square"){
            abilityPetPainter.paintPoints = [];
            pet.forcedMovePosition = { x: startPoint.x, y: startPoint.y };
        }else if(abilityPetPainter.currentlyPainting === "Circle"){
            abilityPetPainter.paintCircle = {
                middle: { x: startPoint.x, y: startPoint.y },
                currentAngle: 0,
            };
            pet.forcedMovePosition = { x: startPoint.x, y: startPoint.y - CIRCLERADIUS };
        }
    } else {
        switch (abilityPetPainter.currentlyPainting) {
            case "Square":
                tickSquare(pet, abilityPetPainter, game);
                break;
            case "Circle":
                tickCircle(pet, abilityPetPainter, game);
                break;
        }
    }
}

function tickCircle(pet: TamerPetCharacter, abilityPetPainter: AbilityPetPainter, game: Game) {
    const targetPos = pet.forcedMovePosition!;
    const distance = calculateDistance(pet, targetPos);
    if (distance < pet.moveSpeed) {
        abilityPetPainter.paintCircle!.currentAngle += Math.PI / 10;
        const angle = abilityPetPainter.paintCircle!.currentAngle;
        if(angle > Math.PI * 2){
            abilityPetPainter.currentlyPainting = undefined;
            pet.forcedMovePosition = undefined;
            const randomDirection = nextRandom(game.state.randomSeed) * Math.PI * 2;
            const obj = createAbilityObjectPetPainterCircle(abilityPetPainter.paintCircle!.middle, abilityPetPainter.baseDamage, abilityPetPainter.id, pet.faction, CIRCLERADIUS, randomDirection, game.state.time );
            game.state.abilityObjects.push(obj);

        }else{
            let nextPosition: Position = {
                x:abilityPetPainter.paintCircle!.middle.x + Math.sin(angle) * CIRCLERADIUS,
                y:abilityPetPainter.paintCircle!.middle.y - Math.cos(angle) * CIRCLERADIUS
            }
            pet.forcedMovePosition = nextPosition;
        }
    } else if (distance > 150) {
        abilityPetPainter.currentlyPainting = undefined;
    }
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
                const obj = createAbilityObjectPetPainterSquare(abilityPetPainter.paintPoints![0], SQUARESIZE, abilityPetPainter.baseDamage, abilityPetPainter.id, pet.faction, range, game.state.time);
                game.state.abilityObjects.push(obj);
                break;
        }
    } else if (distance > 150) {
        abilityPetPainter.currentlyPainting = undefined;
    }
}

