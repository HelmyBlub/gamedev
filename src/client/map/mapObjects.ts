import { Character } from "../character/characterModel.js";
import { calculateDistance } from "../game.js";
import { Position, Game } from "../gameModel.js";
import { GAME_IMAGES, loadImage } from "../imageLoad.js";
import { StatsUIsPartContainer } from "../statsUI.js";
import { GameMap, MapChunk, determineMapKeysInDistance, mapKeyAndTileXYToPosition } from "./map.js";
import { addMapObjectClassBuilding } from "./mapObjectClassBuilding.js";
import { addMapObjectFireAnimation } from "./mapObjectFireAnimation.js";
import { addMapObjectKingSign } from "./mapObjectSign.js";
import { addMapObjectUpgradeBuilding } from "./mapObjectUpgradeBuilding.js";

export type MapObjectFunctions = {
    createStatsUi?: (mapObject: MapTileObject, game: Game) => StatsUIsPartContainer | undefined,
    interact1?: (interacter: Character, mapObject: MapTileObject, game: Game) => void,
    interact2?: (interacter: Character, mapObject: MapTileObject, game: Game) => void,
    paint?: (ctx: CanvasRenderingContext2D, mapObject: MapTileObject, paintTopLeft: Position, game: Game) => void,
    paintInteract?: (ctx: CanvasRenderingContext2D, mapObject: MapTileObject, interacter: Character, game: Game) => void,
}

export type MapObjectsFunctions = {
    [key: string]: MapObjectFunctions,
}

export type MapTileObject = {
    x: number,
    y: number,
    type: string,
    interactable?: boolean,
    image: string,
}

export const MAP_OBJECTS_FUNCTIONS: MapObjectsFunctions = {};

export function addMapObjectsFunctions() {
    addMapObjectFireAnimation();
    addMapObjectKingSign();
    addMapObjectClassBuilding();
    addMapObjectUpgradeBuilding();
}

export function createStatsUIForMabObject(mapTileObject: MapTileObject, game: Game): StatsUIsPartContainer | undefined {
    const mapObjectFuntions = MAP_OBJECTS_FUNCTIONS[mapTileObject.type];
    if (mapObjectFuntions && mapObjectFuntions.createStatsUi) {
        return mapObjectFuntions.createStatsUi(mapTileObject, game);
    }
    return undefined;
}

export function findNearesInteractableMapChunkObject(position: Position, game: Game, maxDistance: number = 60): MapTileObject | undefined {
    let mapTileObject: MapTileObject | undefined = undefined;
    let minDistance = -1;
    const map = game.state.map;
    const mapKeys = determineMapKeysInDistance(position, map, maxDistance, false, false);
    for (let key of mapKeys) {
        const mapChunk = map.chunks[key];
        for (let object of mapChunk.objects) {
            if (object.interactable) {
                const objectPosition = mapKeyAndTileXYToPosition(key, object.x, object.y, game.state.map);
                const distance = calculateDistance(objectPosition, position);
                if (distance < maxDistance && (!mapTileObject || distance < minDistance)) {
                    mapTileObject = object;
                    minDistance = distance;
                }
            }
        }
    }
    return mapTileObject;
}

export function findMapKeyForMapObject(mapTileObject: MapTileObject, map: GameMap): string | undefined {
    for (let key of map.activeChunkKeys) {
        const mapChunk = map.chunks[key];
        const contains = mapChunk.objects.find((o) => o === mapTileObject);
        if (contains) return key;
    }
    return undefined;
}

export function interactWithMapObject(interacter: Character, mapTileObject: MapTileObject, specialAction: String, game: Game) {
    const mapObjectFuntions = MAP_OBJECTS_FUNCTIONS[mapTileObject.type];
    if (specialAction === "interact1") {
        if (mapObjectFuntions && mapObjectFuntions.interact1) {
            mapObjectFuntions.interact1(interacter, mapTileObject, game);
        }
    } else if (specialAction === "interact2") {
        if (mapObjectFuntions && mapObjectFuntions.interact2) {
            mapObjectFuntions.interact2(interacter, mapTileObject, game);
        }
    }
}

export function paintMapChunkObjects(ctx: CanvasRenderingContext2D, mapChunk: MapChunk, paintTopLeft: Position, game: Game) {
    for (let mapObject of mapChunk.objects) {
        const mapObjectFuntions = MAP_OBJECTS_FUNCTIONS[mapObject.type];
        if (mapObjectFuntions) {
            if (mapObjectFuntions.paint) {
                mapObjectFuntions.paint(ctx, mapObject, paintTopLeft, game);
            } else {
                paintMabObjectDefault(ctx, mapObject, paintTopLeft, game);
            }
        }
    }
}


export function paintMabObjectDefault(ctx: CanvasRenderingContext2D, mapObject: MapTileObject, paintTopLeft: Position, game: Game) {
    const tileSize = game.state.map.tileSize;
    const image = GAME_IMAGES[mapObject.image];
    loadImage(image);
    if (image.imageRef?.complete) {
        const paintX = paintTopLeft.x + mapObject.x * tileSize;
        const paintY = paintTopLeft.y + mapObject.y * tileSize;
        const spriteWidth = image.spriteRowWidths[0];
        const spriteHeight = image.spriteRowHeights[0];
        ctx.drawImage(
            image.imageRef,
            Math.floor(paintX),
            Math.floor(paintY),
            spriteWidth, spriteHeight
        );
        ctx.resetTransform();
        ctx.restore();
    }
}