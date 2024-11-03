import { calculateDirection, calculateDistance, getNextId, modulo } from "../../game.js";
import { Game, IdCounter, Position } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { calculateMovePosition, chunkXYToMapKey, GameMap, getFirstBlockingGameMapTilePositionTouchingLine, isPositionBlocking, MapChunk, mapKeyAndTileXYToPosition, moveByDirectionAndDistance, positionToGameMapTileXY } from "../map.js";
import { MODIFY_SHAPE_NAME_CIRCLE } from "./mapShapeCircle.js";
import { GAME_MAP_MODIFIER_FUNCTIONS, GameMapModifier } from "./mapModifier.js";
import { GameMapArea, getShapeArea, getShapeMiddle, getShapePaintClipPath, paintShapeWithCircleCutOut, setShapeAreaToAmount } from "./mapModifierShapes.js";
import { GameMapAreaRect, MODIFY_SHAPE_NAME_RECTANGLE } from "./mapShapeRectangle.js";
import { createAreaBossDarknessSpiderWithLevel } from "../../character/enemy/areaBoss/areaBossDarknessSpider.js";
import { perlin_get } from "../mapGeneration.js";

export const MODIFIER_NAME_LIGHTNING = "Lightning";
export type MapModifierLightning = GameMapModifier & {
    level: number,
    areaPerLevel?: number,
}

export function addMapModifierLightning() {
    GAME_MAP_MODIFIER_FUNCTIONS[MODIFIER_NAME_LIGHTNING] = {
        paintModiferLate: paintModiferLate,
        onChunkCreateModify: onChunkCreateModify,
        onGameInit: onGameInit,
        growArea: growArea,
        create: create,
    };
}

export function create(
    area: GameMapArea,
    idCounter: IdCounter,
): MapModifierLightning {
    return {
        id: getNextId(idCounter),
        type: MODIFIER_NAME_LIGHTNING,
        area: area,
        areaPerLevel: 1000000,
        level: 1,
    };
}

function paintModiferLate(ctx: CanvasRenderingContext2D, modifier: GameMapModifier, cameraPosition: Position, game: Game) {
    const map = game.state.map;
    const middle = getShapeMiddle(modifier.area);
    if (!middle) return;
    renderClouds(ctx, middle, cameraPosition, 800, 800, game);
}

function renderClouds(ctx: CanvasRenderingContext2D, areaMiddle: Position, cameraPosition: Position, viewWidth: number, viewHeight: number, game: Game) {
    const paintPos = getPointPaintPosition(ctx, areaMiddle, cameraPosition, game.UI.zoom, true);
    ctx.globalAlpha = 0.5;
    const stepSize = 50;
    for (let x = areaMiddle.x - viewWidth / 2; x < areaMiddle.x + viewWidth / 2; x += stepSize) {
        for (let y = areaMiddle.y - viewHeight / 2; y < areaMiddle.y + viewHeight / 2; y += stepSize) {
            const time = Math.floor(game.state.time / 1000) / 5;
            const direction = calculateDirection(areaMiddle, { x, y });
            const distance = calculateDistance(areaMiddle, { x, y });
            const density = perlin_get(distance * 0.005 - time, direction * 0.5, 0);
            let paintPosCloud = { x, y };
            const moveFactor = (game.state.time % 1000) / 1000 * stepSize;
            paintPosCloud = calculateMovePosition(paintPosCloud, direction, moveFactor, false);
            if (density > 0.3) {
                ctx.fillStyle = "black";
                ctx.fillRect(paintPos.x + paintPosCloud.x, paintPos.y + paintPosCloud.y, stepSize, stepSize);
            }
        }
    }
    ctx.globalAlpha = 1;
}

function onGameInit(modifier: GameMapModifier, game: Game) {
    let spawn: Position | undefined = undefined;

    if (modifier.area.type === MODIFY_SHAPE_NAME_RECTANGLE || modifier.area.type === MODIFY_SHAPE_NAME_CIRCLE) {
        const area = modifier.area as GameMapAreaRect;
        if (game.state.activeCheats && game.state.activeCheats.indexOf("closeCurseDarkness") !== -1) {
            area.x = 0;
            area.y = 0;
        }
    }
    spawn = getShapeMiddle(modifier.area);
    if (spawn === undefined) return;
    //const areaBoss = createAreaBossDarknessSpiderWithLevel(game.state.idCounter, spawn, modifier.id, game); //TODO new boss
    //game.state.bossStuff.bosses.push(areaBoss);
}

function growArea(modifier: GameMapModifier) {
    const lightning = modifier as MapModifierLightning;
    lightning.level++;
    if (lightning.areaPerLevel === undefined) return;
    const areaAmount = lightning.level * lightning.areaPerLevel;
    setShapeAreaToAmount(lightning.area, areaAmount);
}

function onChunkCreateModify(mapChunk: MapChunk, chunkX: number, chunkY: number, game: Game) {
    if (mapChunk.mapModifiers === undefined) mapChunk.mapModifiers = [];
    if (mapChunk.mapModifiers.find(m => m === MODIFIER_NAME_LIGHTNING)) return;
    mapChunk.mapModifiers.push(MODIFIER_NAME_LIGHTNING);
}
