import { setCharacterPosition } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { getNextWaypoint } from "../../character/pathing.js";
import { TamerPetCharacter, findPetOwner, petHappinessToDisplayText } from "../../character/playerCharacters/tamer/tamerPetCharacter.js";
import { AbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { AbilityDamageBreakdown } from "../../combatlog.js";
import { calculateDistance, getNextId } from "../../game.js";
import { Position, Game, IdCounter } from "../../gameModel.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { Ability, AbilityObject, AbilityOwner, PaintOrderAbility, ABILITIES_FUNCTIONS } from "../ability.js";
import { AbilityUpgradesFunctions, pushAbilityUpgradesOptions, upgradeAbility } from "../abilityUpgrade.js";
import { addAbilityPetPainterCircle } from "./abilityPetPainterCircle.js";
import { addAbilityPetPainterSquare } from "./abilityPetPainterSquare.js";
import { addAbilityPetPainterTriangle } from "./abilityPetPainterTriangle.js";
import { ABILITY_PET_PAINTER_UPGRADE_DUPLICATE, AbilityPetPainterUpgradeDuplicate, addAbilityPetPainterUpgradeDuplicate } from "./abilityPetPainterUpgradeDuplicate.js";
import { ABILITY_PET_PAINTER_UPGRADE_FACTORY, AbilityPetPainterUpgradeFactory, addAbilityPetPainterUpgradeFactory } from "./abilityPetPainterUpgradeFactory.js";
import { ABILITY_PET_PAINTER_UPGRADE_SPLIT, AbilityPetPainterUpgradeSplit, abilityPetPainerUpgradeSplitCheckForSplit, addAbilityPetPainterUpgradeSplit } from "./abilityPetPainterUpgradeSplit.js";

export type AbilityPetPainter = Ability & {
    baseDamage: number,
    currentlyPainting?: string,
    paintPoints?: Position[],
    shapesPerPaintLimiter: number,
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
        createDamageBreakDown: createDamageBreakDown,
        executeUpgradeOption: executeAbilityPetPainterUpgradeOption,
        deleteAbilityObject: deleteAbilityObjectPetPainter,
        getMoreInfosText: getLongDescription,
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

export function createShapeAbilityPetPainter(shape: string, abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityPetPainter = ability as AbilityPetPainter;
    const pet = abilityOwner as TamerPetCharacter;
    const shapeFunction = ABILITY_PET_PAINTER_SHAPES_FUNCTIONS[shape];
    if (shapeFunction) {
        let numberShapes = 1;
        const duplicateUpgrade = abilityPetPainter.upgrades[ABILITY_PET_PAINTER_UPGRADE_DUPLICATE] as AbilityPetPainterUpgradeDuplicate;
        if (duplicateUpgrade) {
            numberShapes = abilityPetPainterGetLimitedShapeCount(ABILITY_PET_PAINTER_UPGRADE_DUPLICATE, abilityPetPainter);
        }
        for (let i = 0; i < numberShapes; i++) {
            const shape = shapeFunction.createShape(pet, abilityPetPainter, game);
            game.state.abilityObjects.push(shape);
        }
    } else {
        throw Error("missing implementation");
    }
}

export function abilityPetPainterGetLimitedShapeBonusDamage(ability: AbilityPetPainter) {
    let totalShapesPerPaint = 1;
    const duplicateUpgrade = ability.upgrades[ABILITY_PET_PAINTER_UPGRADE_DUPLICATE] as AbilityPetPainterUpgradeDuplicate;
    if (duplicateUpgrade) {
        totalShapesPerPaint *= (duplicateUpgrade.level + 1);
    }
    const factoryUpgrade = ability.upgrades[ABILITY_PET_PAINTER_UPGRADE_FACTORY] as AbilityPetPainterUpgradeFactory;
    if (factoryUpgrade) {
        totalShapesPerPaint *= (factoryUpgrade.level + 1);
    }
    const splitUpgrade = ability.upgrades[ABILITY_PET_PAINTER_UPGRADE_SPLIT] as AbilityPetPainterUpgradeSplit;
    if (splitUpgrade) {
        totalShapesPerPaint *= (splitUpgrade.level + 1);
    }
    if (ability.shapesPerPaintLimiter >= totalShapesPerPaint) {
        return 1;
    }
    const factor = totalShapesPerPaint / ability.shapesPerPaintLimiter;
    return factor;
}

export function abilityPetPainterGetLimitedShapeCount(upgradeName: string, ability: AbilityPetPainter): number {
    let totalShapesPerPaint = 1;
    let differentUpgradeCount = 0;
    const duplicateUpgrade = ability.upgrades[ABILITY_PET_PAINTER_UPGRADE_DUPLICATE] as AbilityPetPainterUpgradeDuplicate;
    if (duplicateUpgrade) {
        totalShapesPerPaint *= (duplicateUpgrade.level + 1);
        differentUpgradeCount++;
    }
    const factoryUpgrade = ability.upgrades[ABILITY_PET_PAINTER_UPGRADE_FACTORY] as AbilityPetPainterUpgradeFactory;
    if (factoryUpgrade) {
        totalShapesPerPaint *= (factoryUpgrade.level + 1);
        differentUpgradeCount++;
    }
    const splitUpgrade = ability.upgrades[ABILITY_PET_PAINTER_UPGRADE_SPLIT] as AbilityPetPainterUpgradeSplit;
    if (splitUpgrade) {
        totalShapesPerPaint *= (splitUpgrade.level + 1);
        differentUpgradeCount++;
    }
    if (ability.shapesPerPaintLimiter >= totalShapesPerPaint) {
        return ability.upgrades[upgradeName].level;
    }
    if (differentUpgradeCount <= 0) return 1;
    const factor = ability.shapesPerPaintLimiter / totalShapesPerPaint;
    const singleMultiplier = Math.pow(factor, 1 / differentUpgradeCount);
    const currentCount = ability.upgrades[upgradeName].level + 1;
    const result = Math.max(Math.floor(currentCount * singleMultiplier), 1);
    return result;
}

export function abilityPetPainterTeleportIfOwnerUnreachableOrToFarAway(pet: TamerPetCharacter, petOwner: Character, game: Game) {
    const distance = calculateDistance(pet, petOwner);
    if (distance > 800) {
        setCharacterPosition(pet, petOwner, game.state.map);
    } else {
        const nextWayPoint: Position | null = getNextWaypoint(pet, petOwner, game.performance.pathingCache, game.state.time, game);
        const canPetReachPosition = nextWayPoint !== null;
        if (!canPetReachPosition) {
            setCharacterPosition(pet, petOwner, game.state.map);
        }
    }
}

function createAbilityPetPainter(idCounter: IdCounter): AbilityPetPainter {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_PET_PAINTER,
        baseDamage: 200,
        passive: true,
        upgrades: {},
        shapesPerPaintLimiter: 64,
    }
}

function createDamageBreakDown(damage: number, ability: Ability, abilityObject: AbilityObject | undefined, damageAbilityName: string, game: Game): AbilityDamageBreakdown[] {
    const damageBreakDown: AbilityDamageBreakdown[] = [];
    if (abilityObject) {
        const painterObject = abilityObject as AbilityObjectPetPainter;
        damageBreakDown.push({
            damage: damage,
            name: painterObject.subType,
        });
    } else {
        damageBreakDown.push({
            damage: damage,
            name: ability.name,
        });
    }
    return damageBreakDown;
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
        if (petHappinessToDisplayText(pet.happines, game.state.time) === "very unhappy") {
            return;
        }
        const shapes = Object.keys(ABILITY_PET_PAINTER_SHAPES_FUNCTIONS);
        const randomShape = shapes[Math.floor(shapes.length * nextRandom(game.state.randomSeed))];
        const shapeFunction = ABILITY_PET_PAINTER_SHAPES_FUNCTIONS[randomShape];
        if (shapeFunction) {
            const petOwner: Character | undefined = findPetOwner(pet, game);
            if (!petOwner) return undefined;
            abilityPetPainterTeleportIfOwnerUnreachableOrToFarAway(pet, petOwner, game);
            shapeFunction.initShapePaint(pet, abilityPetPainter, game);
        }
    } else {
        const shapeFunction = ABILITY_PET_PAINTER_SHAPES_FUNCTIONS[abilityPetPainter.currentlyPainting];
        if (shapeFunction) {
            shapeFunction.tickShape(pet, abilityPetPainter, game);
        }
    }
}
