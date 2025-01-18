import { CelestialDirection, Game, IdCounter, Position } from "../../gameModel.js"
import { nextRandom } from "../../randomNumberGenerator.js"
import { GameMap, MapChunk } from "../map.js"
import { GameMapAreaCircle, MODIFY_SHAPE_NAME_CIRCLE } from "./mapShapeCircle.js"
import { addMapModifierDarkness, MODIFIER_NAME_DARKNESS } from "./mapModifierDarkness.js"
import { GameMapArea, getShapeMiddle, isPositionInsideShape, onDomLoadMapModifierShapes, setShapeAreaToAmount } from "./mapModifierShapes.js"
import { GameMapAreaCelestialDirection, MODIFY_SHAPE_NAME_CELESTIAL_DIRECTION } from "./mapShapeCelestialDirection.js"
import { addMapModifierLightning } from "./mapModifierLightning.js"
import { CURSES_FUNCTIONS } from "../../curse/curse.js"
import { addMapModifierIce } from "./mapModifierIce.js"

export type GameMapModifier = {
    id: number,
    type: string,
    level: number,
    area: GameMapArea,
    areaPerLevel?: number,
}

export type GameMapModifyFunctions = {
    create: (area: GameMapArea, idCounter: IdCounter) => GameMapModifier,
    growArea?: (modifier: GameMapModifier) => void,
    onGameInit?: (modifier: GameMapModifier, game: Game) => void,
    onChunkCreateModify?: (modifier: GameMapModifier, mapChunk: MapChunk, chunkX: number, chunkY: number, game: Game) => void,
    paintModiferLate?: (ctx: CanvasRenderingContext2D, modifier: GameMapModifier, cameraPosition: Position, game: Game) => void,
    tick?: (modifier: GameMapModifier, game: Game) => void,
}

export type GameMapModifierFunctions = {
    [key: string]: GameMapModifyFunctions,
}

export const GAME_MAP_MODIFIER_FUNCTIONS: GameMapModifierFunctions = {};

export function onDomLoadMapModifiers() {
    addMapModifierDarkness();
    addMapModifierLightning();
    addMapModifierIce();
    onDomLoadMapModifierShapes();
}

export function removeMapModifier(id: number, game: Game) {
    const index = game.state.map.mapModifiers.findIndex((m) => m.id === id);
    game.state.map.mapModifiers.splice(index, 1);
}

export function paintMapModifierLate(ctx: CanvasRenderingContext2D, cameraPosition: Position, game: Game) {
    const modifiers = game.state.map.mapModifiers;
    for (let modifier of modifiers) {
        const modFunctions = GAME_MAP_MODIFIER_FUNCTIONS[modifier.type];
        if (modFunctions && modFunctions.paintModiferLate) {
            modFunctions.paintModiferLate(ctx, modifier, cameraPosition, game);
        }
    }
}

export function tickMapModifier(game: Game) {
    const modifiers = game.state.map.mapModifiers;
    for (let modifier of modifiers) {
        const modFunctions = GAME_MAP_MODIFIER_FUNCTIONS[modifier.type];
        if (modFunctions && modFunctions.tick) {
            modFunctions.tick(modifier, game);
        }
    }
}

export function findMapModifierById(id: number, game: Game): undefined | GameMapModifier {
    return game.state.map.mapModifiers.find((m) => m.id === id);
}

export function mapModifierOnGameInit(game: Game) {
    const modifiers = game.state.map.mapModifiers;
    haveAtLeastOneNoneCelestialModifierOfEachType(game);
    removeMapModifierCelestialIfNoKingWithCurse(game);
    addMapModifierIfKingHasCurse(game);
    for (let modifier of modifiers) {
        const modFunctions = GAME_MAP_MODIFIER_FUNCTIONS[modifier.type];
        if (modFunctions && modFunctions.onGameInit) {
            modFunctions.onGameInit(modifier, game);
        }
    }
}

export function mapModifierGrowArea(game: Game) {
    const modifiers = game.state.map.mapModifiers;
    for (let modifier of modifiers) {
        const modFunctions = GAME_MAP_MODIFIER_FUNCTIONS[modifier.type];
        if (modFunctions && modFunctions.growArea) {
            modFunctions.growArea(modifier);
        }
    }
}

export function mapModifyIsChunkAffected(modifier: GameMapModifier, chunkX: number, chunkY: number, game: Game): boolean {
    const map = game.state.map;
    const chunkWidth = map.tileSize * map.chunkLength;
    const chunkMiddle: Position = {
        x: chunkX * chunkWidth + chunkWidth / 2,
        y: chunkY * chunkWidth + chunkWidth / 2
    }
    return isPositionInsideShape(modifier.area, chunkMiddle, game);
}

function haveAtLeastOneNoneCelestialModifierOfEachType(game: Game) {
    const modifiers = game.state.map.mapModifiers;
    const modifierTypes = Object.keys(GAME_MAP_MODIFIER_FUNCTIONS);
    const typeExists: boolean[] = [];
    for (let i = 0; i < modifierTypes.length; i++) {
        typeExists.push(false);
    }

    for (let modifier of modifiers) {
        if (modifier.type === MODIFY_SHAPE_NAME_CELESTIAL_DIRECTION) continue;
        for (let i = 0; i < modifierTypes.length; i++) {
            if (modifierTypes[i] !== modifier.type) continue;
            typeExists[i] = true;
        }
    }
    for (let i = 0; i < modifierTypes.length; i++) {
        if (!typeExists[i]) addMapModifer(modifierTypes[i], game.state.map, game);
    }
}

function removeMapModifierCelestialIfNoKingWithCurse(game: Game) {
    for (let i = game.state.map.mapModifiers.length - 1; i >= 0; i--) {
        const mapModifier = game.state.map.mapModifiers[i];
        if (mapModifier.area.type === MODIFY_SHAPE_NAME_CELESTIAL_DIRECTION) {
            const celestialDirection = (mapModifier.area as GameMapAreaCelestialDirection).celestialDirection;
            const king = game.state.bossStuff.nextKings[celestialDirection];
            if (king && king.curses) {
                let kingHasCurse = false;
                for (let curse of king.curses) {
                    const curseFunctions = CURSES_FUNCTIONS[curse.type];
                    if (!curseFunctions) continue;
                    if (mapModifier.type === curseFunctions.mapModifierName) {
                        kingHasCurse = true;
                        break;
                    }
                }
                if (kingHasCurse) continue;
            }
            game.state.map.mapModifiers.splice(i, 1);
        }
    }
}

function addMapModifierIfKingHasCurse(game: Game) {
    const celestialDirections = Object.keys(game.state.bossStuff.nextKings) as CelestialDirection[];
    for (let celestialDirection of celestialDirections) {
        const king = game.state.bossStuff.nextKings[celestialDirection];
        if (!king || !king.curses) continue;
        for (let curse of king.curses) {
            let alreadyExists = false;
            const curseFunctions = CURSES_FUNCTIONS[curse.type];
            if (!curseFunctions) continue;
            for (let mapModifier of game.state.map.mapModifiers) {
                if (mapModifier.type === curseFunctions.mapModifierName
                    && mapModifier.area.type === MODIFY_SHAPE_NAME_CELESTIAL_DIRECTION
                    && (mapModifier.area as GameMapAreaCelestialDirection).celestialDirection === celestialDirection
                ) {
                    if (mapModifier.level !== curse.level) mapModifier.level = curse.level;
                    alreadyExists = true;
                    break;
                }
            }
            if (alreadyExists) continue;
            const area: GameMapAreaCelestialDirection = {
                type: MODIFY_SHAPE_NAME_CELESTIAL_DIRECTION,
                celestialDirection: celestialDirection,
            };
            const mapModifier = createMapModifier(curseFunctions.mapModifierName, area, game.state.idCounter);
            if (mapModifier) {
                mapModifier.level = curse.level;
                game.state.map.mapModifiers.push(mapModifier);
            }
        }
    }
}

function addMapModifer(modifierType: string, map: GameMap, game: Game) {
    let freeCorners = [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }];
    for (let mod of map.mapModifiers) {
        if (mod.area.type === MODIFY_SHAPE_NAME_CELESTIAL_DIRECTION) continue;
        const middle = getShapeMiddle(mod.area, game);
        if (middle === undefined) continue;
        const x = middle.x < 0 ? -1 : 1;
        const y = middle.y < 0 ? -1 : 1;
        const index = freeCorners.findIndex(e => e.x === x && e.y === y);
        if (index === -1) continue;
        freeCorners.splice(index, 1);
    }
    if (freeCorners.length === 0) return;
    const randomCornerIndex = Math.floor(nextRandom(game.state.randomSeed) * freeCorners.length);
    const randomCorner = freeCorners[randomCornerIndex];
    const axisOffset = 7500;
    const areaCircle: GameMapAreaCircle = {
        type: MODIFY_SHAPE_NAME_CIRCLE,
        x: axisOffset * randomCorner.x,
        y: axisOffset * randomCorner.y,
        radius: 0,
    };

    const modifier = createMapModifier(modifierType, areaCircle, game.state.idCounter);
    if (!modifier) return;
    if (modifier.areaPerLevel) setShapeAreaToAmount(areaCircle, modifier.areaPerLevel * modifier.level);
    map.mapModifiers.push(modifier);
}

function createMapModifier(type: string, area: GameMapArea, idCounter: IdCounter): GameMapModifier | undefined {
    const functions = GAME_MAP_MODIFIER_FUNCTIONS[type];
    if (!functions) return undefined;
    return functions.create(area, idCounter);
}

