import { getNextId } from "../../game.js";
import { Game, IdCounter, Position } from "../../gameModel.js";
import { MODIFY_SHAPE_NAME_CIRCLE } from "./mapShapeCircle.js";
import { GAME_MAP_MODIFIER_FUNCTIONS, GameMapModifier } from "./mapModifier.js";
import { GameMapArea, getShapeMiddle, setShapeAreaToAmount } from "./mapModifierShapes.js";
import { GameMapAreaRect, MODIFY_SHAPE_NAME_RECTANGLE } from "./mapShapeRectangle.js";
import { createAreaBossLighntingCloudMachine } from "../../character/enemy/areaBoss/areaBossCloudMachine.js";
import { MODIFY_SHAPE_NAME_CELESTIAL_DIRECTION } from "./mapShapeCelestialDirection.js";
import { MapChunk, TILE_ID_GRASS, TILE_ID_ICE } from "../map.js";

export const MODIFIER_NAME_ICE = "Ice";
export type MapModifierIce = GameMapModifier & {
}

export function addMapModifierIce() {
    GAME_MAP_MODIFIER_FUNCTIONS[MODIFIER_NAME_ICE] = {
        create: create,
        onGameInit: onGameInit,
        growArea: growArea,
        onChunkCreateModify: onChunkCreateModify,
    };
}

export function create(
    area: GameMapArea,
    idCounter: IdCounter,
): MapModifierIce {
    return {
        id: getNextId(idCounter),
        type: MODIFIER_NAME_ICE,
        area: area,
        areaPerLevel: 1000000,
        level: 1,
    };
}

function onChunkCreateModify(mapChunk: MapChunk, chunkX: number, chunkY: number, game: Game) {
    for (let x = 0; x < mapChunk.tiles.length; x++) {
        for (let y = 0; y < mapChunk.tiles[x].length; y++) {
            if (mapChunk.tiles[x][y] === TILE_ID_GRASS) mapChunk.tiles[x][y] = TILE_ID_ICE;
        }
    }
}

function onGameInit(modifier: GameMapModifier, game: Game) {
    let spawn: Position | undefined = undefined;

    if (modifier.area.type === MODIFY_SHAPE_NAME_RECTANGLE || modifier.area.type === MODIFY_SHAPE_NAME_CIRCLE) {
        const area = modifier.area as GameMapAreaRect;
        if (game.state.activeCheats && game.state.activeCheats.indexOf("closeCurses") !== -1) {
            area.x = 1500;
            area.y = 1500;
        }
    }
    const ice = modifier as MapModifierIce;
    if (ice.area.type === MODIFY_SHAPE_NAME_CELESTIAL_DIRECTION) {
        return;
    }
    spawn = getShapeMiddle(modifier.area, game);
    if (spawn === undefined) return;
    const areaBoss = createAreaBossLighntingCloudMachine(game.state.idCounter, spawn, modifier.id, game);
    game.state.bossStuff.bosses.push(areaBoss);
}

//TODO make it a general version every modifier uses
function growArea(modifier: GameMapModifier) {
    const lightning = modifier as MapModifierIce;
    lightning.level++;
    if (lightning.areaPerLevel === undefined) return;
    const areaAmount = lightning.level * lightning.areaPerLevel;
    setShapeAreaToAmount(lightning.area, areaAmount);
}
