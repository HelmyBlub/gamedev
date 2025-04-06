import { Character } from "../character/characterModel.js";
import { getCameraPosition } from "../game.js";
import { Game, Position } from "../gameModel.js";
import { getPointPaintPosition, paintTextLinesWithKeys } from "../gamePaint.js";
import { mapKeyAndTileXYToPosition } from "./map.js";
import { MAP_OBJECTS_FUNCTIONS, MapTileObject, findMapKeyForMapObject } from "./mapObjects.js";
import { findPlayerByCharacterId } from "../player.js";
import { IMAGE_SIGN } from "./mapObjectSign.js";
import { playerInputBindingToDisplayValue } from "../input/playerInput.js";
import { areaSpawnOnDistanceFightStart } from "./mapAreaSpawnOnDistance.js";
import { GAME_IMAGES, loadImage } from "../imageLoad.js";
import { getPlayerCharacters } from "../character/character.js";

export type MapTileObjectCleanseFountain = MapTileObject & {
    used: boolean,
    areaIfRef: number,
}
export const MAP_OBJECT_CLEANSE_FOUNTAIN = "CleanseFountain";
export const IMAGE_FOUNTAIN = "FOuntain";
GAME_IMAGES[IMAGE_FOUNTAIN] = {
    imagePath: "/images/fountain.png",
    spriteRowHeights: [100],
    spriteRowWidths: [100],
};

export function addMapObjectCleanseFountain() {
    MAP_OBJECTS_FUNCTIONS[MAP_OBJECT_CLEANSE_FOUNTAIN] = {
        interact1: interactCleanse,
        paintInteract: paintInteract,
        paint: paint,
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

function paint(ctx: CanvasRenderingContext2D, mapObject: MapTileObject, paintTopLeft: Position, game: Game) {
    const tileSize = game.state.map.tileSize;
    const fountainImage = GAME_IMAGES[IMAGE_FOUNTAIN];
    loadImage(fountainImage);
    if (fountainImage.imageRef?.complete) {
        const paintX = paintTopLeft.x + mapObject.y * tileSize;
        const paintY = paintTopLeft.y + mapObject.x * tileSize;
        const spriteAnimation = Math.floor(game.state.time / 100) % 3;
        const spriteWidth = fountainImage.spriteRowWidths[0];
        const spriteHeight = fountainImage.spriteRowHeights[0];
        const xOffset = (spriteWidth - tileSize) / 2;
        const yOffset = (spriteHeight - tileSize) / 2;
        ctx.drawImage(
            fountainImage.imageRef,
            0 + spriteAnimation * spriteWidth,
            0,
            spriteWidth, spriteHeight,
            Math.floor(paintX - xOffset),
            Math.floor(paintY - yOffset),
            spriteWidth, spriteHeight
        );
    }
}

function interactCleanse(interacter: Character, mapObject: MapTileObject, game: Game) {
    const player = findPlayerByCharacterId(game.state.players, interacter.id);
    if (!player) return;
    const fountain = mapObject as MapTileObjectCleanseFountain;
    const area = game.state.map.areaSpawnOnDistance.find(a => a.id === fountain.areaIfRef);
    if (!area) return;
    if (interacter.curses === undefined || interacter.curses.length === 0) return;
    if (!interacter.characterClasses) return;
    let hasCursedLegendary = false;
    for (let charClass of interacter.characterClasses) {
        if (charClass.curses && charClass.curses.length > 0) {
            hasCursedLegendary = true;
            break;
        }
    }
    if (!hasCursedLegendary) return;
    fountain.used = true;
    for (let player of getPlayerCharacters(game.state.players)) {
        if (player === interacter) continue;
        player.x = interacter.x;
        player.y = interacter.y;
    }
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
