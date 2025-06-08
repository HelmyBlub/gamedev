import { getPlayerCharacters, teleportCharacterPetsToOwner } from "../character/character.js";
import { startKingFight } from "../character/enemy/kingEnemy.js";
import { Game, Position } from "../gameModel.js";
import { positionToMapKey, GameMap, MapChunk, positionToChunkXY } from "./map.js";
import { IMAGE_SIGN, MAP_OBJECT_KING_SIGN, MapTileObjectNextKingSign } from "./mapObjectSign.js";

type TileData = { x: number, y: number, tileId: number };
export type KingAreaEntranceData = {
    chunkX: number,
    chunkY: number,
    tileX: number,
    tileY: number,
    tileId: number
}

export type GameMapKingArea = {
    size: number,
    numberChunksUntil: number,
}

export function mapGenerationKingChunkStuff(mapChunk: MapChunk, map: GameMap, chunkX: number, chunkY: number) {
    if (!map.kingArea) return;
    const chunkLength = map.chunkLength;
    kingChunkArea(mapChunk, chunkLength, chunkX, chunkY, map);
    kingPathForChunkTiles(mapChunk, chunkLength, chunkX, chunkY, map.kingArea.numberChunksUntil);
}

export function checkForKingAreaTrigger(game: Game) {
    if (!game.state.map.kingArea || game.state.bossStuff.kingFightStartedTime !== undefined || game.state.bossStuff.areaSpawnFightStartedTime !== undefined) return;
    const allPlayers = getPlayerCharacters(game.state.players);
    if (allPlayers === undefined || allPlayers.length === 0) return;
    for (let player of allPlayers) {
        const mapKey = positionToMapKey(player, game.state.map);
        const chunk = game.state.map.chunks[mapKey];
        if (chunk) {
            if (!chunk.isKingAreaChunk) return;
            const chunkSize = game.state.map.chunkLength * game.state.map.tileSize;
            const tileSize = game.state.map.tileSize;
            const playerChunkX = (Math.abs(player.x) % chunkSize);
            const playerChunkY = (Math.abs(player.y) % chunkSize);
            if (playerChunkX <= tileSize || playerChunkX >= chunkSize - tileSize
                || playerChunkY <= tileSize || playerChunkY >= chunkSize - tileSize) {
                return;
            }
        }
    }
    startKingFight(allPlayers[0], game);
    teleportCharacterPetsToOwner(allPlayers, game);
}

export function getKingAreaMiddlePosition(positionInsideBossArea: Position, map: GameMap): Position | undefined {
    const areaCorners = getTopLeftCornerChunkXyOfKingAreas(map.kingArea!);
    const bossAreaSize = map.kingArea!.size * map.chunkLength * map.tileSize
    for (let corner of areaCorners) {
        const pos: Position = {
            x: corner.x * map.chunkLength * map.tileSize,
            y: corner.y * map.chunkLength * map.tileSize,
        }
        if (pos.x <= positionInsideBossArea.x
            && pos.x + bossAreaSize > positionInsideBossArea.x
            && pos.y <= positionInsideBossArea.y
            && pos.y + bossAreaSize > positionInsideBossArea.y
        ) {
            return {
                x: pos.x + bossAreaSize / 2,
                y: pos.y + bossAreaSize / 2
            }
        }
    }

    return undefined;
}

function kingChunkArea(mapChunk: MapChunk, chunkLength: number, chunkX: number, chunkY: number, map: GameMap) {
    const area = map.kingArea!;
    const tiles = mapChunk.tiles;
    const areaCorners = getTopLeftCornerChunkXyOfKingAreas(area);
    for (let corner of areaCorners) {
        if (corner.x <= chunkX && corner.x + area.size > chunkX
            && corner.y <= chunkY && corner.y + area.size > chunkY) {

            mapChunk.isKingAreaChunk = true;
            const hasYStartWall = corner.y === chunkY;
            const hasYEndWall = corner.y + area.size - 1 === chunkY;
            const hasXStartWall = corner.x === chunkX;
            const hasXEndWall = corner.x + area.size - 1 === chunkX;

            for (let tileX = 0; tileX < chunkLength; tileX++) {
                for (let tileY = 0; tileY < chunkLength; tileY++) {
                    tiles[tileX][tileY] = 0;
                    if (hasYStartWall && tileY === 0
                        || hasYEndWall && tileY === chunkLength - 1
                        || hasXStartWall && tileX === 0
                        || hasXEndWall && tileX === chunkLength - 1
                    ) {
                        tiles[tileX][tileY] = 1;
                    }
                }
            }
            const entranceTile = getEntranceTileXYForKingChunkXyIfExists(chunkX, chunkY, map);
            if (entranceTile) {
                tiles[entranceTile.x][entranceTile.y] = entranceTile.tileId;
            }
            return;
        }
    }
}

export function getEntranceChunkAndTileXYForPosition(position: Position, map: GameMap): KingAreaEntranceData | undefined {
    const chunkXY = positionToChunkXY(position, map);
    const area = map.kingArea!;
    let tile: TileData | undefined;
    let chunkX: number = 0;
    let chunkY: number = 0;
    if (Math.abs(chunkXY.chunkY) <= Math.floor(area.size / 2)) {
        chunkY = 0;
        if (area.numberChunksUntil <= chunkXY.chunkX) {
            chunkX = area.numberChunksUntil;
        } else if (-area.numberChunksUntil >= chunkXY.chunkX) {
            chunkX = -area.numberChunksUntil;
        }
    } else if (Math.abs(chunkXY.chunkX) <= Math.floor(area.size / 2)) {
        chunkX = 0;
        if (area.numberChunksUntil <= chunkXY.chunkY) {
            chunkY = area.numberChunksUntil;
        } else if (-area.numberChunksUntil >= chunkXY.chunkY) {
            chunkY = -area.numberChunksUntil;
        }
    }
    tile = getEntranceTileXYForKingChunkXyIfExists(chunkX, chunkY, map);
    if (tile) {
        return {
            chunkX: chunkX,
            chunkY: chunkY,
            tileX: tile.x,
            tileY: tile.y,
            tileId: tile.tileId,
        }
    }
    return undefined;
}

function getEntranceTileXYForKingChunkXyIfExists(chunkX: number, chunkY: number, map: GameMap): TileData | undefined {
    const pathChunkEnd = map.kingArea!.numberChunksUntil;
    const chunkLength = map.chunkLength;
    if (chunkX === 0) {
        if (chunkY == pathChunkEnd) {
            return { x: Math.floor(chunkLength / 2), y: 0, tileId: 4 };
        } else if (chunkY == -pathChunkEnd) {
            return { x: Math.floor(chunkLength / 2), y: chunkLength - 1, tileId: 4 };
        }
    } else if (chunkY == 0) {
        if (chunkX == pathChunkEnd) {
            return { x: 0, y: Math.floor(chunkLength / 2), tileId: 3 };
        } else if (chunkX == -pathChunkEnd) {
            return { x: chunkLength - 1, y: Math.floor(chunkLength / 2), tileId: 3 };
        }
    }

    return undefined;
}

function kingPathForChunkTiles(mapChunk: MapChunk, chunkLength: number, chunkX: number, chunkY: number, pathChunkEnd: number) {
    const tiles: number[][] = mapChunk.tiles;
    const pathChunkStart = 1;
    if (chunkX === 0 && Math.abs(chunkY) >= pathChunkStart && Math.abs(chunkY) <= pathChunkEnd) {
        if (Math.abs(chunkY) < pathChunkEnd) {
            for (let tileY = 0; tileY < chunkLength; tileY++) {
                tiles[Math.floor(chunkLength / 2)][tileY] = 4;
            }
        }
    }
    if (chunkY === 0 && Math.abs(chunkX) >= pathChunkStart && Math.abs(chunkX) <= pathChunkEnd) {
        if (Math.abs(chunkX) < pathChunkEnd) {
            for (let tileX = 0; tileX < chunkLength; tileX++) {
                tiles[tileX][Math.floor(chunkLength / 2)] = 3;
            }
        }
    }
    placeKingSignObjects(mapChunk, chunkLength, chunkX, chunkY, pathChunkStart);
}

function placeKingSignObjects(mapChunk: MapChunk, chunkLength: number, chunkX: number, chunkY: number, pathChunkStart: number) {
    if (chunkX === 0) {
        if (chunkY === pathChunkStart) {
            const sign: MapTileObjectNextKingSign = {
                x: Math.floor(chunkLength / 2) - 1,
                y: 0,
                type: MAP_OBJECT_KING_SIGN,
                kingDirection: "south",
                interactable: true,
                image: IMAGE_SIGN,
            }
            mapChunk.tiles[sign.x][sign.y] = 0;
            mapChunk.objects.push(sign);
        }
        if (chunkY === -pathChunkStart) {
            const sign: MapTileObjectNextKingSign = {
                x: Math.floor(chunkLength / 2) - 1,
                y: chunkLength - 1,
                type: MAP_OBJECT_KING_SIGN,
                kingDirection: "north",
                interactable: true,
                image: IMAGE_SIGN,
            }
            mapChunk.tiles[sign.x][sign.y] = 0;
            mapChunk.objects.push(sign);
        }
    }
    if (chunkY === 0) {
        if (chunkX === pathChunkStart) {
            const sign: MapTileObjectNextKingSign = {
                x: 0,
                y: Math.floor(chunkLength / 2) - 1,
                type: MAP_OBJECT_KING_SIGN,
                kingDirection: "east",
                interactable: true,
                image: IMAGE_SIGN,
            }
            mapChunk.tiles[sign.x][sign.y] = 0;
            mapChunk.objects.push(sign);
        }
        if (chunkX === -pathChunkStart) {
            const sign: MapTileObjectNextKingSign = {
                x: chunkLength - 1,
                y: Math.floor(chunkLength / 2) - 1,
                type: MAP_OBJECT_KING_SIGN,
                kingDirection: "west",
                interactable: true,
                image: IMAGE_SIGN,
            }
            mapChunk.tiles[sign.x][sign.y] = 0;
            mapChunk.objects.push(sign);
        }
    }
}

function getTopLeftCornerChunkXyOfKingAreas(kingArea: GameMapKingArea): Position[] {
    const result: Position[] = [];
    result.push({
        x: kingArea.numberChunksUntil,
        y: - Math.floor(kingArea.size / 2),
    });
    result.push({
        x: - Math.floor(kingArea.size / 2),
        y: kingArea.numberChunksUntil,
    });
    result.push({
        x: - kingArea.numberChunksUntil - kingArea.size + 1,
        y: - Math.floor(kingArea.size / 2),
    });
    result.push({
        x: - Math.floor(kingArea.size / 2),
        y: - kingArea.numberChunksUntil - kingArea.size + 1,
    });
    return result;
}
