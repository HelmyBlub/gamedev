import { getCameraPosition } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { GAME_MAP_MODIFY_SHAPES_FUNCTIONS, GameMapArea } from "./mapModifierShapes.js";

export type GameMapAreaRect = GameMapArea & {
    x: number,
    y: number,
    width: number,
    height: number,
}

export const MODIFY_SHAPE_NAME_RECTANGLE = "Rectangle";

export function addMapModifyShapeRectangle() {
    GAME_MAP_MODIFY_SHAPES_FUNCTIONS[MODIFY_SHAPE_NAME_RECTANGLE] = {
        getArea: getArea,
        getMiddle: getMiddle,
        setAreaToAmount: setAreaToAmount,
        isPositionInside: isPositionInside,
        getPaintClipPath: getPaintClipPath,
        paintShapeWithCircleCutOut: paintShapeWithCircleCutOut,
    };
}

function paintShapeWithCircleCutOut(ctx: CanvasRenderingContext2D, shape: GameMapArea, circlePos: Position, circleRadius: number, game: Game) {
    const rectangle = shape as GameMapAreaRect;
    const cameraPosition = getCameraPosition(game);
    const rectTopLeft = getPointPaintPosition(ctx, rectangle, cameraPosition, game.UI.zoom, true);
    ctx.fillStyle = 'black';
    ctx.beginPath();
    let rectPath = getPaintClipPath(ctx, shape, game);
    ctx.save();
    ctx.clip(rectPath);
    ctx.lineTo(rectTopLeft.x, rectTopLeft.y);
    ctx.lineTo(rectTopLeft.x + rectangle.width, rectTopLeft.y);
    ctx.lineTo(rectTopLeft.x + rectangle.width, rectTopLeft.y + rectangle.height);
    ctx.lineTo(rectTopLeft.x, rectTopLeft.y + rectangle.height);
    ctx.lineTo(rectTopLeft.x, rectTopLeft.y);
    ctx.arc(circlePos.x, circlePos.y, circleRadius, 0, Math.PI * 2, true);
    ctx.lineTo(rectTopLeft.x, rectTopLeft.y);
    ctx.fill();
    ctx.restore();
}


function getArea(shape: GameMapArea): number {
    const rectangle = shape as GameMapAreaRect;
    return rectangle.height * rectangle.width;
}

function getMiddle(shape: GameMapArea): Position {
    const rectangle = shape as GameMapAreaRect;
    return {
        x: rectangle.x + rectangle.width / 2,
        y: rectangle.y + rectangle.height / 2,
    };
}

function setAreaToAmount(shape: GameMapArea, value: number) {
    const rectangle = shape as GameMapAreaRect;
    const squareSize = Math.sqrt(value);
    const sizeDiff = squareSize - rectangle.height;
    rectangle.height = squareSize;
    rectangle.width = squareSize;
    rectangle.x -= Math.floor(sizeDiff / 2);
    rectangle.y -= Math.floor(sizeDiff / 2);
}

function isPositionInside(shape: GameMapArea, position: Position): boolean {
    const rectangle = shape as GameMapAreaRect;
    const isInRect = position.x >= rectangle.x && position.x <= rectangle.x + rectangle.width
        && position.y >= rectangle.y && position.y <= rectangle.y + rectangle.height;
    return isInRect;
}

function getPaintClipPath(ctx: CanvasRenderingContext2D, shape: GameMapArea, game: Game): Path2D {
    const rectangle = shape as GameMapAreaRect;
    const cameraPosition = getCameraPosition(game);
    const rectTopLeft = getPointPaintPosition(ctx, rectangle, cameraPosition, game.UI.zoom, true);

    let rectPath = new Path2D();
    rectPath.lineTo(rectTopLeft.x, rectTopLeft.y);
    rectPath.lineTo(rectTopLeft.x + rectangle.width, rectTopLeft.y);
    rectPath.lineTo(rectTopLeft.x + rectangle.width, rectTopLeft.y + rectangle.height);
    rectPath.lineTo(rectTopLeft.x, rectTopLeft.y + rectangle.height);
    rectPath.lineTo(rectTopLeft.x, rectTopLeft.y);

    return rectPath;

}