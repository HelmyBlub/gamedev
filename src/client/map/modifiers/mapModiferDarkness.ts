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

function addOneTurnWallPoint(wallPoints: Position[], currentPoint: Position, turnDirection: Position, closerDirection: Position, map: GameMap, game: Game): Position | undefined {
    // TOP RIGHT
    // - - - - - - -
    // - - b b b - -
    // - - b b b b c 
    // - - b b - - -
    // - v - - - - -

    // BOTTOM RIGHT
    // - - - - - v -
    // - - - b b - -
    // c b b b b - - 
    // - - b b b - -
    // - - - - - - -

    // TOP LEFT
    // - - b - - - -
    // - - b - - - -
    // - - c - - - - 
    // - - b b - - -
    // - - - - - v -

    // TOP LEFT
    // - - b b - - -
    // - - c b - - -
    // - - - b - - - 
    // - - - - - - -
    // - - v - - - -

    const next1Turn1Closer = {
        x: currentPoint.x + turnDirection.x + closerDirection.x,
        y: currentPoint.y + turnDirection.y + closerDirection.y,
    };
    const next1Turn1CloserBlocking = isPositionBlocking(next1Turn1Closer, map, game.state.idCounter, game);
    if (next1Turn1CloserBlocking) {
        const nextCloser = { x: currentPoint.x + closerDirection.x, y: currentPoint.y + closerDirection.y };
        let isDuplicate = wallPoints.find(p => p.x === nextCloser.x && p.y === nextCloser.y);
        if (!isDuplicate) {
            return nextCloser;
        }
    }
    const next1Turn = { x: currentPoint.x + turnDirection.x, y: currentPoint.y + turnDirection.y };
    const next1TurnBlocking = isPositionBlocking(next1Turn, map, game.state.idCounter, game);
    if (!next1TurnBlocking) {
        const next1Turn1Away = {
            x: currentPoint.x + turnDirection.x - closerDirection.x,
            y: currentPoint.y + turnDirection.y - closerDirection.y
        };
        const next1Turn1AwayBlocking = isPositionBlocking(next1Turn1Away, map, game.state.idCounter, game);
        if (next1Turn1AwayBlocking) {
            const nextAway = { x: currentPoint.x - closerDirection.x, y: currentPoint.y - closerDirection.y };
            return nextAway;
        } else {
            return undefined;
        }
    }
    const next2Turn1Closer = {
        x: currentPoint.x + turnDirection.x * 2 + closerDirection.x,
        y: currentPoint.y + turnDirection.y * 2 + closerDirection.y
    };
    const next2Turn1CloserBlocking = isPositionBlocking(next2Turn1Closer, map, game.state.idCounter, game);
    if (next2Turn1CloserBlocking) {
        return next1Turn;
    }

    const next2Turn = { x: currentPoint.x + turnDirection.x * 2, y: currentPoint.y + turnDirection.y * 2 };
    const next2TurnBlocking = isPositionBlocking(next2Turn, map, game.state.idCounter, game);
    if (next2TurnBlocking) {
        return next1Turn;
    }
    const next2Turn1Away = {
        x: currentPoint.x + turnDirection.x * 2 - closerDirection.x,
        y: currentPoint.y + turnDirection.y * 2 - closerDirection.y
    };
    const next2Turn1AwayBlocking = isPositionBlocking(next2Turn1Away, map, game.state.idCounter, game);
    if (!next2Turn1AwayBlocking) {
        const nextAway = { x: currentPoint.x - closerDirection.x, y: currentPoint.y - closerDirection.y };
        return nextAway;
    }

    return undefined;
}

function determineVisionWalls(blockingPos: Position, visionCenter: Position, visionRange: number, map: GameMap, game: Game): { wall: Position[], endAngle: number } | undefined {
    const wallPoints: Position[] = [];
    let clockWiseEndReached = false;
    let counterClockEndReached = false;
    const blockingRounded = {
        x: Math.floor(blockingPos.x),
        y: Math.floor(blockingPos.y),
    };
    const blockingTileTopLeft = {
        x: blockingRounded.x - modulo(blockingRounded.x, map.tileSize),
        y: blockingRounded.y - modulo(blockingRounded.y, map.tileSize),
    }

    // TODO: move based on view direction
    //      later steps need to check correct tile based on view direction
    const firstPoint = {
        x: visionCenter.x > blockingTileTopLeft.x ? blockingTileTopLeft.x : blockingTileTopLeft.x + map.tileSize,
        y: visionCenter.y > blockingTileTopLeft.y ? blockingTileTopLeft.y : blockingTileTopLeft.y + map.tileSize,
    };
    wallPoints.push(firstPoint);

    const directionLeft = { x: -map.tileSize, y: 0 };
    const directionRight = { x: map.tileSize, y: 0 };
    const directionUp = { x: 0, y: -map.tileSize };
    const directionDown = { x: 0, y: map.tileSize };
    while (!counterClockEndReached) {
        const currentPoint = wallPoints[0];
        let nextPoint: Position | undefined = undefined;
        if (visionCenter.y > currentPoint.y) {  //TOP
            if (visionCenter.x < currentPoint.x) { //RIGHT
                nextPoint = addOneTurnWallPoint(wallPoints, currentPoint, directionLeft, directionDown, map, game);
            } else { //LEFT
                nextPoint = addOneTurnWallPoint(wallPoints, currentPoint, directionDown, directionRight, map, game);
            }
        } else {  //Bottom
            if (visionCenter.x < currentPoint.x) { //RIGHT
                nextPoint = addOneTurnWallPoint(wallPoints, currentPoint, directionUp, directionLeft, map, game);
            } else { //LEFT
                nextPoint = addOneTurnWallPoint(wallPoints, currentPoint, directionRight, directionUp, map, game);
            }
        }
        if (nextPoint) {
            const isDuplicate = wallPoints.find(p => nextPoint && p.x === nextPoint.x && p.y === nextPoint.y);
            if (!isDuplicate) {
                const distance = calculateDistance(nextPoint, visionCenter);
                if (distance > visionRange) {
                    counterClockEndReached = true;
                    break;
                }
                wallPoints.unshift(nextPoint);
                continue;
            }
        }
        counterClockEndReached = true;
        break;
    }
    while (!clockWiseEndReached) {
        const currentPoint = wallPoints[wallPoints.length - 1];
        let nextPoint: Position | undefined = undefined;
        if (visionCenter.y > currentPoint.y) {  //TOP
            if (visionCenter.x < currentPoint.x) { //RIGHT
                nextPoint = addOneTurnWallPoint(wallPoints, currentPoint, directionDown, directionLeft, map, game);
            } else { //LEFT
                nextPoint = addOneTurnWallPoint(wallPoints, currentPoint, directionRight, directionDown, map, game);
            }
        } else {  //Bottom
            if (visionCenter.x < currentPoint.x) { //RIGHT
                nextPoint = addOneTurnWallPoint(wallPoints, currentPoint, directionLeft, directionUp, map, game);
            } else { //LEFT
                nextPoint = addOneTurnWallPoint(wallPoints, currentPoint, directionUp, directionRight, map, game);
            }
        }
        if (nextPoint) {
            let isDuplicate = wallPoints.find(p => nextPoint && p.x === nextPoint.x && p.y === nextPoint.y);
            if (!isDuplicate) {
                const distance = calculateDistance(nextPoint, visionCenter);
                if (distance > visionRange) {
                    clockWiseEndReached = true;
                    break;
                }
                wallPoints.push(nextPoint);
                continue;
            }
        }
        clockWiseEndReached = true;
        break;
    }




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
    let currentDirection = - Math.PI * 2;
    while (currentDirection < 0) {
        let nextDirection = currentDirection + defaultStepSize;
        const endPosition = { x: cameraPosition.x, y: cameraPosition.y };
        moveByDirectionAndDistance(endPosition, currentDirection, viewDistance, false);
        const blockingPos = getFirstBlockingGameMapTilePositionTouchingLine(map, cameraPosition, endPosition, game);
        if (!blockingPos) {
            currentDirection = nextDirection;
            continue;
        }
        const wallResult = determineVisionWalls(blockingPos, cameraPosition, viewDistance, map, game);
        if (wallResult === undefined) {
            currentDirection = nextDirection;
            console.log("should not happen");
            continue;
        }
        visionWalls.push(wallResult.wall);
        break;
        //currentDirection = currentDirection < wallResult.endAngle ? wallResult.endAngle + 0.1 : nextDirection;
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
