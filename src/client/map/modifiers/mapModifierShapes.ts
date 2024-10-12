import { CelestialDirection, Game, Position } from "../../gameModel.js";
import { addMapModifyShapeCelestialDirection } from "./mapShapeCelestialDirection.js";
import { addMapModifyShapeCircle } from "./mapShapeCircle.js";
import { addMapModifyShapeRectangle } from "./mapShapeRectangle.js";

export type GameMapModifyShapeFunctions = {
    getMiddle?: (shape: GameMapArea) => Position,
    setAreaToAmount?: (shape: GameMapArea, value: number) => void,
    getArea?: (shape: GameMapArea) => number,
    isPositionInside: (shape: GameMapArea, position: Position, game: Game) => boolean
    getPaintClipPath: (ctx: CanvasRenderingContext2D, shape: GameMapArea, game: Game) => Path2D,
    paintShapeWithCircleCutOut: (ctx: CanvasRenderingContext2D, shape: GameMapArea, circlePos: Position, circleRadius: number, game: Game) => void,
}

export type GameMapModifyShapesFunctions = {
    [key: string]: GameMapModifyShapeFunctions,
}

export type GameMapArea = {
    type: string,
}

export const GAME_MAP_MODIFY_SHAPES_FUNCTIONS: GameMapModifyShapesFunctions = {};

export function onDomLoadMapModifierShapes() {
    addMapModifyShapeRectangle();
    addMapModifyShapeCircle();
    addMapModifyShapeCelestialDirection();
}

export function getShapeMiddle(shape: GameMapArea): Position | undefined {
    const shapeFunctions = GAME_MAP_MODIFY_SHAPES_FUNCTIONS[shape.type];
    if (shapeFunctions.getMiddle) return shapeFunctions.getMiddle(shape);
    return undefined;
}

export function setShapeAreaToAmount(shape: GameMapArea, value: number) {
    const shapeFunctions = GAME_MAP_MODIFY_SHAPES_FUNCTIONS[shape.type];
    if (shapeFunctions.setAreaToAmount) shapeFunctions.setAreaToAmount(shape, value);
}

export function getShapeArea(shape: GameMapArea): number | undefined {
    const shapeFunctions = GAME_MAP_MODIFY_SHAPES_FUNCTIONS[shape.type];
    if (shapeFunctions.getArea) shapeFunctions.getArea(shape);
    return undefined;
}

export function isPositionInsideShape(shape: GameMapArea, position: Position, game: Game): boolean {
    const shapeFunctions = GAME_MAP_MODIFY_SHAPES_FUNCTIONS[shape.type];
    return shapeFunctions.isPositionInside(shape, position, game);
}

export function getShapePaintClipPath(ctx: CanvasRenderingContext2D, shape: GameMapArea, game: Game): Path2D {
    const shapeFunctions = GAME_MAP_MODIFY_SHAPES_FUNCTIONS[shape.type];
    return shapeFunctions.getPaintClipPath(ctx, shape, game);
}

export function paintShapeWithCircleCutOut(ctx: CanvasRenderingContext2D, shape: GameMapArea, circlePos: Position, circleRadius: number, game: Game) {
    const shapeFunctions = GAME_MAP_MODIFY_SHAPES_FUNCTIONS[shape.type];
    shapeFunctions.paintShapeWithCircleCutOut(ctx, shape, circlePos, circleRadius, game);
}
