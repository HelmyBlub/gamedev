import { CelestialDirection, Game, Position } from "../../gameModel.js";
import { addMapModifyShapeCircle } from "./mapCircle.js";
import { addMapModifyShapeRectangle } from "./mapRectangle.js";

export type GameMapModifyShapeFunctions = {
    getMiddle: (shape: GameMapArea) => Position,
    setAreaToAmount: (shape: GameMapArea, value: number) => void,
    getArea: (shape: GameMapArea) => number,
    isPositionInside: (shape: GameMapArea, position: Position) => boolean
    getPaintClipPath: (ctx: CanvasRenderingContext2D, shape: GameMapArea, game: Game) => Path2D,
    paintShapeWithCircleCutOut: (ctx: CanvasRenderingContext2D, shape: GameMapArea, circlePos: Position, circleRadius: number, game: Game) => void,
}

export type GameMapModifyShapesFunctions = {
    [key: string]: GameMapModifyShapeFunctions,
}

export type GameMapArea = {
    type: string,
}

export type GameMapAreaCelestialDirection = GameMapArea & {
    type: "celestialDirection",
    celestialDirection: CelestialDirection,
}

export const GAME_MAP_MODIFY_SHAPES_FUNCTIONS: GameMapModifyShapesFunctions = {};

export function onDomLoadMapModifierShapes() {
    addMapModifyShapeRectangle();
    addMapModifyShapeCircle();
}

export function getShapeMiddle(shape: GameMapArea): Position {
    const shapeFunctions = GAME_MAP_MODIFY_SHAPES_FUNCTIONS[shape.type];
    return shapeFunctions.getMiddle(shape);
}

export function setShapeAreaToAmount(shape: GameMapArea, value: number) {
    const shapeFunctions = GAME_MAP_MODIFY_SHAPES_FUNCTIONS[shape.type];
    shapeFunctions.setAreaToAmount(shape, value);
}

export function getShapeArea(shape: GameMapArea): number {
    const shapeFunctions = GAME_MAP_MODIFY_SHAPES_FUNCTIONS[shape.type];
    return shapeFunctions.getArea(shape);
}

export function isPositionInsideShape(shape: GameMapArea, position: Position): boolean {
    const shapeFunctions = GAME_MAP_MODIFY_SHAPES_FUNCTIONS[shape.type];
    return shapeFunctions.isPositionInside(shape, position);
}

export function getShapePaintClipPath(ctx: CanvasRenderingContext2D, shape: GameMapArea, game: Game): Path2D {
    const shapeFunctions = GAME_MAP_MODIFY_SHAPES_FUNCTIONS[shape.type];
    return shapeFunctions.getPaintClipPath(ctx, shape, game);
}

export function paintShapeWithCircleCutOut(ctx: CanvasRenderingContext2D, shape: GameMapArea, circlePos: Position, circleRadius: number, game: Game) {
    const shapeFunctions = GAME_MAP_MODIFY_SHAPES_FUNCTIONS[shape.type];
    shapeFunctions.paintShapeWithCircleCutOut(ctx, shape, circlePos, circleRadius, game);
}
