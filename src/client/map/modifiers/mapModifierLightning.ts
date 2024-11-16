import { getNextId } from "../../game.js";
import { Game, IdCounter, Position } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { MapChunk } from "../map.js";
import { MODIFY_SHAPE_NAME_CIRCLE } from "./mapShapeCircle.js";
import { GAME_MAP_MODIFIER_FUNCTIONS, GameMapModifier } from "./mapModifier.js";
import { GameMapArea, getShapeMiddle, setShapeAreaToAmount } from "./mapModifierShapes.js";
import { GameMapAreaRect, MODIFY_SHAPE_NAME_RECTANGLE } from "./mapShapeRectangle.js";
import { nextRandom } from "../../randomNumberGenerator.js";

export const MODIFIER_NAME_LIGHTNING = "Lightning";
export type MapModifierLightning = GameMapModifier & {
    level: number,
    areaPerLevel?: number,
    clouds: Cloud[],
}

type Cloud = {
    tiles: Position[],
    position: Position,
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
        clouds: [],
    };
}

function paintModiferLate(ctx: CanvasRenderingContext2D, modifier: GameMapModifier, cameraPosition: Position, game: Game) {
    const map = game.state.map;
    const middle = getShapeMiddle(modifier.area);
    const lightning = modifier as MapModifierLightning;
    if (!middle) return;
    const paintPos = getPointPaintPosition(ctx, middle, cameraPosition, game.UI.zoom, true);
    const cloudTileSize = 40;
    if (lightning.clouds.length === 0) {
        const cloud: Cloud = {
            tiles: generateCloud(20, game),
            position: { x: 0, y: 0 },
        }
        lightning.clouds.push(cloud);
    }

    ctx.globalAlpha = 0.5;
    for (let cloud of lightning.clouds) {
        for (let tile of cloud.tiles) {
            ctx.fillStyle = "white";
            ctx.fillRect(paintPos.x + tile.x * cloudTileSize + cloud.position.x, paintPos.y + tile.y * cloudTileSize + cloud.position.y, cloudTileSize, cloudTileSize);
        }
        cloud.position.x += 1;
    }
    ctx.globalAlpha = 1;
}

function generateCloud(size: number, game: Game): Position[] {
    const cloudTiles: Position[] = [];
    cloudTiles.push({ x: 0, y: 0 });
    while (cloudTiles.length < size) {
        const randomTileIndex = Math.floor(nextRandom(game.state.randomSeed) * cloudTiles.length);
        const randomTile = cloudTiles[randomTileIndex];
        let sideOptions = [
            { x: randomTile.x - 1, y: randomTile.y },
            { x: randomTile.x + 1, y: randomTile.y },
            { x: randomTile.x, y: randomTile.y - 1 },
            { x: randomTile.x, y: randomTile.y + 1 },
        ]
        for (let tile of cloudTiles) {
            for (let i = sideOptions.length - 1; i >= 0; i--) {
                if (tile.x === sideOptions[i].x && tile.y === sideOptions[i].y) sideOptions.splice(i, 1);
            }
        }
        if (sideOptions.length > 0) {
            const randomSideIndex = Math.floor(nextRandom(game.state.randomSeed) * sideOptions.length);
            cloudTiles.push(sideOptions[randomSideIndex]);
        }
    }
    return cloudTiles;
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
