import { calculateDirection, calculateDistance, modulo } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { GameMap, getFirstBlockingGameMapTilePositionTouchingLine, getMapTile, isPositionBlocking, MapChunk, moveByDirectionAndDistance, positionToGameMapTileXY } from "../map.js";
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
    // ray cast 360 degress
    // when blocking tile hit
    // move along blocking tile edges to determine black points
    // by checking each adjacent points with "isValidVisionPoint"

}

function isValidVisionPoint(pointInQuestion: Position, visionCenter: Position, map: GameMap, game: Game): boolean {
    let closerDirecitonClock: Position = { x: 0, y: 0 };
    let closerDirectionCounterClock: Position = { x: 0, y: 0 };
    let tileCheckAdd: Position = { x: 0, y: 0 };
    if (pointInQuestion.x < visionCenter.x) { // Top
        if (pointInQuestion.y > visionCenter.y) { // Right
            closerDirecitonClock = { x: 0, y: map.tileSize };
            closerDirectionCounterClock = { x: -map.tileSize, y: 0 };
            tileCheckAdd = { x: -map.tileSize / 2, y: map.tileSize / 2 };
        } else { //Left
            closerDirecitonClock = { x: map.tileSize, y: 0 };
            closerDirectionCounterClock = { x: 0, y: map.tileSize };
            tileCheckAdd = { x: map.tileSize / 2, y: map.tileSize / 2 };
        }
    } else { //Bottom
        if (pointInQuestion.y > visionCenter.y) { // Right
            closerDirecitonClock = { x: -map.tileSize, y: 0 };
            closerDirectionCounterClock = { x: 0, y: -map.tileSize };
            tileCheckAdd = { x: -map.tileSize / 2, y: -map.tileSize / 2 };
        } else { //Left
            closerDirecitonClock = { x: 0, y: -map.tileSize };
            closerDirectionCounterClock = { x: map.tileSize, y: 0 };
            tileCheckAdd = { x: map.tileSize / 2, y: -map.tileSize / 2 };
        }
    }
    const currentTile = {
        x: pointInQuestion.x + tileCheckAdd.x,
        y: pointInQuestion.y + tileCheckAdd.y
    }
    // b = blocking tile
    // x = pointInQuestion, blocking or non blocking does not matter
    // c = pointInQuestion, blocking tile
    // p = pointInQuestion, non blocking tile
    // - = walkable tile
    // Rule 1: if closerClock and closerCounterClock blocking => return false
    // - - - - - - -
    // - - - b x - -
    // - - - - b - -
    // - - - - - - -
    // - v - - - - -
    const nextCloserClockTile = {
        x: currentTile.x + closerDirecitonClock.x,
        y: currentTile.y + closerDirecitonClock.y,
    };
    const nextCloserClockTileBlocking = isPositionBlocking(nextCloserClockTile, map, game.state.idCounter, game);
    const nextCloserCounterClockTile = {
        x: currentTile.x + closerDirectionCounterClock.x,
        y: currentTile.y + closerDirectionCounterClock.y,
    };
    const nextCloserCounterClockTileBlocking = isPositionBlocking(nextCloserCounterClockTile, map, game.state.idCounter, game);
    if (nextCloserClockTileBlocking && nextCloserCounterClockTileBlocking) return false;

    // Rule 2: ray cast from vision center to pointInQuestion for blocking tile
    const rayCastBlockingPos = getFirstBlockingGameMapTilePositionTouchingLine(map, visionCenter, pointInQuestion, game);
    if (rayCastBlockingPos !== undefined) {
        // Rule 2.1 If hit tile is pointInQuestion  => return true
        // - - - - - - -
        // - - - b c - -
        // - - - - - - -
        // - - - - - - -
        // - v - - - - -
        const rayCastBlockingTile = positionToGameMapTileXY(map, rayCastBlockingPos);
        const pointInQuestionTile = positionToGameMapTileXY(map, currentTile);
        if (rayCastBlockingTile.x === pointInQuestionTile.x && rayCastBlockingTile.y === pointInQuestionTile.y) return true;
    } else {
        // Rule 2.2: If no tile was hit and away1,away2 is not blocking => return true
        // - - - - - - -
        // - - - b - - -
        // - - - p - - -
        // - - - - - - -
        // - v - - - - -
        const nextAwayDiagonalTile = {
            x: currentTile.x - closerDirecitonClock.x - closerDirectionCounterClock.x,
            y: currentTile.y - closerDirecitonClock.y - closerDirectionCounterClock.y,
        };
        const nextAwayDiagonalTileBlocking = isPositionBlocking(nextAwayDiagonalTile, map, game.state.idCounter, game);
        if (!nextAwayDiagonalTileBlocking) return true;
        // Rule 2.3: If no tile was hit and away1,away2 is blocking => return false
        // - - - - - - -
        // - - - b b - -
        // - - - p - - -
        // - - - - - - -
        // - v - - - - -
        return false;
    }
    return false; //TODO do later rules
    // ray cast to pointInQuestion did not hit tile of pointInQuestion

    // Rule 3: hit title is adjacent to pointInQuestion 
    // 3.1: 
    // - - - - b c -
    // - - - - - - -
    // - v b - - - -
    // Rule 3.2: hit title is adjacent to pointInQuestion and is pointInQuestion is non blocking  => return 
    // - - - - b - -
    // - - - b p b -
    // - v - - - - -

}

function addOneTurnWallPoint(wallPoints: Position[], currentPoint: Position, turnDirection: Position, closerDirection: Position, tileCheckAdd: Position, map: GameMap, game: Game): Position | undefined {
    // TOP RIGHT Counter Clock
    // b = blocking tile
    // v = vision center
    // l = last visited blocking tiles
    // c = current tile
    // n = current tile not blocking
    // Rule 1.1: is current not blocking, away not blocking => ending
    // - - - - - - -
    // - - - n l l - 
    // - - - - - - -
    // - v - - - - -

    // Rule 1.2: is current not blocking, away is blocking => move up
    // - - - b - - -
    // - - - n l l - 
    // - - - - - - -
    // - v - - - - -

    //---- for all later => current is blocking because of #1 ----

    // Rule 2: is left blocking => move left 
    // - - - - - - -
    // - - - b c l - 
    // - - - - - - -
    // - v - - - - -

    // Rule 3.1: is top left blocking => move left
    // - - - b - - -
    // - - - - c l - 
    // - - - - - - -
    // - v - - - - -

    // Rule 3.2: is top blocking & top left not blocking => move up
    // - - - - b - -
    // - - - - c l - 
    // - - - - - - -
    // - v - - - - -

    // Rule 4: => move left
    // - - - - - - -
    // - - - - c l - 
    // - - - - - - -
    // - v - - - - -

    const currentTile = {
        x: currentPoint.x + tileCheckAdd.x,
        y: currentPoint.y + tileCheckAdd.y
    }
    //#1
    const currentTileBlocking = isPositionBlocking(currentTile, map, game.state.idCounter, game);
    const next1AwayTile = {
        x: currentTile.x - closerDirection.x,
        y: currentTile.y - closerDirection.y,
    };
    if (!currentTileBlocking) {
        const next1AwayTileBlocking = isPositionBlocking(next1AwayTile, map, game.state.idCounter, game);
        if (!next1AwayTileBlocking) return undefined;
        const nextAway = { x: currentPoint.x - closerDirection.x, y: currentPoint.y - closerDirection.y };
        return nextAway;
    }
    //#2
    const next1TurnTile = {
        x: currentTile.x + turnDirection.x,
        y: currentTile.y + turnDirection.y,
    };
    const next1TurnTileBlocking = isPositionBlocking(next1TurnTile, map, game.state.idCounter, game);
    if (next1TurnTileBlocking) {
        const nextTurn = { x: currentPoint.x + turnDirection.x, y: currentPoint.y + turnDirection.y };
        return nextTurn;
    }
    //#3.1
    const next1Turn1AwayTile = {
        x: currentTile.x + turnDirection.x - closerDirection.x,
        y: currentTile.y + turnDirection.y - closerDirection.y,
    };
    const next1Turn1AwayTileBlocking = isPositionBlocking(next1Turn1AwayTile, map, game.state.idCounter, game);
    if (next1Turn1AwayTileBlocking) {
        const nextTurn = { x: currentPoint.x + turnDirection.x, y: currentPoint.y + turnDirection.y };
        return nextTurn;
    }

    //#3.2
    const next1AwayTileBlocking = isPositionBlocking(next1AwayTile, map, game.state.idCounter, game);
    if (next1AwayTileBlocking) {
        const nextAway = { x: currentPoint.x - closerDirection.x, y: currentPoint.y - closerDirection.y };
        return nextAway;
    }
    //#4
    const nextTurn = { x: currentPoint.x + turnDirection.x, y: currentPoint.y + turnDirection.y };
    return nextTurn;
}

function determineVisionWallsV2(blockingPos: Position, visionCenter: Position, visionRange: number, map: GameMap, game: Game): Position[] | undefined {
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

    const firstPoint = {
        x: visionCenter.x > blockingTileTopLeft.x ? blockingTileTopLeft.x : blockingTileTopLeft.x + map.tileSize,
        y: visionCenter.y > blockingTileTopLeft.y ? blockingTileTopLeft.y : blockingTileTopLeft.y + map.tileSize,
    };
    wallPoints.push(firstPoint);

    while (!counterClockEndReached) {
        const currentPoint = wallPoints[0];
        let nextPoint: Position | undefined = undefined;
        if (visionCenter.y > currentPoint.y) {  //TOP
            if (visionCenter.x < currentPoint.x) { //RIGHT
                const leftPoint = { x: currentPoint.x - map.tileSize, y: currentPoint.y };
                if (isValidVisionPoint(leftPoint, visionCenter, map, game)) {
                    nextPoint = leftPoint;
                } else {
                    const topPoint = { x: currentPoint.x, y: currentPoint.y - map.tileSize };
                    if (isValidVisionPoint(topPoint, visionCenter, map, game)) {
                        nextPoint = topPoint;
                    }
                }
            } else { //LEFT
                const leftPoint = { x: currentPoint.x - map.tileSize, y: currentPoint.y };
                if (isValidVisionPoint(leftPoint, visionCenter, map, game)) {
                    nextPoint = leftPoint;
                } else {
                    const downPoint = { x: currentPoint.x, y: currentPoint.y + map.tileSize };
                    if (isValidVisionPoint(downPoint, visionCenter, map, game)) {
                        nextPoint = downPoint;
                    }
                }
            }
        } else {  //Bottom
            if (visionCenter.x < currentPoint.x) { //RIGHT
                const rightPoint = { x: currentPoint.x + map.tileSize, y: currentPoint.y };
                if (isValidVisionPoint(rightPoint, visionCenter, map, game)) {
                    nextPoint = rightPoint;
                } else {
                    const topPoint = { x: currentPoint.x, y: currentPoint.y - map.tileSize };
                    if (isValidVisionPoint(topPoint, visionCenter, map, game)) {
                        nextPoint = topPoint;
                    }
                }
            } else { //LEFT
                const rightPoint = { x: currentPoint.x + map.tileSize, y: currentPoint.y };
                if (isValidVisionPoint(rightPoint, visionCenter, map, game)) {
                    nextPoint = rightPoint;
                } else {
                    const bottomPoint = { x: currentPoint.x, y: currentPoint.y + map.tileSize };
                    if (isValidVisionPoint(bottomPoint, visionCenter, map, game)) {
                        nextPoint = bottomPoint;
                    }
                }
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
                const rightPoint = { x: currentPoint.x + map.tileSize, y: currentPoint.y };
                if (isValidVisionPoint(rightPoint, visionCenter, map, game)) {
                    nextPoint = rightPoint;
                } else {
                    const bottomPoint = { x: currentPoint.x, y: currentPoint.y + map.tileSize };
                    if (isValidVisionPoint(bottomPoint, visionCenter, map, game)) {
                        nextPoint = bottomPoint;
                    }
                }
            } else { //LEFT
                const rightPoint = { x: currentPoint.x + map.tileSize, y: currentPoint.y };
                if (isValidVisionPoint(rightPoint, visionCenter, map, game)) {
                    nextPoint = rightPoint;
                } else {
                    const topPoint = { x: currentPoint.x, y: currentPoint.y - map.tileSize };
                    if (isValidVisionPoint(topPoint, visionCenter, map, game)) {
                        nextPoint = topPoint;
                    }
                }
            }
        } else {  //Bottom
            if (visionCenter.x < currentPoint.x) { //RIGHT
                const leftPoint = { x: currentPoint.x - map.tileSize, y: currentPoint.y };
                if (isValidVisionPoint(leftPoint, visionCenter, map, game)) {
                    nextPoint = leftPoint;
                } else {
                    const bottomPoint = { x: currentPoint.x, y: currentPoint.y + map.tileSize };
                    if (isValidVisionPoint(bottomPoint, visionCenter, map, game)) {
                        nextPoint = bottomPoint;
                    }
                }
            } else { //LEFT
                const leftPoint = { x: currentPoint.x - map.tileSize, y: currentPoint.y };
                if (isValidVisionPoint(leftPoint, visionCenter, map, game)) {
                    nextPoint = leftPoint;
                } else {
                    const topPoint = { x: currentPoint.x, y: currentPoint.y + map.tileSize };
                    if (isValidVisionPoint(topPoint, visionCenter, map, game)) {
                        nextPoint = topPoint;
                    }
                }
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
    return wallPoints;
}

function determineVisionWalls(blockingPos: Position, visionCenter: Position, visionRange: number, map: GameMap, game: Game): Position[] | undefined {
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

    const firstPoint = {
        x: visionCenter.x > blockingTileTopLeft.x ? blockingTileTopLeft.x : blockingTileTopLeft.x + map.tileSize,
        y: visionCenter.y > blockingTileTopLeft.y ? blockingTileTopLeft.y : blockingTileTopLeft.y + map.tileSize,
    };
    wallPoints.push(firstPoint);

    const directionLeft = { x: -map.tileSize, y: 0 };
    const directionRight = { x: map.tileSize, y: 0 };
    const directionUp = { x: 0, y: -map.tileSize };
    const directionDown = { x: 0, y: map.tileSize };
    const tileTopLeft = { x: - map.tileSize / 2, y: - map.tileSize / 2 };
    const tileTopRight = { x: map.tileSize / 2, y: - map.tileSize / 2 };
    const tileBottomLeft = { x: - map.tileSize / 2, y: map.tileSize / 2 };
    const tileBottomRight = { x: map.tileSize / 2, y: map.tileSize / 2 };
    while (!counterClockEndReached) {
        const currentPoint = wallPoints[0];
        let nextPoint: Position | undefined = undefined;
        if (visionCenter.y > currentPoint.y) {  //TOP
            if (visionCenter.x < currentPoint.x) { //RIGHT
                nextPoint = addOneTurnWallPoint(wallPoints, currentPoint, directionLeft, directionDown, tileBottomLeft, map, game);
            } else { //LEFT
                nextPoint = addOneTurnWallPoint(wallPoints, currentPoint, directionDown, directionRight, tileBottomRight, map, game);
            }
        } else {  //Bottom
            if (visionCenter.x < currentPoint.x) { //RIGHT
                nextPoint = addOneTurnWallPoint(wallPoints, currentPoint, directionUp, directionLeft, tileTopLeft, map, game);
            } else { //LEFT
                nextPoint = addOneTurnWallPoint(wallPoints, currentPoint, directionRight, directionUp, tileTopRight, map, game);
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
                nextPoint = addOneTurnWallPoint(wallPoints, currentPoint, directionDown, directionLeft, tileBottomLeft, map, game);
            } else { //LEFT
                nextPoint = addOneTurnWallPoint(wallPoints, currentPoint, directionRight, directionDown, tileBottomRight, map, game);
            }
        } else {  //Bottom
            if (visionCenter.x < currentPoint.x) { //RIGHT
                nextPoint = addOneTurnWallPoint(wallPoints, currentPoint, directionLeft, directionUp, tileTopLeft, map, game);
            } else { //LEFT
                nextPoint = addOneTurnWallPoint(wallPoints, currentPoint, directionUp, directionRight, tileTopRight, map, game);
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
    return wallPoints;
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
    let currentDirection = - Math.PI * 3 / 2;
    while (currentDirection < Math.PI / 2) {
        let nextDirection = currentDirection + defaultStepSize;
        const endPosition = { x: cameraPosition.x, y: cameraPosition.y };
        moveByDirectionAndDistance(endPosition, currentDirection, viewDistance, false);
        const blockingPos = getFirstBlockingGameMapTilePositionTouchingLine(map, cameraPosition, endPosition, game);
        if (!blockingPos) {
            currentDirection = nextDirection;
            continue;
        }
        const wallResult = determineVisionWallsV2(blockingPos, cameraPosition, viewDistance, map, game);
        if (wallResult === undefined) {
            // wall to close to max vision range
            currentDirection = nextDirection;
            continue;
        }
        visionWalls.push(wallResult);
        const endAngle = calculateDirection(cameraPosition, wallResult[wallResult.length - 1]);
        currentDirection = currentDirection < endAngle + 0.1 ? endAngle + 0.1 : nextDirection;
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
