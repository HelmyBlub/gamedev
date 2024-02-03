import { Game, Position } from "../../gameModel.js";
import { GameMap, MapChunk } from "../map.js";
import { MapTileObjectClassBuilding } from "../mapObjectClassBuilding.js";

export type Building = {
    type: string,
    id: number,
    tileX: number,
    tileY: number,
    image: string,
}

export function getBuildingPosition(building: Building, map: GameMap): Position {
    return {
        x: building.tileX * map.tileSize,
        y: building.tileY * map.tileSize,
    }
}

export function findBuildingByIdAndType(id: number, type: string, game: Game): Building | undefined {
    for (let building of game.state.buildings) {
        if (building.type !== type) continue;
        if (building.id === id) return building;
    }
    return undefined;
}

export function addExistingBuildingsToSpawnChunk(mapChunk: MapChunk, game: Game) {
    for (let building of game.state.buildings) {
        const mapObject: MapTileObjectClassBuilding = {
            x: building.tileX,
            y: building.tileY,
            type: building.type,
            interactable: true,
            buildingId: building.id,
            image: building.image,
        }
        mapChunk.tiles[mapObject.x][mapObject.y] = 0;
        mapChunk.objects.push(mapObject);
    }
}
