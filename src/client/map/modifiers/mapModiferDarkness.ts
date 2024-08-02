import { calculateDirection, calculateDistance, modulo } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { getFirstBlockingGameMapTilePositionTouchingLine, getMapTile, isPositionBlocking, MapChunk, moveByDirectionAndDistance } from "../map.js";
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
    paintModiferLateV2(ctx, modifier, cameraPosition, game);
}

function paintModiferLateV2(ctx: CanvasRenderingContext2D, modifier: GameMapModifier, cameraPosition: Position, game: Game) {
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

    for (let x = leftView; x <= rightView; x += map.tileSize) {
        for (let y = topView; y <= bottomView; y += map.tileSize) {
            const curPos = {
                x: x,
                y: y,
            }
            const tileMiddle = { x: curPos.x + map.tileSize / 2, y: curPos.y + map.tileSize / 2 };
            const blockingResult = isPositionBlocking(tileMiddle, map, game.state.idCounter, game);
            if (blockingResult) {
                let paintTop = false;
                let paintRight = false;
                let paintBottom = false;
                let paintLeft = false;

                if (cameraPosition.y > curPos.y) {
                    paintTop = true;
                    const cameraBetween = cameraPosition.x > curPos.x && cameraPosition.x < curPos.x + map.tileSize;
                    if (!cameraBetween) {
                        const blockingAbove = isPositionBlocking({ x: tileMiddle.x, y: tileMiddle.y - map.tileSize }, map, game.state.idCounter, game);
                        if (blockingAbove) {
                            const side = cameraPosition.x < curPos.x ? -1 : 1;
                            const blockingAboveSide = isPositionBlocking({ x: tileMiddle.x + map.tileSize * side, y: tileMiddle.y - map.tileSize }, map, game.state.idCounter, game);
                            if (!blockingAboveSide) {
                                paintTop = false;
                            }
                        }
                    }
                }
                if (cameraPosition.x < curPos.x + map.tileSize) {
                    paintRight = true;
                    const cameraBetween = cameraPosition.y > curPos.y && cameraPosition.y < curPos.y + map.tileSize;
                    if (!cameraBetween) {
                        const blockingRight = isPositionBlocking({ x: tileMiddle.x + map.tileSize, y: tileMiddle.y }, map, game.state.idCounter, game);
                        if (blockingRight) {
                            const side = cameraPosition.y < curPos.y ? -1 : 1;
                            const blockingSide = isPositionBlocking({ x: tileMiddle.x + map.tileSize, y: tileMiddle.y + map.tileSize * side }, map, game.state.idCounter, game);
                            if (!blockingSide) {
                                paintRight = false;
                            }
                        }
                    }
                }
                if (cameraPosition.y < curPos.y + map.tileSize) {
                    paintBottom = true;
                    const cameraBetween = cameraPosition.x > curPos.x && cameraPosition.x < curPos.x + map.tileSize;
                    if (!cameraBetween) {
                        const blockingBellow = isPositionBlocking({ x: tileMiddle.x, y: tileMiddle.y + map.tileSize }, map, game.state.idCounter, game);
                        if (blockingBellow) {
                            const side = cameraPosition.x < curPos.x ? -1 : 1;
                            const blockingAboveSide = isPositionBlocking({ x: tileMiddle.x + map.tileSize * side, y: tileMiddle.y + map.tileSize }, map, game.state.idCounter, game);
                            if (!blockingAboveSide) {
                                paintBottom = false;
                            }
                        }
                    }
                }
                if (cameraPosition.x > curPos.x) {
                    paintLeft = true;
                    const cameraBetween = cameraPosition.y > curPos.y && cameraPosition.y < curPos.y + map.tileSize;
                    if (!cameraBetween) {
                        const blockingLeft = isPositionBlocking({ x: tileMiddle.x - map.tileSize, y: tileMiddle.y }, map, game.state.idCounter, game);
                        if (blockingLeft) {
                            const side = cameraPosition.y < curPos.y ? -1 : 1;
                            const blockingSide = isPositionBlocking({ x: tileMiddle.x - map.tileSize, y: tileMiddle.y + map.tileSize * side }, map, game.state.idCounter, game);
                            if (!blockingSide) {
                                paintLeft = false;
                            }
                        }
                    }


                }
                const positionOrder: Position[] = [];
                if (!paintLeft && paintTop) {
                    positionOrder.push({ x: curPos.x, y: curPos.y });
                    positionOrder.push({ x: curPos.x, y: curPos.y + map.tileSize });
                    if (paintRight) positionOrder.push({ x: curPos.x + map.tileSize, y: curPos.y + map.tileSize });
                    if (paintBottom) positionOrder.push({ x: curPos.x, y: curPos.y + map.tileSize });
                } else if (!paintTop && paintRight) {
                    positionOrder.push({ x: curPos.x, y: curPos.y + map.tileSize });
                    positionOrder.push({ x: curPos.x + map.tileSize, y: curPos.y + map.tileSize });
                    if (paintBottom) positionOrder.push({ x: curPos.x, y: curPos.y + map.tileSize });
                    if (paintLeft) positionOrder.push({ x: curPos.x, y: curPos.y });
                } else if (!paintRight && paintBottom) {
                    positionOrder.push({ x: curPos.x + map.tileSize, y: curPos.y + map.tileSize });
                    positionOrder.push({ x: curPos.x, y: curPos.y + map.tileSize });
                    if (paintLeft) positionOrder.push({ x: curPos.x, y: curPos.y });
                    if (paintTop) positionOrder.push({ x: curPos.x, y: curPos.y + map.tileSize });
                } else if (!paintBottom && paintLeft) {
                    positionOrder.push({ x: curPos.x, y: curPos.y + map.tileSize });
                    positionOrder.push({ x: curPos.x, y: curPos.y });
                    if (paintTop) positionOrder.push({ x: curPos.x, y: curPos.y + map.tileSize });
                    if (paintRight) positionOrder.push({ x: curPos.x + map.tileSize, y: curPos.y + map.tileSize });
                }

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
                ctx.lineTo(movedStartPos.x, movedStartPos.y);

                ctx.closePath();
                ctx.fill();

            }
        }
    }
}

function paintViewCone(ctx: CanvasRenderingContext2D, startPaintPos: Position, secondPaintPos: Position, startDirection: number, secondDirection: number, viewDistance: number) {
    ctx.beginPath();
    ctx.moveTo(startPaintPos.x, startPaintPos.y);
    ctx.lineTo(secondPaintPos.x, secondPaintPos.y);
    let movedSecondPos = { x: secondPaintPos.x, y: secondPaintPos.y };
    moveByDirectionAndDistance(movedSecondPos, secondDirection, viewDistance, false);
    ctx.lineTo(movedSecondPos.x, movedSecondPos.y);

    let movedStartPos = { x: startPaintPos.x, y: startPaintPos.y };
    moveByDirectionAndDistance(movedStartPos, startDirection, viewDistance, false);
    ctx.lineTo(movedStartPos.x, movedStartPos.y);

    ctx.closePath();
    ctx.fill();
}


function paintModiferLateV2_Old(ctx: CanvasRenderingContext2D, modifier: GameMapModifier, cameraPosition: Position, game: Game) {
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

    for (let x = leftView; x <= rightView; x += map.tileSize) {
        for (let y = topView; y <= bottomView; y += map.tileSize) {
            const curPos = {
                x: x,
                y: y,
            }
            const tileMiddle = { x: curPos.x + map.tileSize / 2, y: curPos.y + map.tileSize / 2 };
            const blockingResult = isPositionBlocking(tileMiddle, map, game.state.idCounter, game);
            if (blockingResult) {
                const paintPos = getPointPaintPosition(ctx, curPos, cameraPosition);
                let paintTop = false;
                let paintRight = false;
                let paintLeft = false;
                let paintBottom = false;

                if (cameraPosition.y > curPos.y) {
                    let paintTop = true;
                    const cameraBetween = cameraPosition.x > curPos.x && cameraPosition.x < curPos.x + map.tileSize;
                    if (!cameraBetween) {
                        const blockingAbove = isPositionBlocking({ x: tileMiddle.x, y: tileMiddle.y - map.tileSize }, map, game.state.idCounter, game);
                        if (blockingAbove) {
                            const side = cameraPosition.x < curPos.x ? -1 : 1;
                            const blockingAboveSide = isPositionBlocking({ x: tileMiddle.x + map.tileSize * side, y: tileMiddle.y - map.tileSize }, map, game.state.idCounter, game);
                            if (!blockingAboveSide) {
                                paintTop = false;
                            }
                        }
                    }
                }
                if (cameraPosition.x < curPos.x + map.tileSize) {
                    //right
                    const bottomRightBlockPos = { x: curPos.x + map.tileSize, y: curPos.y + map.tileSize };
                    const bottomRightBlockPosDirection = calculateDirection(cameraPosition, bottomRightBlockPos);
                    const topRightBlockPos = { x: curPos.x + map.tileSize, y: curPos.y };
                    const topRightBlockPosDirection = calculateDirection(cameraPosition, topRightBlockPos);
                    paintViewCone(ctx,
                        { x: paintPos.x + map.tileSize, y: paintPos.y },
                        { x: paintPos.x + map.tileSize, y: paintPos.y + map.tileSize },
                        topRightBlockPosDirection, bottomRightBlockPosDirection, viewDistance
                    );
                }
                if (cameraPosition.y < curPos.y + map.tileSize) {
                    //bottom
                    const bottomRightBlockPos = { x: curPos.x + map.tileSize, y: curPos.y + map.tileSize };
                    const bottomRightBlockPosDirection = calculateDirection(cameraPosition, bottomRightBlockPos);
                    const bottomLefttBlockPos = { x: curPos.x, y: curPos.y + map.tileSize };
                    const bottomLeftBlockPosDirection = calculateDirection(cameraPosition, bottomLefttBlockPos);
                    paintViewCone(ctx,
                        { x: paintPos.x, y: paintPos.y + map.tileSize },
                        { x: paintPos.x + map.tileSize, y: paintPos.y + map.tileSize },
                        bottomLeftBlockPosDirection, bottomRightBlockPosDirection, viewDistance
                    );
                }
                if (cameraPosition.x > curPos.x) {
                    //left
                    const topLeftBlockPos = { x: curPos.x, y: curPos.y };
                    const topLeftBlockPosDirection = calculateDirection(cameraPosition, topLeftBlockPos);
                    const bottomLefttBlockPos = { x: curPos.x, y: curPos.y + map.tileSize };
                    const bottomLeftBlockPosDirection = calculateDirection(cameraPosition, bottomLefttBlockPos);
                    paintViewCone(ctx,
                        { x: paintPos.x, y: paintPos.y + map.tileSize },
                        { x: paintPos.x, y: paintPos.y },
                        bottomLeftBlockPosDirection, topLeftBlockPosDirection, viewDistance
                    );
                }

            }
        }
    }
}
