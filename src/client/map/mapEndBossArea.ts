import { getPlayerCharacters } from "../character/character.js";
import { createEndBossWithLevel } from "../character/enemy/endBossEnemy.js";
import { Game, Position } from "../gameModel.js";
import { positionToMapKey, positionToGameMapTileIJ, GameMapEndBossArea, GameMap, MapChunk, chunkIJToMapKey, positionToChunkIJ, changeTileIdOfMapChunk } from "./map.js";

type TileData = { i: number, j: number, tileId: number };
export type EndBossEntranceData = {
    chunkI: number,
    chunkJ: number,
    tileI: number,
    tileJ: number,
    tileId: number
}

export function mapGenerationEndBossChunkStuff(mapChunk: MapChunk, map: GameMap, chunkI: number, chunkJ: number) {
    if (!map.endBossArea) return;
    const chunkLength = map.chunkLength;
    endBossChunkArea(mapChunk, chunkLength, chunkI, chunkJ, map);
    endBossPathForChunkTiles(mapChunk.tiles, chunkLength, chunkI, chunkJ, map.endBossArea.numberChunksUntil);
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
    let entrance = getEntranceChunkAndTileIJForPosition(allPlayers[0], game.state.map);
    if (entrance) {
        changeTileIdOfMapChunk(entrance.chunkI, entrance.chunkJ, entrance.tileI, entrance.tileJ, 2, game);
        game.state.bossStuff.bosses.push(createEndBossWithLevel(allPlayers[0], game.state.idCounter, 1, game));
        game.state.bossStuff.closedOfEndBossEntrance = entrance;
        game.state.bossStuff.endBossStarted = true;
    } else {
        throw new Error("bossArea entrance not found, should not be able to happen");
    }
}

export function getBossAreaMiddlePosition(positionInsideBossArea: Position, map: GameMap): Position | undefined {
    const areaCorners = getTopLeftCornerChunkIJOfBossAreas(map.endBossArea!);
    const bossAreaSize = map.endBossArea!.size * map.chunkLength * map.tileSize
    for (let corner of areaCorners) {
        const pos: Position = {
            x: corner.j * map.chunkLength * map.tileSize,
            y: corner.i * map.chunkLength * map.tileSize,
        }
        if (pos.x <= positionInsideBossArea.x
            && pos.x + bossAreaSize  > positionInsideBossArea.x
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

function endBossChunkArea(mapChunk: MapChunk, chunkLength: number, chunkI: number, chunkJ: number, map: GameMap) {
    const area = map.endBossArea!;
    const tiles = mapChunk.tiles;
    let areaCorners = getTopLeftCornerChunkIJOfBossAreas(area);
    for (let corner of areaCorners) {
        if (corner.i <= chunkI && corner.i + area.size > chunkI
            && corner.j <= chunkJ && corner.j + area.size > chunkJ) {

            mapChunk.isEndBossAreaChunk = true;
            let hasJStartWall = corner.j === chunkJ;
            let hasJEndWall = corner.j + area.size - 1 === chunkJ;
            let hasIStartWall = corner.i === chunkI;
            let hasIEndWall = corner.i + area.size - 1 === chunkI;

            for (let i = 0; i < chunkLength; i++) {
                for (let j = 0; j < chunkLength; j++) {
                    tiles[i][j] = 0;
                    if (hasJStartWall && j === 0
                        || hasJEndWall && j === chunkLength - 1
                        || hasIStartWall && i === 0
                        || hasIEndWall && i === chunkLength - 1
                    ) {
                        tiles[i][j] = 1;
                    }
                }
            }
            let entranceTile = getEntranceTileIJForBossChunkIJIfExists(chunkI, chunkJ, map);
            if (entranceTile) {
                tiles[entranceTile.i][entranceTile.j] = entranceTile.tileId;
            }
            return;
        }
    }
}

function getEntranceChunkAndTileIJForPosition(position: Position, map: GameMap): EndBossEntranceData | undefined {
    const chunkIJ = positionToChunkIJ(position, map);
    const area = map.endBossArea!;
    let tile: TileData | undefined;
    let chunkI: number = 0;
    let chunkJ: number = 0;
    if (Math.abs(chunkIJ.i) <= Math.floor(area.size / 2)) {
        chunkI = 0;
        if (area.numberChunksUntil <= chunkIJ.j) {
            chunkJ = area.numberChunksUntil;
        } else if (-area.numberChunksUntil >= chunkIJ.j) {
            chunkJ = -area.numberChunksUntil;
        }
    } else if (Math.abs(chunkIJ.j) <= Math.floor(area.size / 2)) {
        chunkJ = 0;
        if (area.numberChunksUntil <= chunkIJ.i) {
            chunkI = area.numberChunksUntil;
        } else if (-area.numberChunksUntil >= chunkIJ.i) {
            chunkI = -area.numberChunksUntil;
        }
    }
    tile = getEntranceTileIJForBossChunkIJIfExists(chunkI, chunkJ, map);
    if (tile) {
        return {
            chunkI,
            chunkJ,
            tileI: tile.i,
            tileJ: tile.j,
            tileId: tile.tileId,
        }
    }
    return undefined;
}

function getEntranceTileIJForBossChunkIJIfExists(chunkI: number, chunkJ: number, map: GameMap): TileData | undefined {
    const pathChunkEnd = map.endBossArea!.numberChunksUntil;
    const chunkLength = map.chunkLength;
    if (chunkI === 0) {
        if (chunkJ == pathChunkEnd) {
            return { i: Math.floor(chunkLength / 2), j: 0, tileId: 3 };
        } else if (chunkJ == -pathChunkEnd) {
            return { i: Math.floor(chunkLength / 2), j: chunkLength - 1, tileId: 3 };
        }
    } else if (chunkJ == 0) {
        if (chunkI == pathChunkEnd) {
            return { i: 0, j: Math.floor(chunkLength / 2), tileId: 4 };
        } else if (chunkI == -pathChunkEnd) {
            return { i: chunkLength - 1, j: Math.floor(chunkLength / 2), tileId: 4 };
        }
    }

    return undefined;
}

function endBossPathForChunkTiles(chunk: number[][], chunkLength: number, chunkI: number, chunkJ: number, pathChunkEnd: number) {
    const pathChunkStart = 0;
    if (chunkI === 0 && Math.abs(chunkJ) > pathChunkStart && Math.abs(chunkJ) <= pathChunkEnd) {
        if (Math.abs(chunkJ) < pathChunkEnd) {
            for (let i = 0; i < chunkLength; i++) {
                chunk[Math.floor(chunkLength / 2)][i] = 3;
            }
        }
    }
    if (chunkJ === 0 && Math.abs(chunkI) > pathChunkStart && Math.abs(chunkI) <= pathChunkEnd) {
        if (Math.abs(chunkI) < pathChunkEnd) {
            for (let i = 0; i < chunkLength; i++) {
                chunk[i][Math.floor(chunkLength / 2)] = 4;
            }
        }
    }
}

function getTopLeftCornerChunkIJOfBossAreas(bossArea: GameMapEndBossArea): { i: number, j: number }[] {
    let result: { i: number, j: number }[] = [];
    result.push({
        i: bossArea.numberChunksUntil,
        j: - Math.floor(bossArea.size / 2),
    });
    result.push({
        i: - Math.floor(bossArea.size / 2),
        j: bossArea.numberChunksUntil,
    });
    result.push({
        i: - bossArea.numberChunksUntil - bossArea.size + 1,
        j: - Math.floor(bossArea.size / 2),
    });
    result.push({
        i: - Math.floor(bossArea.size / 2),
        j: - bossArea.numberChunksUntil - bossArea.size + 1,
    });
    return result;
}
