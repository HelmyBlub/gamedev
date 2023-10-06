import { getPlayerCharacters } from "../character/character.js";
import { startEndBoss } from "../character/enemy/endBossEnemy.js";
import { Game, Position } from "../gameModel.js";
import { positionToMapKey, GameMapEndBossArea, GameMap, MapChunk, positionToChunkXY } from "./map.js";
import { MAP_OBJECT_END_BOSS_SIGN, MapTileObjectNextEndbossSign } from "./mapObjectSign.js";

type TileData = { x: number, y: number, tileId: number };
export type EndBossEntranceData = {
    chunkX: number,
    chunkY: number,
    tileX: number,
    tileY: number,
    tileId: number
}

export function mapGenerationEndBossChunkStuff(mapChunk: MapChunk, map: GameMap, chunkX: number, chunkY: number) {
    if (!map.endBossArea) return;
    const chunkLength = map.chunkLength;
    endBossChunkArea(mapChunk, chunkLength, chunkX, chunkY, map);
    endBossPathForChunkTiles(mapChunk, chunkLength, chunkX, chunkY, map.endBossArea.numberChunksUntil);
}

export function checkForEndBossAreaTrigger(game: Game) {
    if (!game.state.map.endBossArea || game.state.bossStuff.endBossStarted) return;
    let allPlayers = getPlayerCharacters(game.state.players);
    for (let player of allPlayers) {
        const mapKey = positionToMapKey(player, game.state.map);
        const chunk = game.state.map.chunks[mapKey];
        if (chunk) {
            if (!chunk.isEndBossAreaChunk) return;
            const chunkSize = game.state.map.chunkLength * game.state.map.tileSize;
            const tileSize = game.state.map.tileSize;
            let playerChunkX = (Math.abs(player.x) % chunkSize);
            let playerChunkY = (Math.abs(player.y) % chunkSize);
            if (playerChunkX <= tileSize || playerChunkX >= chunkSize - tileSize
                || playerChunkY <= tileSize || playerChunkY >= chunkSize - tileSize) {
                return;
            }
        }
    }
    startEndBoss(allPlayers[0], game);
}

export function getBossAreaMiddlePosition(positionInsideBossArea: Position, map: GameMap): Position | undefined {
    const areaCorners = getTopLeftCornerChunkXyOfBossAreas(map.endBossArea!);
    const bossAreaSize = map.endBossArea!.size * map.chunkLength * map.tileSize
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

function endBossChunkArea(mapChunk: MapChunk, chunkLength: number, chunkX: number, chunkY: number, map: GameMap) {
    const area = map.endBossArea!;
    const tiles = mapChunk.tiles;
    let areaCorners = getTopLeftCornerChunkXyOfBossAreas(area);
    for (let corner of areaCorners) {
        if (corner.x <= chunkX && corner.x + area.size > chunkX
            && corner.y <= chunkY && corner.y + area.size > chunkY) {

            mapChunk.isEndBossAreaChunk = true;
            let hasYStartWall = corner.y === chunkY;
            let hasYEndWall = corner.y + area.size - 1 === chunkY;
            let hasXStartWall = corner.x === chunkX;
            let hasXEndWall = corner.x + area.size - 1 === chunkX;

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
            let entranceTile = getEntranceTileXYForBossChunkXyIfExists(chunkX, chunkY, map);
            if (entranceTile) {
                tiles[entranceTile.x][entranceTile.y] = entranceTile.tileId;
            }
            return;
        }
    }
}

export function getEntranceChunkAndTileXYForPosition(position: Position, map: GameMap): EndBossEntranceData | undefined {
    const chunkXY = positionToChunkXY(position, map);
    const area = map.endBossArea!;
    let tile: TileData | undefined;
    let chunkX: number = 0;
    let chunkY: number = 0;
    if (Math.abs(chunkXY.y) <= Math.floor(area.size / 2)) {
        chunkY = 0;
        if (area.numberChunksUntil <= chunkXY.x) {
            chunkX = area.numberChunksUntil;
        } else if (-area.numberChunksUntil >= chunkXY.x) {
            chunkX = -area.numberChunksUntil;
        }
    } else if (Math.abs(chunkXY.x) <= Math.floor(area.size / 2)) {
        chunkX = 0;
        if (area.numberChunksUntil <= chunkXY.y) {
            chunkY = area.numberChunksUntil;
        } else if (-area.numberChunksUntil >= chunkXY.y) {
            chunkY = -area.numberChunksUntil;
        }
    }
    tile = getEntranceTileXYForBossChunkXyIfExists(chunkX, chunkY, map);
    if (tile) {
        return {
            chunkY: chunkY,
            chunkX: chunkX,
            tileX: tile.x,
            tileY: tile.y,
            tileId: tile.tileId,
        }
    }
    return undefined;
}

function getEntranceTileXYForBossChunkXyIfExists(chunkX: number, chunkY: number, map: GameMap): TileData | undefined {
    const pathChunkEnd = map.endBossArea!.numberChunksUntil;
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

function endBossPathForChunkTiles(mapChunk: MapChunk, chunkLength: number, chunkX: number, chunkY: number, pathChunkEnd: number) {
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
    placeEndBossSignObjects(mapChunk, chunkLength, chunkX, chunkY, pathChunkStart);
}

function placeEndBossSignObjects(mapChunk: MapChunk, chunkLength: number, chunkX: number, chunkY: number, pathChunkStart: number){
    if (chunkX === 0) {
        if (chunkY === pathChunkStart) {
            const sign: MapTileObjectNextEndbossSign = {
                x: Math.floor(chunkLength / 2) - 1,
                y: 0,
                name: MAP_OBJECT_END_BOSS_SIGN,
                endBossDirection: "south",
                interactable: true,
            }
            mapChunk.tiles[sign.x][sign.y] = 0;
            mapChunk.objects.push(sign);
        }
        if (chunkY === -pathChunkStart) {
            const sign: MapTileObjectNextEndbossSign = {
                x: Math.floor(chunkLength / 2) - 1,
                y: chunkLength - 1,
                name: MAP_OBJECT_END_BOSS_SIGN,
                endBossDirection: "north",
                interactable: true,
            }
            mapChunk.tiles[sign.x][sign.y] = 0;
            mapChunk.objects.push(sign);
        }
    }
    if (chunkY === 0) {
        if (chunkX === pathChunkStart) {
            const sign: MapTileObjectNextEndbossSign = {
                x: 0,
                y: Math.floor(chunkLength / 2) - 1,
                name: MAP_OBJECT_END_BOSS_SIGN,
                endBossDirection: "east",
                interactable: true,
            }
            mapChunk.tiles[sign.x][sign.y] = 0;
            mapChunk.objects.push(sign);
        }
        if (chunkX === -pathChunkStart) {
            const sign: MapTileObjectNextEndbossSign = {
                x: chunkLength - 1,
                y: Math.floor(chunkLength / 2) - 1,
                name: MAP_OBJECT_END_BOSS_SIGN,
                endBossDirection: "west",
                interactable: true,
            }
            mapChunk.tiles[sign.x][sign.y] = 0;
            mapChunk.objects.push(sign);
        }
    }
}

function getTopLeftCornerChunkXyOfBossAreas(bossArea: GameMapEndBossArea): Position[] {
    let result: Position[] = [];
    result.push({
        x: bossArea.numberChunksUntil,
        y: - Math.floor(bossArea.size / 2),
    });
    result.push({
        x: - Math.floor(bossArea.size / 2),
        y: bossArea.numberChunksUntil,
    });
    result.push({
        x: - bossArea.numberChunksUntil - bossArea.size + 1,
        y: - Math.floor(bossArea.size / 2),
    });
    result.push({
        x: - Math.floor(bossArea.size / 2),
        y: - bossArea.numberChunksUntil - bossArea.size + 1,
    });
    return result;
}
