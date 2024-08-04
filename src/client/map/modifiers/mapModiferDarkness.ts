import { calculateDirection, calculateDistance, modulo } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { GameMap, getFirstBlockingGameMapTilePositionTouchingLine, getMapTile, isPositionBlocking, MapChunk, moveByDirectionAndDistance } from "../map.js";
import { GAME_MAP_MODIFIER_FUNCTIONS, GameMapArea, GameMapAreaCircle, GameMapAreaRect, GameMapModifier } from "./mapModifier.js";

export const MODIFIER_NAME_DARKNESS = "Darkness";
export type MapModifierDarkness = GameMapModifier & {
}

export function addMapModifierDarkness() {
    GAME_MAP_MODIFIER_FUNCTIONS[MODIFIER_NAME_DARKNESS] = {
        onChunkCreateModify: onChunkCreateModify,
        paintModiferLate: paintModiferLate,
    };
}

export function createMapModifierDarkness(
    area: GameMapArea,
): MapModifierDarkness {
    return {
        type: MODIFIER_NAME_DARKNESS,
        area: area,
    };
}

function onChunkCreateModify(mapChunk: MapChunk, chunkX: number, chunkY: number, game: Game) {
    if (mapChunk.mapModifiers === undefined) mapChunk.mapModifiers = [];
    if (mapChunk.mapModifiers.find(m => m === MODIFIER_NAME_DARKNESS)) return;
    mapChunk.mapModifiers.push(MODIFIER_NAME_DARKNESS);
}

function rectangleWithCircleCutOut(ctx: CanvasRenderingContext2D, rectTopLeft: Position, rectWidth: number, rectHeight: number, circlePos: Position, circleRadius: number) {
    ctx.fillStyle = 'black';
    ctx.beginPath();
    let rectPath = new Path2D();
    rectPath.lineTo(rectTopLeft.x, rectTopLeft.y);
    rectPath.lineTo(rectTopLeft.x + rectWidth, rectTopLeft.y);
    rectPath.lineTo(rectTopLeft.x + rectWidth, rectTopLeft.y + rectHeight);
    rectPath.lineTo(rectTopLeft.x, rectTopLeft.y + rectHeight);
    rectPath.lineTo(rectTopLeft.x, rectTopLeft.y);
    ctx.save();
    ctx.clip(rectPath);
    ctx.lineTo(rectTopLeft.x, rectTopLeft.y);
    ctx.lineTo(rectTopLeft.x + rectWidth, rectTopLeft.y);
    ctx.lineTo(rectTopLeft.x + rectWidth, rectTopLeft.y + rectHeight);
    ctx.lineTo(rectTopLeft.x, rectTopLeft.y + rectHeight);
    ctx.lineTo(rectTopLeft.x, rectTopLeft.y);
    ctx.arc(circlePos.x, circlePos.y, circleRadius, 0, Math.PI * 2, true);
    ctx.lineTo(rectTopLeft.x, rectTopLeft.y);
    ctx.fill();
    ctx.restore();
}

function paintModiferLate(ctx: CanvasRenderingContext2D, modifier: GameMapModifier, cameraPosition: Position, game: Game) {
    paintModiferLateV4(ctx, modifier, cameraPosition, game);
}

function determineVisionWalls(blockingPos: Position, visionCenter: Position, map: GameMap, game: Game): { wall: Position[], endAngle: number } | undefined {
    const wallPoints: Position[] = [];
    let clockWiseEndReached = false;
    let counterClockEndReached = false;
    const tileTopLeft = {
        x: Math.round(blockingPos.x),
        y: Math.round(blockingPos.y),
    };
    tileTopLeft.x = blockingPos.x - modulo(blockingPos.x, map.tileSize);
    tileTopLeft.y = blockingPos.y - modulo(blockingPos.y, map.tileSize);

    const firstPoint = {
        x: visionCenter.x > tileTopLeft.x ? tileTopLeft.x : tileTopLeft.x + map.tileSize,
        y: visionCenter.y > tileTopLeft.y ? tileTopLeft.y : tileTopLeft.y + map.tileSize,
    };
    wallPoints.push(firstPoint);

    while (!counterClockEndReached) {
        const currentPoint = wallPoints[0];
        if (visionCenter.y > currentPoint.y) {  //TOP
            if (visionCenter.x < currentPoint.x) { //RIGHT
                const nextLeft = { x: currentPoint.x - map.tileSize, y: currentPoint.y };
                const nextLeftBlocking = isPositionBlocking(nextLeft, map, game.state.idCounter, game);
                const next2Left = { x: currentPoint.x - map.tileSize * 2, y: currentPoint.y };
                const next2LeftBlocking = isPositionBlocking(next2Left, map, game.state.idCounter, game);
                if (next2LeftBlocking) {
                    wallPoints.unshift(nextLeft);
                    continue;
                } else {
                    const next2Left1Top = { x: currentPoint.x - map.tileSize * 2, y: currentPoint.y - map.tileSize };
                    const next2Left1TopBlocking = isPositionBlocking(next2Left1Top, map, game.state.idCounter, game);
                    if (!next2Left1TopBlocking) {
                        const nextTop = { x: currentPoint.x, y: currentPoint.y - map.tileSize };
                        wallPoints.unshift(nextTop);
                        continue;
                    }
                }
            }
        }
        counterClockEndReached = true;
        break;
    }
    while (!clockWiseEndReached && false) {
        const currentPoint = wallPoints[wallPoints.length - 1];
        if (visionCenter.y > currentPoint.y) {  //TOP
            if (visionCenter.x < currentPoint.x) { //RIGHT
                const nextBottom = { x: currentPoint.x, y: currentPoint.y + map.tileSize };
                const nextBottomBlocking = isPositionBlocking(nextBottom, map, game.state.idCounter, game);
                const next2Bottom = { x: currentPoint.x, y: currentPoint.y + map.tileSize * 2 };
                const next2BottomBlocking = isPositionBlocking(next2Bottom, map, game.state.idCounter, game);
                if (next2BottomBlocking) {
                    wallPoints.push(nextBottom);
                    continue;
                } else {
                    const next2Bottom1Right = { x: currentPoint.x + map.tileSize, y: currentPoint.y + map.tileSize * 2 };
                    const next2Bottom1RightBlocking = isPositionBlocking(next2Bottom1Right, map, game.state.idCounter, game);
                    if (!next2Bottom1RightBlocking) {
                        const nextRight = { x: currentPoint.x + map.tileSize, y: currentPoint.y };
                        wallPoints.push(nextRight);
                        continue;
                    }
                }
            }
        }
        clockWiseEndReached = true;
        break;
    }


    // - - - b b
    // - b - b b
    // - - b - -
    // - - v - -


    if (wallPoints.length < 2) {
        return undefined;
    }
    const endAngle = calculateDirection(visionCenter, wallPoints[wallPoints.length - 1]);
    return { wall: wallPoints, endAngle: endAngle };
}

function paintModiferLateV4(ctx: CanvasRenderingContext2D, modifier: GameMapModifier, cameraPosition: Position, game: Game) {
    const map = game.state.map;
    const rect: GameMapAreaRect = modifier.area as GameMapAreaRect;
    const topLeftPaint = getPointPaintPosition(ctx, rect, cameraPosition);
    ctx.fillStyle = "black";
    const viewDistance = 300;
    let leftView = Math.floor(rect.x - modulo(rect.x, map.tileSize));
    let topView = Math.floor(rect.y - modulo(rect.y, map.tileSize));
    let rightView = rect.x + rect.width;
    let bottomView = rect.y + rect.height;
    //top black
    if (cameraPosition.y - viewDistance > rect.y) {
        const blackHeightAboveCamera = Math.min(cameraPosition.y - viewDistance - rect.y, rect.height);
        topView += Math.floor(blackHeightAboveCamera - blackHeightAboveCamera % map.tileSize);
    }
    //bottom black
    if (cameraPosition.y + viewDistance < rect.y + rect.height) {
        const blackHeightBelowCamera = Math.min((rect.y + rect.height) - cameraPosition.y - viewDistance, rect.height);
        bottomView -= Math.floor(blackHeightBelowCamera - blackHeightBelowCamera % map.tileSize);
    }
    //left black
    if (cameraPosition.x - viewDistance > rect.x) {
        const blackWidthLeftCamera = Math.min(cameraPosition.x - viewDistance - rect.x, rect.width);
        leftView += Math.floor(blackWidthLeftCamera - blackWidthLeftCamera % map.tileSize);
    }
    //right black
    if (cameraPosition.x + viewDistance < rect.x + rect.width) {
        const blackWidthRightCamera = Math.min((rect.x + rect.width) - cameraPosition.x - viewDistance, rect.width);
        rightView -= Math.floor(blackWidthRightCamera - blackWidthRightCamera % map.tileSize);
    }

    const viewPaintMiddle = getPointPaintPosition(ctx, cameraPosition, cameraPosition);
    rectangleWithCircleCutOut(ctx, topLeftPaint, rect.width, rect.height, viewPaintMiddle, viewDistance);

    const visionWalls: Position[][] = [];
    const defaultStepSize = Math.PI * 2 / 50;
    let currentDirection = - Math.PI;
    while (currentDirection < 0) {
        let nextDirection = currentDirection + defaultStepSize;
        const endPosition = { x: cameraPosition.x, y: cameraPosition.y };
        moveByDirectionAndDistance(endPosition, currentDirection, viewDistance, false);
        const blockingPos = getFirstBlockingGameMapTilePositionTouchingLine(map, cameraPosition, endPosition, game);
        if (!blockingPos) {
            currentDirection = nextDirection;
            continue;
        }
        const wallResult = determineVisionWalls(blockingPos, cameraPosition, map, game);
        if (wallResult === undefined) {
            currentDirection = nextDirection;
            console.log("should not happen");
            continue;
        }
        visionWalls.push(wallResult.wall);
        break;
        //currentDirection = currentDirection < wallResult.endAngle ? wallResult.endAngle + 0.1 : nextDirection;
    }
    //connect walls together
    for (let positionOrder of visionWalls) {
        if (positionOrder.length === 0) continue;
    }


    //paint black
    let rectPath = new Path2D();
    rectPath.lineTo(topLeftPaint.x, topLeftPaint.y);
    rectPath.lineTo(topLeftPaint.x + rect.width, topLeftPaint.y);
    rectPath.lineTo(topLeftPaint.x + rect.width, topLeftPaint.y + rect.height);
    rectPath.lineTo(topLeftPaint.x, topLeftPaint.y + rect.height);
    rectPath.lineTo(topLeftPaint.x, topLeftPaint.y);
    ctx.save();
    ctx.clip(rectPath);

    for (let positionOrder of visionWalls) {
        if (positionOrder.length === 0) continue;
        ctx.beginPath();
        const startPaint = getPointPaintPosition(ctx, positionOrder[0], cameraPosition);
        ctx.moveTo(startPaint.x, startPaint.y);
        let curPaintPoint;
        for (let i = 1; i < positionOrder.length; i++) {
            curPaintPoint = getPointPaintPosition(ctx, positionOrder[i], cameraPosition);
            ctx.lineTo(curPaintPoint.x, curPaintPoint.y);
        }
        if (!curPaintPoint) continue;
        let movedLastPos = { x: curPaintPoint.x, y: curPaintPoint.y };
        const lastDirection = calculateDirection(cameraPosition, positionOrder[positionOrder.length - 1]);
        moveByDirectionAndDistance(movedLastPos, lastDirection, viewDistance, false);
        ctx.lineTo(movedLastPos.x, movedLastPos.y);

        let movedStartPos = { x: startPaint.x, y: startPaint.y };
        const startDirection = calculateDirection(cameraPosition, positionOrder[0]);
        moveByDirectionAndDistance(movedStartPos, startDirection, viewDistance, false);
        ctx.arc(viewPaintMiddle.x, viewPaintMiddle.y, viewDistance + 1, lastDirection, startDirection, true);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}
