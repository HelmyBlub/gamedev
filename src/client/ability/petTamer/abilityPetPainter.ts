import { TamerPetCharacter } from "../../character/playerCharacters/tamerPetCharacter.js";
import { getNextId } from "../../game.js";
import { Position, Game, IdCounter } from "../../gameModel.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { Ability, AbilityObject, AbilityOwner, PaintOrderAbility, ABILITIES_FUNCTIONS, AbilityUpgradeOption } from "../ability.js";
import { addAbilityPetPainterCircle } from "./abilityPetPainterCircle.js";
import { addAbilityPetPainterSquare } from "./abilityPetPainterSquare.js";
import { addAbilityPetPainterTriangle } from "./abilityPetPainterTriangle.js";

export type AbilityPetPainter = Ability & {
    baseDamage: number,
    currentlyPainting?: string,
    paintPoints?: Position[],
    paintCircle?: {
        middle: Position,
        currentAngle: number,
    }
}

export type AbilityObjectPetPainter = AbilityObject & {
    subType: string,
    deleteTime: number,
}

export type AbilityPetPainterShapeFunctions = {
    tickShape: (pet: TamerPetCharacter, abilityPetPainter: AbilityPetPainter, game: Game) => void,
    tickShapeObject: (abilityObject: AbilityObjectPetPainter, game: Game) => void,
    paintShape: (ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: AbilityPetPainter, cameraPosition: Position, game: Game) => void,
    paintShapeObject: (ctx: CanvasRenderingContext2D, abilityObject: AbilityObjectPetPainter, paintOrder: PaintOrderAbility, game: Game) => void,
    initShapePaint: (pet: TamerPetCharacter, ability: AbilityPetPainter, game: Game) => void,
}

export type AbilityPetPainterShapesFunctions = {
    [key: string]: AbilityPetPainterShapeFunctions,
}

export const ABILITY_PET_PAINTER_SHAPES_FUNCTIONS: AbilityPetPainterShapesFunctions = {};
export const ABILITY_NAME_PET_PAINTER = "Painter";

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
    addAbilityPetPainterCircle();
    addAbilityPetPainterSquare();
    addAbilityPetPainterTriangle();
}

export function createAbilityPetPainter(idCounter: IdCounter): AbilityPetPainter {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_PET_PAINTER,
        baseDamage: 200,
        passive: true,
        upgrades: {},
    }
}

function setAbilityPetPainterToLevel(ability: Ability, level: number) {
    let abilityPetPainter = ability as AbilityPetPainter;
    abilityPetPainter.baseDamage = level * 200;
}

function tickAbilityObjectPetPainter(abilityObject: AbilityObject, game: Game) {
    let petPainter = abilityObject as AbilityObjectPetPainter;
    const shapeFunction = ABILITY_PET_PAINTER_SHAPES_FUNCTIONS[petPainter.subType];
    if (shapeFunction) {
        shapeFunction.tickShapeObject(petPainter, game);
    }else{
        throw Error("missing implementation");
    }
}

function deleteAbilityObjectPetPainter(abilityObject: AbilityObject, game: Game) {
    const abilityObjectPetPainter = abilityObject as AbilityObjectPetPainter;
    return abilityObjectPetPainter.deleteTime <= game.state.time;
}

function paintAbilityObjectPetPainter(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    let petPainter = abilityObject as AbilityObjectPetPainter;
    const shapeFunction = ABILITY_PET_PAINTER_SHAPES_FUNCTIONS[petPainter.subType];
    if (shapeFunction) {
        shapeFunction.paintShapeObject(ctx, petPainter, paintOrder, game);
    }else{
        throw Error("missing implementation");
    }
}

function paintAbilityPetPainter(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    let abilityPetPainter = ability as AbilityPetPainter;
    if (!abilityPetPainter.currentlyPainting) return;
    const shapeFunction = ABILITY_PET_PAINTER_SHAPES_FUNCTIONS[abilityPetPainter.currentlyPainting];
    if (shapeFunction) {
        shapeFunction.paintShape(ctx, abilityOwner, abilityPetPainter, cameraPosition, game);
    }else{
        throw Error("missing implementation");
    }
}

function createAbiltiyPetPainterUpgradeOptions(): AbilityUpgradeOption[] {
    let upgradeOptions: AbilityUpgradeOption[] = [];
    return upgradeOptions;
}

function tickAbilityPetPainter(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityPetPainter = ability as AbilityPetPainter;
    const pet = abilityOwner as TamerPetCharacter;
    if (!abilityPetPainter.currentlyPainting) {
        const shapes = Object.keys(ABILITY_PET_PAINTER_SHAPES_FUNCTIONS);
        let randomShape = shapes[Math.floor(shapes.length * nextRandom(game.state.randomSeed))];
        const shapeFunction = ABILITY_PET_PAINTER_SHAPES_FUNCTIONS[randomShape];
        if (shapeFunction) {
            shapeFunction.initShapePaint(pet, abilityPetPainter, game);
        }
    } else {
        const shapeFunction = ABILITY_PET_PAINTER_SHAPES_FUNCTIONS[abilityPetPainter.currentlyPainting];
        if (shapeFunction) {
            shapeFunction.tickShape(pet, abilityPetPainter, game);
        }
    }
}
