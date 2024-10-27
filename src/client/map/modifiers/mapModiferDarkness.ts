import { createDefaultAreaBossWithLevel } from "../../character/enemy/areaBoss/areaBossEnemy.js";
import { calculateDirection, calculateDistance, getNextId, modulo } from "../../game.js";
import { Game, IdCounter, Position } from "../../gameModel.js";
import { getPointPaintPosition, paintTextWithOutline } from "../../gamePaint.js";
import { chunkXYToMapKey, GameMap, getFirstBlockingGameMapTilePositionTouchingLine, isPositionBlocking, MapChunk, mapKeyAndTileXYToPosition, moveByDirectionAndDistance, positionToGameMapTileXY } from "../map.js";
import { MODIFY_SHAPE_NAME_CIRCLE } from "./mapShapeCircle.js";
import { GAME_MAP_MODIFIER_FUNCTIONS, GameMapModifier } from "./mapModifier.js";
import { GameMapArea, getShapeArea, getShapeMiddle, getShapePaintClipPath, paintShapeWithCircleCutOut, setShapeAreaToAmount } from "./mapModifierShapes.js";
import { GameMapAreaRect, MODIFY_SHAPE_NAME_RECTANGLE } from "./mapShapeRectangle.js";
import { createAreaBossDarknessSpiderWithLevel } from "../../character/enemy/areaBoss/areaBossDarknessSpider.js";

export const MODIFIER_NAME_DARKNESS = "Darkness";
export type MapModifierDarkness = GameMapModifier & {
    level: number,
    areaPerLevel?: number,
}

export function addMapModifierDarkness() {
    GAME_MAP_MODIFIER_FUNCTIONS[MODIFIER_NAME_DARKNESS] = {
        onChunkCreateModify: onChunkCreateModify,
        onGameInit: onGameInit,
        paintModiferLate: paintModiferLate,
        growArea: growArea,
    };
}

export function createMapModifierDarkness(
    area: GameMapArea,
    idCounter: IdCounter,
): MapModifierDarkness {
    return {
        id: getNextId(idCounter),
        type: MODIFIER_NAME_DARKNESS,
        area: area,
        areaPerLevel: 1000000,
        level: 1,
    };
}

export function mapModifierDarknessDarknesChunkPaint(ctx: CanvasRenderingContext2D, modifier: GameMapModifier, chunkXY: Position, tileX: number, tileY: number, paintX: number, paintY: number, tileSize: number, game: Game) {
    const area = getShapeArea(modifier.area);
    if (area === undefined) return;
    const maxDistance = 2000;
    const darkestSize = 1000;
    if (area > Math.pow(maxDistance + darkestSize, 2) * Math.PI) {
        const middle = getShapeMiddle(modifier.area);
        if (middle === undefined) return;
        const chunkKey = chunkXYToMapKey(chunkXY.x, chunkXY.y);
        const tilePosition = mapKeyAndTileXYToPosition(chunkKey, tileX, tileY, game.state.map)
        const totalDistance = Math.min(calculateDistance(middle, tilePosition), maxDistance + darkestSize);
        const distance = Math.max(totalDistance - darkestSize, 0);
        const maxAlpha = 0.30;
        const alpha = maxAlpha - (distance / maxDistance * maxAlpha);
        if (alpha > 0) {
            ctx.fillStyle = "black";
            ctx.globalAlpha *= alpha;
            ctx.fillRect(paintX, paintY, tileSize, tileSize);
            ctx.globalAlpha /= alpha;
        }
    }
}

function onGameInit(modifier: GameMapModifier, game: Game) {
    let spawn: Position | undefined = undefined;

    if (modifier.area.type === MODIFY_SHAPE_NAME_RECTANGLE || modifier.area.type === MODIFY_SHAPE_NAME_CIRCLE) {
        const area = modifier.area as GameMapAreaRect;
        if (game.state.activeCheats && game.state.activeCheats.indexOf("closeCurseDarkness") !== -1) {
            area.x = -2000;
            area.y = -2000;
        }
    }
    spawn = getShapeMiddle(modifier.area);
    if (spawn === undefined) return;
    const areaBoss = createAreaBossDarknessSpiderWithLevel(game.state.idCounter, spawn, modifier.id, game);

    game.state.bossStuff.bosses.push(areaBoss);
}

function growArea(modifier: GameMapModifier) {
    const modifierDarkness = modifier as MapModifierDarkness;
    modifierDarkness.level++;
    if (modifierDarkness.areaPerLevel === undefined) return;
    const areaAmount = modifierDarkness.level * modifierDarkness.areaPerLevel;
    setShapeAreaToAmount(modifierDarkness.area, areaAmount);
}

function onChunkCreateModify(mapChunk: MapChunk, chunkX: number, chunkY: number, game: Game) {
    if (mapChunk.mapModifiers === undefined) mapChunk.mapModifiers = [];
    if (mapChunk.mapModifiers.find(m => m === MODIFIER_NAME_DARKNESS)) return;
    mapChunk.mapModifiers.push(MODIFIER_NAME_DARKNESS);
}

function isValidVisionPoint(pointInQuestion: Position, visionCenter: Position, map: GameMap, game: Game): boolean {
    let closerDirecitonClock: Position = { x: 0, y: 0 };
    let closerDirectionCounterClock: Position = { x: 0, y: 0 };
    let tileCheckAdd: Position = { x: 0, y: 0 };
    if (pointInQuestion.y <= visionCenter.y) { // Top
        if (pointInQuestion.x > visionCenter.x) { // Right
            closerDirecitonClock = { x: 0, y: map.tileSize };
            closerDirectionCounterClock = { x: -map.tileSize, y: 0 };
            tileCheckAdd = { x: -map.tileSize / 2, y: map.tileSize / 2 };
        } else { //Left
            closerDirecitonClock = { x: map.tileSize, y: 0 };
            closerDirectionCounterClock = { x: 0, y: map.tileSize };
            tileCheckAdd = { x: map.tileSize / 2, y: map.tileSize / 2 };
        }
    } else { //Bottom
        if (pointInQuestion.x > visionCenter.x) { // Right
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
    const currentTileBlocking = isPositionBlocking(currentTile, map, game.state.idCounter, game);
    const nextAwayDiagonalTile = {
        x: currentTile.x - closerDirecitonClock.x - closerDirectionCounterClock.x,
        y: currentTile.y - closerDirecitonClock.y - closerDirectionCounterClock.y,
    };
    const nextAwayDiagonalTileBlocking = isPositionBlocking(nextAwayDiagonalTile, map, game.state.idCounter, game);
    const nextAwayClockTile = {
        x: currentTile.x - closerDirectionCounterClock.x,
        y: currentTile.y - closerDirectionCounterClock.y,
    };
    const nextAwayClockTileBlocking = isPositionBlocking(nextAwayClockTile, map, game.state.idCounter, game);
    const nextAwayCounterClockTile = {
        x: currentTile.x - closerDirecitonClock.x,
        y: currentTile.y - closerDirecitonClock.y,
    };
    const nextAwayCounterClockTileBlocking = isPositionBlocking(nextAwayCounterClockTile, map, game.state.idCounter, game);

    // Rule 2: ray cast from vision center to pointInQuestion for blocking tile
    let rayCastBlockingPos = getFirstBlockingGameMapTilePositionTouchingLine(map, visionCenter, pointInQuestion, game);
    if (rayCastBlockingPos !== undefined) { //check if not over target position
        if (Math.sign(-tileCheckAdd.x) * (rayCastBlockingPos.x - pointInQuestion.x) > 0
            || Math.sign(-tileCheckAdd.y) * (rayCastBlockingPos.y - pointInQuestion.y) > 0
        ) {
            rayCastBlockingPos = undefined;
        }
    }
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
        // Rule 2.2: and if no tile was hit 
        // Rule 2.2.1: and pointInQuestion is not blocking
        if (!currentTileBlocking) {
            // Rule 2.2.1.1: and away adjacent are both blocking => return true
            // - - - - - - -
            // - - - b x - -
            // - - - p b - -
            // - - - - - - -
            // - v - - - - -
            if (nextAwayClockTileBlocking && nextAwayCounterClockTileBlocking) return true;
            // Rule 2.2.1.2: and away diagonal is blocking => return false
            // - - - - - - -
            // - - - - b - -
            // - - - p b - -
            // - - - - - - -
            // - v - - - - -
            if (nextAwayDiagonalTileBlocking) return false;
            // Rule 2.2.1.3: and away diagonal is not blocking and at least one away side is blocking => return true
            // - - - - - - -
            // - - - b - - -
            // - - - p - - -
            // - - - - - - -
            // - v - - - - -
            return nextAwayClockTileBlocking || nextAwayCounterClockTileBlocking;
        }
        // Rule 2.2.2: and away diagonal is not blocking => return true
        // - - - - - - -
        // - - - b - - -
        // - - - p - - -
        // - - - - - - -
        // - v - - - - -
        if (!nextAwayDiagonalTileBlocking) return true;
        // Rule 2..2.3: and away1,away2 is blocking => return false
        // - - - - - - -
        // - - - b b - -
        // - - - p - - -
        // - - - - - - -
        // - v - - - - -
        return false;
    }
    // ray cast to pointInQuestion did not hit tile of pointInQuestion

    // Rule 3: hit title is on same x or y as tile of pointInQuestion 
    // 3.1: 
    // - - - - - - - - -
    // - - - b b r b b c
    // - v - - - - - - -
    if (!currentTileBlocking) return false;
    const rayCastBlockingTile = positionToGameMapTileXY(map, rayCastBlockingPos);
    const pointInQuestionTile = positionToGameMapTileXY(map, currentTile);
    const stepDirection: Position = { x: 0, y: 0 };
    const checkDirection: Position = { x: 0, y: 0 };
    let steps: number = 0;
    if (rayCastBlockingTile.x === pointInQuestionTile.x) {
        stepDirection.y = rayCastBlockingPos.y > pointInQuestion.y ? -map.tileSize : map.tileSize;
        checkDirection.x = rayCastBlockingPos.x > visionCenter.x ? -map.tileSize : map.tileSize;
        if (Math.abs(pointInQuestion.x - visionCenter.x) < map.tileSize && Math.sign(checkDirection.x) !== Math.sign(pointInQuestion.x - visionCenter.x)) return false;
        steps = Math.abs(Math.ceil(rayCastBlockingPos.y - pointInQuestion.y) / map.tileSize);
    } else if (rayCastBlockingTile.y === pointInQuestionTile.y) {
        stepDirection.x = rayCastBlockingPos.x > pointInQuestion.x ? -map.tileSize : map.tileSize;
        checkDirection.y = rayCastBlockingPos.y > visionCenter.y ? -map.tileSize : map.tileSize;
        if (Math.abs(pointInQuestion.y - visionCenter.y) < map.tileSize && Math.sign(checkDirection.y) !== Math.sign(pointInQuestion.y - visionCenter.y)) return false;
        steps = Math.abs(Math.ceil(rayCastBlockingPos.x - pointInQuestion.x) / map.tileSize);
    } else {
        return false; //TODO do later rules
    }

    const currenStepPosition = { x: rayCastBlockingPos.x, y: rayCastBlockingPos.y };
    for (let i = 0; i < steps; i++) {
        const nextCheckDirectionTile = {
            x: currenStepPosition.x + checkDirection.x,
            y: currenStepPosition.y + checkDirection.y,
        };
        const nextCheckDirectionTileTileBlocking = isPositionBlocking(nextCheckDirectionTile, map, game.state.idCounter, game);
        if (nextCheckDirectionTileTileBlocking) {
            return false; //TODO special case
        }
        currenStepPosition.x += stepDirection.x;
        currenStepPosition.y += stepDirection.y;
    }

    return true;
}

function pointToTileCornerPointAwayVision(position: Position, visionCenter: Position, map: GameMap): Position {
    const blockingRounded = {
        x: Math.floor(position.x),
        y: Math.floor(position.y),
    };
    const blockingTileTopLeft = {
        x: blockingRounded.x - modulo(blockingRounded.x, map.tileSize),
        y: blockingRounded.y - modulo(blockingRounded.y, map.tileSize),
    }

    return {
        x: visionCenter.x > blockingTileTopLeft.x ? blockingTileTopLeft.x : blockingTileTopLeft.x + map.tileSize,
        y: visionCenter.y > blockingTileTopLeft.y ? blockingTileTopLeft.y : blockingTileTopLeft.y + map.tileSize,
    };
}

function getNextTileSidePoint(sidePoint: Position, direction: number, map: GameMap): Position {
    let nextSidePoint: Position;
    const stepSizeX = Math.cos(direction);
    const stepSizeY = Math.sin(direction);
    const signX = stepSizeX > 0 ? 1 : -1;
    const signY = stepSizeY > 0 ? 1 : -1;
    let distanceX = signX === -1 ? modulo(sidePoint.x, map.tileSize) : map.tileSize - modulo(sidePoint.x, map.tileSize);
    let distanceY = signY === -1 ? modulo(sidePoint.y, map.tileSize) : map.tileSize - modulo(sidePoint.y, map.tileSize);
    if (distanceX === 0) distanceX = map.tileSize;
    if (distanceY === 0) distanceY = map.tileSize;
    if (stepSizeX === 0) {
        nextSidePoint = { x: sidePoint.x, y: sidePoint.y + distanceY * signY };
    } else if (stepSizeY === 0) {
        nextSidePoint = { x: sidePoint.x + distanceX * signX, y: sidePoint.y };
    } else {
        let factorX = Math.abs(distanceX / stepSizeX);
        let factorY = Math.abs(distanceY / stepSizeY);
        if (factorX > factorY) {
            factorY += 0.0001;
            nextSidePoint = { x: sidePoint.x + stepSizeX * factorY, y: sidePoint.y + stepSizeY * factorY };
        } else {
            factorX += 0.0001;
            nextSidePoint = { x: sidePoint.x + stepSizeX * factorX, y: sidePoint.y + stepSizeY * factorX };
        }
    }
    return nextSidePoint;
}

function isValid1TileLine(point1: Position, point2: Position, map: GameMap, game: Game) {
    let checkPoint1: Position;
    let checkPoint2: Position;
    if (point1.x === point2.x) {
        checkPoint1 = { x: point1.x - map.tileSize / 2, y: (point1.y + point2.y) / 2 };
        checkPoint2 = { x: point1.x + map.tileSize / 2, y: checkPoint1.y };
    } else {
        checkPoint1 = { x: (point1.x + point2.x) / 2, y: point1.y - map.tileSize / 2 };
        checkPoint2 = { x: checkPoint1.x, y: point1.y + map.tileSize / 2 };
    }
    if (isPositionBlocking(checkPoint1, map, game.state.idCounter, game)) {
        return true;
    }
    return isPositionBlocking(checkPoint2, map, game.state.idCounter, game);
}

function validatePointAndPushIntoWalls(firstCheckPoint: Position, secondCheckPoint: Position, visionCenter: Position, currentPoint: Position, visionRange: number, wallPoints: Position[], isCounterClock: boolean, map: GameMap, game: Game): boolean {
    let nextPoint: Position | undefined = undefined;
    if (isValidVisionPoint(firstCheckPoint, visionCenter, map, game)) {
        nextPoint = firstCheckPoint;
    } else {
        if (isValidVisionPoint(secondCheckPoint, visionCenter, map, game)) {
            nextPoint = secondCheckPoint;
        }
    }
    if (nextPoint && !isValid1TileLine(nextPoint, currentPoint, map, game)) {
        nextPoint = undefined;
    }
    let inBetweenPoint: Position | undefined = undefined;
    if (!nextPoint) {
        const direction = calculateDirection(visionCenter, currentPoint);
        const currentEndPosition: Position = { x: visionCenter.x, y: visionCenter.y };
        moveByDirectionAndDistance(currentEndPosition, direction, visionRange, false);
        const furtherBlockingPos = getFirstBlockingGameMapTilePositionTouchingLine(map, currentPoint, currentEndPosition, game);
        if (furtherBlockingPos) {
            let nextRayCastPoint: Position;
            inBetweenPoint = furtherBlockingPos;
            for (let i = 0; i < 10; i++) {
                nextRayCastPoint = pointToTileCornerPointAwayVision(inBetweenPoint, visionCenter, map);
                inBetweenPoint = getNextTileSidePoint(inBetweenPoint, direction, map);
                if (isValidVisionPoint(nextRayCastPoint, visionCenter, map, game)) {
                    nextPoint = nextRayCastPoint;
                    break;
                } else {
                    let otherCheckPoint: Position;
                    if (!isCounterClock) {
                        if (visionCenter.y > nextRayCastPoint.y) { // TOP
                            if (visionCenter.x > nextRayCastPoint.x) { // LEFT
                                otherCheckPoint = { x: nextRayCastPoint.x + map.tileSize, y: nextRayCastPoint.y };
                            } else { // RIGHT
                                otherCheckPoint = { x: nextRayCastPoint.x, y: nextRayCastPoint.y + map.tileSize };
                            }
                        } else { //BOTTOM
                            if (visionCenter.x > nextRayCastPoint.x) { // LEFT
                                otherCheckPoint = { x: nextRayCastPoint.x, y: nextRayCastPoint.y - map.tileSize };
                            } else { // RIGHT
                                otherCheckPoint = { x: nextRayCastPoint.x - map.tileSize, y: nextRayCastPoint.y };
                            }
                        }
                    } else { //counterClock
                        if (visionCenter.y > nextRayCastPoint.y) { // TOP
                            if (visionCenter.x > nextRayCastPoint.x) { // LEFT
                                otherCheckPoint = { x: nextRayCastPoint.x, y: nextRayCastPoint.y + map.tileSize };
                            } else { // RIGHT
                                otherCheckPoint = { x: nextRayCastPoint.x - map.tileSize, y: nextRayCastPoint.y };
                            }
                        } else { //BOTTOM
                            if (visionCenter.x > nextRayCastPoint.x) { // LEFT
                                otherCheckPoint = { x: nextRayCastPoint.x + map.tileSize, y: nextRayCastPoint.y };
                            } else { // RIGHT
                                otherCheckPoint = { x: nextRayCastPoint.x, y: nextRayCastPoint.y - map.tileSize };
                            }
                        }

                    }
                    if (isValidVisionPoint(otherCheckPoint, visionCenter, map, game)) {
                        nextPoint = otherCheckPoint;
                        break;
                    }
                }
            }
        }
    }
    if (nextPoint) {
        const isDuplicate = wallPoints.find(p => nextPoint && p.x === nextPoint.x && p.y === nextPoint.y);
        if (!isDuplicate) {
            const distance = calculateDistance(nextPoint, visionCenter);
            if (distance > visionRange) {
                return false;
            }
            if (inBetweenPoint) {
                if (isCounterClock) {
                    wallPoints.unshift(inBetweenPoint);
                } else {
                    wallPoints.push(inBetweenPoint);
                }
            }
            if (isCounterClock) {
                wallPoints.unshift(nextPoint);
            } else {
                wallPoints.push(nextPoint);
            }
            return true;
        }
    }
    return false;
}

function determineVisionWalls(blockingPos: Position, visionCenter: Position, visionRange: number, map: GameMap, game: Game): Position[] | undefined {
    const wallPoints: Position[] = [];
    let newPointAddedToWalls = true;
    const firstPoint = pointToTileCornerPointAwayVision(blockingPos, visionCenter, map);
    if (!isValidVisionPoint(firstPoint, visionCenter, map, game)) return undefined;

    wallPoints.push(firstPoint);

    //coubter clock rotation
    while (newPointAddedToWalls) {
        const currentPoint = wallPoints[0];
        newPointAddedToWalls = false;
        let firstCheckPoint: Position | undefined = undefined;
        let secondCheckPoint: Position | undefined = undefined;
        if (visionCenter.y > currentPoint.y) {  //TOP
            if (visionCenter.x < currentPoint.x) { //RIGHT
                const leftPoint = { x: currentPoint.x - map.tileSize, y: currentPoint.y };
                const topPoint = { x: currentPoint.x, y: currentPoint.y - map.tileSize };
                if (visionCenter.x < leftPoint.x) {
                    firstCheckPoint = leftPoint;
                    secondCheckPoint = topPoint;
                } else {
                    firstCheckPoint = topPoint;
                    secondCheckPoint = leftPoint;
                }
            } else { //LEFT
                const downPoint = { x: currentPoint.x, y: currentPoint.y + map.tileSize };
                const leftPoint = { x: currentPoint.x - map.tileSize, y: currentPoint.y };
                if (visionCenter.y > downPoint.y) {
                    firstCheckPoint = downPoint;
                    secondCheckPoint = leftPoint;
                } else {
                    firstCheckPoint = leftPoint;
                    secondCheckPoint = downPoint;
                }
            }
        } else {  //Bottom
            if (visionCenter.x < currentPoint.x) { //RIGHT
                const topPoint = { x: currentPoint.x, y: currentPoint.y - map.tileSize };
                const rightPoint = { x: currentPoint.x + map.tileSize, y: currentPoint.y };
                if (visionCenter.y < topPoint.y) {
                    firstCheckPoint = topPoint;
                    secondCheckPoint = rightPoint;
                } else {
                    firstCheckPoint = rightPoint;
                    secondCheckPoint = topPoint;
                }
            } else { //LEFT
                const rightPoint = { x: currentPoint.x + map.tileSize, y: currentPoint.y };
                const bottomPoint = { x: currentPoint.x, y: currentPoint.y + map.tileSize };
                if (visionCenter.x > rightPoint.x) {
                    firstCheckPoint = rightPoint;
                    secondCheckPoint = bottomPoint;
                } else {
                    firstCheckPoint = bottomPoint;
                    secondCheckPoint = rightPoint;
                }
            }
        }
        newPointAddedToWalls = validatePointAndPushIntoWalls(firstCheckPoint, secondCheckPoint, visionCenter, currentPoint, visionRange, wallPoints, true, map, game);
    }
    newPointAddedToWalls = true;
    while (newPointAddedToWalls) {
        const currentPoint = wallPoints[wallPoints.length - 1];
        let nextPoint: Position | undefined = undefined;
        let firstCheckPoint: Position | undefined = undefined;
        let secondCheckPoint: Position | undefined = undefined;
        if (visionCenter.y > currentPoint.y) {  //TOP
            if (visionCenter.x < currentPoint.x) { //RIGHT
                const bottomPoint = { x: currentPoint.x, y: currentPoint.y + map.tileSize };
                const rightPoint = { x: currentPoint.x + map.tileSize, y: currentPoint.y };
                if (visionCenter.y > bottomPoint.y) {
                    firstCheckPoint = bottomPoint;
                    secondCheckPoint = rightPoint;
                } else {
                    firstCheckPoint = rightPoint;
                    secondCheckPoint = bottomPoint;
                }
            } else { //LEFT
                const rightPoint = { x: currentPoint.x + map.tileSize, y: currentPoint.y };
                const topPoint = { x: currentPoint.x, y: currentPoint.y - map.tileSize };
                if (visionCenter.x > rightPoint.x) {
                    firstCheckPoint = rightPoint;
                    secondCheckPoint = topPoint;
                } else {
                    firstCheckPoint = topPoint;
                    secondCheckPoint = rightPoint;
                }
            }
        } else {  //Bottom
            if (visionCenter.x < currentPoint.x) { //RIGHT
                const leftPoint = { x: currentPoint.x - map.tileSize, y: currentPoint.y };
                const bottomPoint = { x: currentPoint.x, y: currentPoint.y + map.tileSize };
                if (visionCenter.x < leftPoint.x) {
                    firstCheckPoint = leftPoint;
                    secondCheckPoint = bottomPoint;
                } else {
                    firstCheckPoint = bottomPoint;
                    secondCheckPoint = leftPoint;
                }
            } else { //LEFT
                const topPoint = { x: currentPoint.x, y: currentPoint.y - map.tileSize };
                const leftPoint = { x: currentPoint.x - map.tileSize, y: currentPoint.y };
                if (visionCenter.y < topPoint.y) {
                    firstCheckPoint = topPoint;
                    secondCheckPoint = leftPoint;
                } else {
                    firstCheckPoint = leftPoint;
                    secondCheckPoint = topPoint;
                }
            }
        }
        newPointAddedToWalls = validatePointAndPushIntoWalls(firstCheckPoint, secondCheckPoint, visionCenter, currentPoint, visionRange, wallPoints, false, map, game);
    }

    if (wallPoints.length < 2) {
        return undefined;
    }
    return wallPoints;
}

function paintModiferLate(ctx: CanvasRenderingContext2D, modifier: GameMapModifier, cameraPosition: Position, game: Game) {
    const map = game.state.map;
    ctx.fillStyle = "black";
    const viewDistance = 300;
    const viewDistanceBlockLimit = viewDistance + map.tileSize;
    const viewPaintMiddle = getPointPaintPosition(ctx, cameraPosition, cameraPosition, game.UI.zoom);
    paintShapeWithCircleCutOut(ctx, modifier.area, viewPaintMiddle, viewDistance, game);

    const visionWalls: Position[][] = [];
    const defaultStepSize = Math.PI * 2 / 50;
    let currentDirection = - Math.PI * 3 / 2;
    let maxAngle = Math.PI / 2;
    while (currentDirection < maxAngle) {
        let nextDirection = currentDirection + defaultStepSize;
        const endPosition = { x: cameraPosition.x, y: cameraPosition.y };
        moveByDirectionAndDistance(endPosition, currentDirection, viewDistance, false);
        const blockingPos = getFirstBlockingGameMapTilePositionTouchingLine(map, cameraPosition, endPosition, game);
        if (!blockingPos) {
            currentDirection = nextDirection;
            continue;
        }
        const wallResult = determineVisionWalls(blockingPos, cameraPosition, viewDistanceBlockLimit, map, game);
        if (wallResult === undefined) {
            // wall to close to max vision range
            currentDirection = nextDirection;
            continue;
        }
        visionWalls.push(wallResult);
        const endAngle = calculateDirection(cameraPosition, wallResult[wallResult.length - 1]);
        const startAngle = calculateDirection(cameraPosition, wallResult[0]);
        if (startAngle > endAngle && startAngle < maxAngle) maxAngle = startAngle;
        currentDirection = currentDirection < endAngle + 0.1 ? endAngle + 0.1 : nextDirection;
    }

    //paint black
    let shapePath = getShapePaintClipPath(ctx, modifier.area, game);
    ctx.save();
    ctx.clip(shapePath);

    for (let positionOrder of visionWalls) {
        if (positionOrder.length === 0) continue;
        ctx.beginPath();
        const startPaint = getPointPaintPosition(ctx, positionOrder[0], cameraPosition, game.UI.zoom);
        ctx.moveTo(startPaint.x, startPaint.y);
        let curPaintPoint;
        for (let i = 1; i < positionOrder.length; i++) {
            curPaintPoint = getPointPaintPosition(ctx, positionOrder[i], cameraPosition, game.UI.zoom);
            ctx.lineTo(curPaintPoint.x, curPaintPoint.y);
        }
        if (!curPaintPoint) continue;
        let movedLastPos = { x: curPaintPoint.x, y: curPaintPoint.y };
        const lastDirection = calculateDirection(cameraPosition, positionOrder[positionOrder.length - 1]);
        moveByDirectionAndDistance(movedLastPos, lastDirection, viewDistanceBlockLimit, false);
        ctx.lineTo(movedLastPos.x, movedLastPos.y);

        let movedStartPos = { x: startPaint.x, y: startPaint.y };
        const startDirection = calculateDirection(cameraPosition, positionOrder[0]);
        moveByDirectionAndDistance(movedStartPos, startDirection, viewDistanceBlockLimit, false);
        ctx.arc(viewPaintMiddle.x, viewPaintMiddle.y, viewDistanceBlockLimit + 1, lastDirection, startDirection, true);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}
