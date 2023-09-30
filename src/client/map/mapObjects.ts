import { calculatePosToTileIJ } from "../character/pathing.js";
import { calculateDistance } from "../game.js";
import { Position, Game } from "../gameModel.js";
import { GameMap, MapChunk, determineMapKeysInDistance, mapKeyAndTileIjToPosition } from "./map.js";
import { addMapObjectFireAnimation } from "./mapObjectFireAnimation.js";
import { addMapObjectBossSign } from "./mapObjectSign.js";

export type MapObjectFunctions = {
    paint: (ctx: CanvasRenderingContext2D, mapObject: MapTileObject, paintTopLeft: Position, game: Game) => void,
    paintInteract?: (ctx: CanvasRenderingContext2D, mapObject: MapTileObject, game: Game) => void
}

export type MapObjectsFunctions = {
    [key: string]: MapObjectFunctions,
}

export type MapTileObject = {
    i: number,
    j: number,
    name: string,
    interactable?: boolean,
}

export const MAP_OBJECTS_FUNCTIONS: MapObjectsFunctions = {};

export function addMapObjectsFunctions(){
    addMapObjectFireAnimation();
    addMapObjectBossSign();
}

export function findNearesInteractableMapChunkObject(position: Position, game: Game, maxDistance: number = 60): MapTileObject | undefined{
    let mapTileObject: MapTileObject | undefined = undefined;
    let minDistance = -1;
    const map = game.state.map;
    let mapKeys = determineMapKeysInDistance(position, map, maxDistance, false, false);
    for(let key of mapKeys){
        const mapChunk = map.chunks[key];
        for(let object of mapChunk.objects){
            if(object.interactable){
                const objectPosition = mapKeyAndTileIjToPosition(key, object.i, object.j, game.state.map);
                const distance = calculateDistance(objectPosition, position);
                if(distance < maxDistance && (!mapTileObject || distance < minDistance)){
                    mapTileObject = object;
                    minDistance = distance;
                }
            }
        }
    }
    return mapTileObject;
}

export function findMapKeyForMapObject(mapTileObject: MapTileObject, map: GameMap): string | undefined{
    for(let key of map.activeChunkKeys){
        const mapChunk = map.chunks[key];
        const contains = mapChunk.objects.find((o) => o === mapTileObject);
        if(contains) return key;
    }
    return undefined;
}

export function paintMapChunkObjects(ctx: CanvasRenderingContext2D, mapChunk: MapChunk, paintTopLeft: Position, game: Game){
    for(let mapObject of mapChunk.objects){
        const mapObejctFuntions = MAP_OBJECTS_FUNCTIONS[mapObject.name];
        if(mapObejctFuntions){
            mapObejctFuntions.paint(ctx, mapObject, paintTopLeft, game);
        }
    }
}