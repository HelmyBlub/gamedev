import { Character } from "../character/characterModel.js";
import { getCameraPosition } from "../game.js";
import { Game } from "../gameModel.js";
import { getPointPaintPosition, paintTextLinesWithKeys } from "../gamePaint.js";
import { mapKeyAndTileXYToPosition } from "./map.js";
import { MAP_OBJECTS_FUNCTIONS, MapTileObject, findMapKeyForMapObject } from "./mapObjects.js";
import { findPlayerByCharacterId } from "../player.js";
import { IMAGE_SIGN } from "./mapObjectSign.js";
import { playerInputBindingToDisplayValue } from "../input/playerInput.js";
import { areaSpawnOnDistanceFightStart } from "./mapAreaSpawnOnDistance.js";

export type MapTileObjectCleanseFountain = MapTileObject & {
    used: boolean,
    areaIfRef: number,
}
export const MAP_OBJECT_CLEANSE_FOUNTAIN = "CleanseFountain";

export function addMapObjectCleanseFountain() {
    MAP_OBJECTS_FUNCTIONS[MAP_OBJECT_CLEANSE_FOUNTAIN] = {
        interact1: interactCleanse,
        paintInteract: paintInteract,
    }
}

export function mapObjectCreateCleanseFountain(tileX: number, tileY: number, areaIfRef: number): MapTileObjectCleanseFountain {
    return {
        x: tileX,
        y: tileY,
        type: MAP_OBJECT_CLEANSE_FOUNTAIN,
        interactable: true,
        image: IMAGE_SIGN,
        used: false,
        areaIfRef: areaIfRef,
    }
}

function interactCleanse(interacter: Character, mapObject: MapTileObject, game: Game) {
    const player = findPlayerByCharacterId(game.state.players, interacter.id);
    if (!player) return;
    const fountain = mapObject as MapTileObjectCleanseFountain;
    const area = game.state.map.areaSpawnOnDistance.find(a => a.id === fountain.areaIfRef);
    if (!area) return;
    if (interacter.curses === undefined || interacter.curses.length === 0) return;
    fountain.used = true;
    areaSpawnOnDistanceFightStart(area, game);
}

function paintInteract(ctx: CanvasRenderingContext2D, mapObject: MapTileObject, interacter: Character, game: Game) {
    const fountain = mapObject as MapTileObjectCleanseFountain;
    if (fountain.used) return;
    const key = findMapKeyForMapObject(mapObject, game.state.map);
    if (!key) return;
    const player = findPlayerByCharacterId(game.state.players, interacter.id);
    if (!player) return;
    const map = game.state.map;
    const cameraPosition = getCameraPosition(game);
    const topMiddlePos = mapKeyAndTileXYToPosition(key, mapObject.x, mapObject.y, map);
    topMiddlePos.y -= map.tileSize / 2;

    const texts = [];
    texts.push(`Cleanse Fountain:`);
    const interact1 = playerInputBindingToDisplayValue("interact1", game);
    texts.push(`Press <${interact1}> to cleanse curses`);
    texts.push(`of equipted legendaries.`);

    const paintPos = getPointPaintPosition(ctx, topMiddlePos, cameraPosition, game.UI.zoom, false);
    if (game.UI.inputType === "touch") game.UI.rectangles.interactRectangle = [];
    paintTextLinesWithKeys(ctx, texts, paintPos, 20, true, true);
}
