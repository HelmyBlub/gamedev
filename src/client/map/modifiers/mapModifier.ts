import { getCelestialDirection } from "../../character/enemy/bossEnemy.js"
import { calculateDistance } from "../../game.js"
import { CelestialDirection, Game, Position } from "../../gameModel.js"
import { GameMap, MapChunk } from "../map.js"
import { addMapModifierDarkness, createMapModifierDarkness } from "./mapModiferDarkness.js"

export type GameMapModifier = {
    type: string,
    area: GameMapArea,
}

export type GameMapArea = {
    type: "rect" | "circle" | "celestialDirection",
}

export type GameMapAreaRect = GameMapArea & {
    type: "rect",
    x: number,
    y: number,
    width: number,
    height: number,
}

export type GameMapAreaCircle = GameMapArea & {
    type: "circle",
    x: number,
    y: number,
    radius: number,
}

export type GameMapAreaCelestialDirection = GameMapArea & {
    type: "celestialDirection",
    celestialDirection: CelestialDirection,
}

export type GameMapModifyFunctions = {
    onChunkCreateModify?: (mapChunk: MapChunk, chunkX: number, chunkY: number, game: Game) => void,
    paintModiferLate?: (ctx: CanvasRenderingContext2D, modifier: GameMapModifier, cameraPosition: Position, game: Game) => void,
}

export type GameMapModifierFunctions = {
    [key: string]: GameMapModifyFunctions,
}

export const GAME_MAP_MODIFIER_FUNCTIONS: GameMapModifierFunctions = {};

export function onDomLoadMapModifiers() {
    addMapModifierDarkness();
}

export function addMapModifer(map: GameMap) {
    const area: GameMapAreaRect = {
        type: "rect",
        x: -1000,
        y: -1000,
        width: 2000,
        height: 2000,
    };
    const darkness = createMapModifierDarkness(area);
    map.mapModifiers.push(darkness);
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

export function mapModifyIsChunkAffected(modifier: GameMapModifier, chunkX: number, chunkY: number, game: Game): boolean {
    const map = game.state.map;
    const chunkWidth = map.tileSize * map.chunkLength;
    const chunkMiddleX = chunkX * chunkWidth + chunkWidth / 2;
    const chunkMiddleY = chunkY * chunkWidth + chunkWidth / 2;
    switch (modifier.area.type) {
        case "rect":
            const rectArea: GameMapAreaRect = modifier.area as GameMapAreaRect;
            const isInRect = chunkMiddleX >= rectArea.x && chunkMiddleX <= rectArea.x + rectArea.width
                && chunkMiddleY >= rectArea.y && chunkMiddleY <= rectArea.y + rectArea.height;
            return isInRect;
        case "circle":
            const circleArea: GameMapAreaCircle = modifier.area as GameMapAreaCircle;
            const isInCircle = calculateDistance({ x: chunkMiddleX, y: chunkMiddleY }, circleArea) <= circleArea.radius;
            return isInCircle;
        case "celestialDirection":
            const celestialDirectionArea: GameMapAreaCelestialDirection = modifier.area as GameMapAreaCelestialDirection;
            const celDel = getCelestialDirection({ x: chunkMiddleX, y: chunkMiddleY }, map);
            const isInCelestialDirection = celDel === celestialDirectionArea.celestialDirection;
            return isInCelestialDirection;
        default:
            console.log("missing mapModify area type");
            break;
    }
    return false;
}
