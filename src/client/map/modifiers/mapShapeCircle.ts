import { calculateDistance, getCameraPosition } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { GAME_MAP_MODIFY_SHAPES_FUNCTIONS, GameMapArea } from "./mapModifierShapes.js";

export type GameMapAreaCircle = GameMapArea & {
    x: number,
    y: number,
    radius: number,
}

export const MODIFY_SHAPE_NAME_CIRCLE = "Circle";

export function addMapModifyShapeCircle() {
    GAME_MAP_MODIFY_SHAPES_FUNCTIONS[MODIFY_SHAPE_NAME_CIRCLE] = {
        getArea: getArea,
        getMiddle: getMiddle,
        setAreaToAmount: setAreaToAmount,
        isPositionInside: isPositionInside,
        getPaintClipPath: getPaintClipPath,
        paintShapeWithCircleCutOut: paintShapeWithCircleCutOut,
    };
}

function paintShapeWithCircleCutOut(ctx: CanvasRenderingContext2D, shape: GameMapArea, circlePos: Position, circleRadius: number, game: Game) {
    const circle = shape as GameMapAreaCircle;
    const cameraPosition = getCameraPosition(game);
    const circlePaintCenter = getPointPaintPosition(ctx, circle, cameraPosition, game.UI.zoom, true);
    ctx.fillStyle = 'black';
    ctx.beginPath();
    let rectPath = getPaintClipPath(ctx, shape, game);
    ctx.save();
    ctx.clip(rectPath);
    ctx.arc(circlePaintCenter.x, circlePaintCenter.y, circle.radius, 0, Math.PI * 2);
    ctx.arc(circlePos.x, circlePos.y, circleRadius, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.restore();
}


function getArea(shape: GameMapArea): number {
    const circle = shape as GameMapAreaCircle;
    return circle.radius * circle.radius * Math.PI;
}

function getMiddle(shape: GameMapArea): Position {
    const circle = shape as GameMapAreaCircle;
    return {
        x: circle.x,
        y: circle.y,
    };
}

function setAreaToAmount(shape: GameMapArea, value: number) {
    const circle = shape as GameMapAreaCircle;
    circle.radius = Math.sqrt(value / Math.PI);
}

function isPositionInside(shape: GameMapArea, position: Position): boolean {
    const circle = shape as GameMapAreaCircle;
    return calculateDistance(circle, position) <= circle.radius;
}

function getPaintClipPath(ctx: CanvasRenderingContext2D, shape: GameMapArea, game: Game): Path2D {
    const circle = shape as GameMapAreaCircle;
    const cameraPosition = getCameraPosition(game);
    const circlePaintCenter = getPointPaintPosition(ctx, circle, cameraPosition, game.UI.zoom, true);

    let rectPath = new Path2D();
    rectPath.arc(circlePaintCenter.x, circlePaintCenter.y, circle.radius, 0, Math.PI * 2);
    return rectPath;
}