import { Character } from "../../character/characterModel.js";
import { TamerPetCharacter } from "../../character/playerCharacters/tamer/tamerPetCharacter.js";
import { AbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { getNextId } from "../../game.js";
import { Position, Game, IdCounter } from "../../gameModel.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { Ability, AbilityObject, AbilityOwner, PaintOrderAbility, ABILITIES_FUNCTIONS } from "../ability.js";
import { AbilityUpgradesFunctions, pushAbilityUpgradesOptions, upgradeAbility } from "../abilityUpgrade.js";
import { addAbilityPetPainterCircle } from "./abilityPetPainterCircle.js";
import { addAbilityPetPainterSquare } from "./abilityPetPainterSquare.js";
import { addAbilityPetPainterTriangle } from "./abilityPetPainterTriangle.js";
import { ABILITY_PET_PAINTER_UPGRADE_DUPLICATE, AbilityPetPainterUpgradeDuplicate, addAbilityPetPainterUpgradeDuplicate } from "./abilityPetPainterUpgradeDuplicate.js";
import { addAbilityPetPainterUpgradeFactory } from "./abilityPetPainterUpgradeFactory.js";
import { AbilityPetPainterUpgradeSplit, abilityPetPainerUpgradeSplitCheckForSplit, addAbilityPetPainterUpgradeSplit } from "./abilityPetPainterUpgradeSplit.js";

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
    isFactory?: boolean,
    isSplit?: boolean,
}

export type AbilityPetPainterShapeFunctions = {
    createShape: (pet: TamerPetCharacter, abilityPetPainter: AbilityPetPainter, game: Game) => AbilityObject,
    createSplitShape: (abilityObject: AbilityObjectPetPainter, upgrade: AbilityPetPainterUpgradeSplit, game: Game) => AbilityObjectPetPainter,
    tickShape: (pet: TamerPetCharacter, abilityPetPainter: AbilityPetPainter, game: Game) => void,
    tickShapeObject: (abilityObject: AbilityObjectPetPainter, game: Game) => void,
    paintShape: (ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: AbilityPetPainter, cameraPosition: Position, game: Game) => void,
    paintShapeObject: (ctx: CanvasRenderingContext2D, abilityObject: AbilityObjectPetPainter, paintOrder: PaintOrderAbility, game: Game) => void,
    initShapePaint: (pet: TamerPetCharacter, ability: AbilityPetPainter, game: Game) => void,
}

export type AbilityPetPainterShapesFunctions = {
    [key: string]: AbilityPetPainterShapeFunctions,
}

export const ABILITY_PET_PAINTER_UPGRADE_FUNCTIONS: AbilityUpgradesFunctions = {};
export const ABILITY_PET_PAINTER_SHAPES_FUNCTIONS: AbilityPetPainterShapesFunctions = {};
export const ABILITY_NAME_PET_PAINTER = "Painter";

export function addAbilityPetPainter() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_PET_PAINTER] = {
        createAbilityBossUpgradeOptions: createAbilityPetPainterUpgradeOptions,
        createAbility: createAbilityPetPainter,
        executeUpgradeOption: executeAbilityPetPainterUpgradeOption,
        deleteAbilityObject: deleteAbilityObjectPetPainter,
        getLongDescription: getLongDescription,
        paintAbility: paintAbilityPetPainter,
        paintAbilityObject: paintAbilityObjectPetPainter,
        resetAbility: resetAbility,
        setAbilityToLevel: setAbilityPetPainterToLevel,
        setAbilityToBossLevel: setAbilityPetPainterToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        tickAbility: tickAbilityPetPainter,
        tickAbilityObject: tickAbilityObjectPetPainter,
        abilityUpgradeFunctions: ABILITY_PET_PAINTER_UPGRADE_FUNCTIONS,
    };
    addAbilityPetPainterCircle();
    addAbilityPetPainterSquare();
    addAbilityPetPainterTriangle();

    addAbilityPetPainterUpgradeDuplicate();
    addAbilityPetPainterUpgradeFactory();
    addAbilityPetPainterUpgradeSplit();
}

function createAbilityPetPainter(idCounter: IdCounter): AbilityPetPainter {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_PET_PAINTER,
        baseDamage: 200,
        passive: true,
        upgrades: {},
    }
}

export function createShapeAbilityPetPainter(shape: string, abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityPetPainter = ability as AbilityPetPainter;
    const pet = abilityOwner as TamerPetCharacter;
    const shapeFunction = ABILITY_PET_PAINTER_SHAPES_FUNCTIONS[shape];
    if (shapeFunction) {
        let numberShapes = 1;
        const duplicateUpgrade = abilityPetPainter.upgrades[ABILITY_PET_PAINTER_UPGRADE_DUPLICATE] as AbilityPetPainterUpgradeDuplicate;
        if (duplicateUpgrade) {
            numberShapes += duplicateUpgrade.level;
        }
        for (let i = 0; i < numberShapes; i++) {
            const shape = shapeFunction.createShape(pet, abilityPetPainter, game);
            game.state.abilityObjects.push(shape);
        }
    } else {
        throw Error("missing implementation");
    }
}

function getLongDescription(): string[] {
    return [
        `Ability: ${ABILITY_NAME_PET_PAINTER}`,
        `Draw simple shapes on the ground.`,
        `Finished shapes come alive.`,
        `Enemies hit by shape take damage.`,
    ];
}

function resetAbility(ability: Ability) {
    const paint = ability as AbilityPetPainter;
    paint.currentlyPainting = undefined;
}

function setAbilityPetPainterToLevel(ability: Ability, level: number) {
    const abilityPetPainter = ability as AbilityPetPainter;
    abilityPetPainter.baseDamage = level * 200;
}

function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const abilityPetPainter = ability as AbilityPetPainter;
    abilityPetPainter.baseDamage = level * damageFactor;
}

function setAbilityPetPainterToBossLevel(ability: Ability, level: number) {
    const abilityPetPainter = ability as AbilityPetPainter;
    abilityPetPainter.baseDamage = level * 10;
}

function tickAbilityObjectPetPainter(abilityObject: AbilityObject, game: Game) {
    const petPainter = abilityObject as AbilityObjectPetPainter;
    const shapeFunction = ABILITY_PET_PAINTER_SHAPES_FUNCTIONS[petPainter.subType];
    if (shapeFunction) {
        shapeFunction.tickShapeObject(petPainter, game);
    } else {
        throw Error("missing implementation");
    }
}

function deleteAbilityObjectPetPainter(abilityObject: AbilityObject, game: Game) {
    const abilityObjectPetPainter = abilityObject as AbilityObjectPetPainter;
    const deleteObject = abilityObjectPetPainter.deleteTime <= game.state.time;
    if (deleteObject && !abilityObjectPetPainter.isSplit) {
        abilityPetPainerUpgradeSplitCheckForSplit(abilityObjectPetPainter, game);
    }

    return deleteObject;
}

function paintAbilityObjectPetPainter(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    const petPainter = abilityObject as AbilityObjectPetPainter;
    const shapeFunction = ABILITY_PET_PAINTER_SHAPES_FUNCTIONS[petPainter.subType];
    if (shapeFunction) {
        shapeFunction.paintShapeObject(ctx, petPainter, paintOrder, game);
    } else {
        throw Error("missing implementation");
    }
}

function paintAbilityPetPainter(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    const abilityPetPainter = ability as AbilityPetPainter;
    if (!abilityPetPainter.currentlyPainting) return;
    const shapeFunction = ABILITY_PET_PAINTER_SHAPES_FUNCTIONS[abilityPetPainter.currentlyPainting];
    if (shapeFunction) {
        shapeFunction.paintShape(ctx, abilityOwner, abilityPetPainter, cameraPosition, game);
    } else {
        throw Error("missing implementation");
    }
}

function createAbilityPetPainterUpgradeOptions(ability: Ability, character: Character, game: Game): UpgradeOptionAndProbability[] {
    const upgradeOptions: UpgradeOptionAndProbability[] = [];
    pushAbilityUpgradesOptions(ABILITY_PET_PAINTER_UPGRADE_FUNCTIONS, upgradeOptions, ability, character, game);
    return upgradeOptions;
}

function executeAbilityPetPainterUpgradeOption(ability: Ability, character: Character, upgradeOption: UpgradeOption, game: Game) {
    const abilityUpgradeOption: AbilityUpgradeOption = upgradeOption as AbilityUpgradeOption;
    upgradeAbility(ability, character, abilityUpgradeOption);
}

function tickAbilityPetPainter(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    if (ability.disabled) return;
    const abilityPetPainter = ability as AbilityPetPainter;
    const pet = abilityOwner as TamerPetCharacter;
    if (!abilityPetPainter.currentlyPainting) {
        const shapes = Object.keys(ABILITY_PET_PAINTER_SHAPES_FUNCTIONS);
        const randomShape = shapes[Math.floor(shapes.length * nextRandom(game.state.randomSeed))];
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
