import { getCelestialDirection } from "../../character/enemy/bossEnemy.js";
import { calculateDistance, getCameraPosition } from "../../game.js";
import { CelestialDirection, Game, Position } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { GAME_MAP_MODIFY_SHAPES_FUNCTIONS, GameMapArea } from "./mapModifierShapes.js";

export type GameMapAreaCelestialDirection = GameMapArea & {
    celestialDirection: CelestialDirection,
}

export const MODIFY_SHAPE_NAME_CELESTIAL_DIRECTION = "CelestialDirection";

export function addMapModifyShapeCelestialDirection() {
    GAME_MAP_MODIFY_SHAPES_FUNCTIONS[MODIFY_SHAPE_NAME_CELESTIAL_DIRECTION] = {
        isPositionInside: isPositionInside,
        getPaintClipPath: getPaintClipPath,
        paintShapeWithCircleCutOut: paintShapeWithCircleCutOut,
        getMiddle: getMiddle,
    };
}

function getMiddle(shape: GameMapArea, game: Game): Position {
    const celestialDirection = shape as GameMapAreaCelestialDirection;
    const kingArea = game.state.map.kingArea;
    if (kingArea === undefined) {
        throw "should not happen?";
    }
    const numberChunks = kingArea.numberChunksUntil;
    const chunkSize = game.state.map.chunkLength * game.state.map.tileSize;
    const distance = (numberChunks + kingArea.size / 2) * chunkSize;
    switch (celestialDirection.celestialDirection) {
        case "north":
            return {
                x: 0,
                y: -distance,
            }
        case "east":
            return {
                x: distance,
                y: 0,
            }
        case "south":
            return {
                x: 0,
                y: distance,
            }
        case "west":
            return {
                x: -distance,
                y: 0,
            }
    }
}

function paintShapeWithCircleCutOut(ctx: CanvasRenderingContext2D, shape: GameMapArea, circlePos: Position, circleRadius: number, game: Game) {
    const celestialDirection = shape as GameMapAreaCelestialDirection;
    const cameraPosition = getCameraPosition(game);
    const shapePoints: Position[] = getShapePoints(celestialDirection, game);
    ctx.fillStyle = 'black';
    ctx.beginPath();
    let rectPath = getPaintClipPath(ctx, shape, game);
    ctx.save();
    ctx.clip(rectPath);
    let firstPoint: Position | undefined = undefined;
    for (let point of shapePoints) {
        const paintPoint = getPointPaintPosition(ctx, point, cameraPosition, game.UI.zoom, true);
        if (!firstPoint) firstPoint = paintPoint;
        ctx.lineTo(paintPoint.x, paintPoint.y);
    }
    ctx.lineTo(firstPoint!.x, firstPoint!.y);
    ctx.arc(circlePos.x, circlePos.y, circleRadius, 0, Math.PI * 2, true);
    ctx.lineTo(firstPoint!.x, firstPoint!.y);

    ctx.fill();
    ctx.restore();
}

function getShapePoints(mapArea: GameMapAreaCelestialDirection, game: Game): Position[] {
    const chunkSize = game.state.map.tileSize * game.state.map.chunkLength;
    const centerOffset = Math.floor(chunkSize / 2);
    const startDistance = 200;
    const maxDistance = 1000000;
    const shapePoints: Position[] = [];
    switch (mapArea.celestialDirection) {
        case "north":
            shapePoints.push({ x: startDistance + centerOffset, y: -startDistance + centerOffset });
            shapePoints.push({ x: -startDistance + centerOffset, y: -startDistance + centerOffset });
            shapePoints.push({ x: -maxDistance + centerOffset, y: -maxDistance + centerOffset });
            shapePoints.push({ x: maxDistance + centerOffset, y: -maxDistance + centerOffset });
            break;
        case "east":
            shapePoints.push({ x: startDistance + centerOffset, y: startDistance + centerOffset });
            shapePoints.push({ x: startDistance + centerOffset, y: -startDistance + centerOffset });
            shapePoints.push({ x: maxDistance + centerOffset, y: -maxDistance + centerOffset });
            shapePoints.push({ x: maxDistance + centerOffset, y: maxDistance + centerOffset });
            break;
        case "south":
            shapePoints.push({ x: -startDistance + centerOffset, y: startDistance + centerOffset });
            shapePoints.push({ x: startDistance + centerOffset, y: startDistance + centerOffset });
            shapePoints.push({ x: maxDistance + centerOffset, y: maxDistance + centerOffset });
            shapePoints.push({ x: -maxDistance + centerOffset, y: maxDistance + centerOffset });
            break;
        case "west":
            shapePoints.push({ x: -startDistance + centerOffset, y: -startDistance + centerOffset });
            shapePoints.push({ x: -startDistance + centerOffset, y: startDistance + centerOffset });
            shapePoints.push({ x: -maxDistance + centerOffset, y: maxDistance + centerOffset });
            shapePoints.push({ x: -maxDistance + centerOffset, y: -maxDistance + centerOffset });
            break;
    }
    return shapePoints;
}

function isPositionInside(shape: GameMapArea, position: Position, game: Game): boolean {
    const celestialDirectionArea = shape as GameMapAreaCelestialDirection;
    const celDel = getCelestialDirection(position, game.state.map);
    const isInCelestialDirection = celDel === celestialDirectionArea.celestialDirection;
    return isInCelestialDirection;
}

function getPaintClipPath(ctx: CanvasRenderingContext2D, shape: GameMapArea, game: Game): Path2D {
    const celestialDirection = shape as GameMapAreaCelestialDirection;
    const cameraPosition = getCameraPosition(game);
    const shapePoints: Position[] = getShapePoints(celestialDirection, game);

    let rectPath = new Path2D();
    for (let point of shapePoints) {
        const paintPoint = getPointPaintPosition(ctx, point, cameraPosition, game.UI.zoom, true);
        rectPath.lineTo(paintPoint.x, paintPoint.y);
    }

    return rectPath;
}