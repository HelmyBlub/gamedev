import { Game, Position } from "../../gameModel.js"
import { nextRandom } from "../../randomNumberGenerator.js"
import { GameMap, MapChunk } from "../map.js"
import { GameMapAreaCircle, MODIFY_SHAPE_NAME_CIRCLE } from "./mapShapeCircle.js"
import { addMapModifierDarkness, createMapModifierDarkness } from "./mapModiferDarkness.js"
import { GameMapArea, isPositionInsideShape, onDomLoadMapModifierShapes, setShapeAreaToAmount } from "./mapModifierShapes.js"
import { GameMapAreaRect, MODIFY_SHAPE_NAME_RECTANGLE } from "./mapShapeRectangle.js"
import { GameMapAreaCelestialDirection, MODIFY_SHAPE_NAME_CELESTIAL_DIRECTION } from "./mapShapeCelestialDirection.js"

export type GameMapModifier = {
    id: number,
    type: string,
    area: GameMapArea,
}

export type GameMapModifyFunctions = {
    growArea?: (modifier: GameMapModifier) => void,
    onGameInit?: (modifier: GameMapModifier, game: Game) => void,
    onChunkCreateModify?: (mapChunk: MapChunk, chunkX: number, chunkY: number, game: Game) => void,
    paintModiferLate?: (ctx: CanvasRenderingContext2D, modifier: GameMapModifier, cameraPosition: Position, game: Game) => void,
}

export type GameMapModifierFunctions = {
    [key: string]: GameMapModifyFunctions,
}

export const GAME_MAP_MODIFIER_FUNCTIONS: GameMapModifierFunctions = {};

export function onDomLoadMapModifiers() {
    addMapModifierDarkness();
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

export function findMapModifierById(id: number, game: Game): undefined | GameMapModifier {
    return game.state.map.mapModifiers.find((m) => m.id === id);
}

export function mapModifierOnGameInit(game: Game) {
    const modifiers = game.state.map.mapModifiers;
    if (modifiers.length === 0) {
        addMapModifer(game.state.map, game);
    }

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

function addMapModifer(map: GameMap, game: Game) {
    const axisOffset = 7500;
    const signX = nextRandom(game.state.randomSeed) < 0.5 ? 1 : -1;
    const signY = nextRandom(game.state.randomSeed) < 0.5 ? 1 : -1;
    const areaCircle: GameMapAreaCircle = {
        type: MODIFY_SHAPE_NAME_CIRCLE,
        x: axisOffset * signX,
        y: axisOffset * signY,
        radius: 0,
    };

    const darkness = createMapModifierDarkness(areaCircle, game.state.idCounter);
    if (darkness.areaPerLevel) setShapeAreaToAmount(areaCircle, darkness.areaPerLevel);
    map.mapModifiers.push(darkness);
}

