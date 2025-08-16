import { paintCharacters } from "../character/characterPaint.js";
import { GAME_MODE_BASE_DEFENSE } from "../gameModeBaseDefense.js";
import { Debugging, Game, MapChunkPaintCache, Position } from "../gameModel.js";
import { chunkXYToMapKey, GameMap, MapChunk, TILE_ID_GRASS, TILE_VALUES } from "./map.js";
import { createNewChunk } from "./mapGeneration.js";
import { paintMapChunkObjects } from "./mapObjects.js";
import { mapModifierDarknessDarknesChunkPaint, MODIFIER_NAME_DARKNESS } from "./modifiers/mapModifierDarkness.js";

export type MapPaintLayer = "Layer1" | "Layer2";

export function paintMap(layer: MapPaintLayer, ctx: CanvasRenderingContext2D, cameraPosition: Position, map: GameMap, mapChunkPaintCache: MapChunkPaintCache, debug: Debugging | undefined, game: Game) {
    const chunkSize = map.tileSize * map.chunkLength;
    const width = ctx.canvas.width / game.UI.zoom.factor;
    const height = ctx.canvas.height / game.UI.zoom.factor;
    const startX = (cameraPosition.x - width / 2);
    const startY = (cameraPosition.y - height / 2);
    const startChunkX = Math.floor(startX / chunkSize);
    const startChunkY = Math.floor(startY / chunkSize);

    for (let chunkYIndex = 0; chunkYIndex < Math.ceil(height / chunkSize) + 1; chunkYIndex++) {
        const chunkY = startChunkY + chunkYIndex;
        for (let chunkXIndex = 0; chunkXIndex < Math.ceil(width / chunkSize) + 1; chunkXIndex++) {
            const chunkX = startChunkX + chunkXIndex;
            const chunkKey = chunkXYToMapKey(chunkX, chunkY);
            let chunk = map.chunks[chunkKey];
            if (chunk === undefined) {
                if (game.multiplayer.websocket && game.multiplayer.gameStateCompare) {
                    // chunk creation is client window/zoom dependant and uses up IDs. 
                    // So prevent it from happening if i want to check for multiplayer syncing issues.
                    continue;
                } else {
                    chunk = createNewChunk(map, chunkX, chunkY, game.state.idCounter, game);
                }
            }
            const x = Math.floor(chunkX * chunkSize - startX);
            const y = Math.floor(chunkY * chunkSize - startY);
            paintChunk(layer, ctx, { x, y }, chunk, map.tileSize, { x: chunkX, y: chunkY }, mapChunkPaintCache, game, debug);
            if (debug?.paintMarkActiveChunks && layer === "Layer2") {
                if (map.activeChunkKeys.indexOf(chunkKey) > -1) {
                    ctx.lineWidth = 1;
                    ctx.beginPath()
                    ctx.strokeStyle = 'red';
                    ctx.rect(x + 1, y + 1, chunkSize - 2, chunkSize - 2);
                    ctx.stroke();
                    ctx.closePath();
                    ctx.fillStyle = "black";
                    ctx.font = "12px Arial";
                    ctx.fillText(chunk.characters.length.toFixed(), x + 2, y + 20);
                }
            }
        }
    }
}

export function paintMapCharacters(ctx: CanvasRenderingContext2D, cameraPosition: Position, map: GameMap, game: Game) {
    const width = ctx.canvas.width / game.UI.zoom.factor;
    const height = ctx.canvas.height / game.UI.zoom.factor;
    // some enemies have some higher attack range. if zoom is near paint by active chunks, which should inculde all enemies which could attack.
    // if zoom is far => paint by visibly chunks as enemies with high range should be visible
    if (width > map.activeChunkRange * 2 || height > map.activeChunkRange * 2 || game.state.gameMode === GAME_MODE_BASE_DEFENSE) {
        let extraChunks = 0;
        const startX = (cameraPosition.x - width / 2);
        const startY = (cameraPosition.y - height / 2);
        const chunkSize = map.tileSize * map.chunkLength;
        const startChunkX = Math.floor(startX / chunkSize) - extraChunks;
        const startChunkY = Math.floor(startY / chunkSize) - extraChunks;
        const chunkColumns = Math.ceil(height / chunkSize) + 1 + extraChunks * 2;
        const chunkRows = Math.ceil(width / chunkSize) + 1 + extraChunks * 2;
        for (let chunkYIndex = 0; chunkYIndex < chunkColumns; chunkYIndex++) {
            const chunkY = startChunkY + chunkYIndex;
            for (let chunkXIndex = 0; chunkXIndex < chunkRows; chunkXIndex++) {
                const chunkX = startChunkX + chunkXIndex;
                const chunkKey = chunkXYToMapKey(chunkX, chunkY);
                let chunk = map.chunks[chunkKey];
                if (chunk === undefined) continue;
                paintCharacters(ctx, chunk.characters, cameraPosition, game);
            }
        }
    } else {
        for (let key of game.state.map.activeChunkKeys) {
            const chunk = map.chunks[key];
            if (chunk === undefined) continue;
            paintCharacters(ctx, chunk.characters, cameraPosition, game);
        }

    }

}

function paintChunk(layer: MapPaintLayer, ctx: CanvasRenderingContext2D, paintTopLeftPosition: Position, chunk: MapChunk, tileSize: number, chunkXY: Position, mapChunkPaintCache: MapChunkPaintCache, game: Game, debug?: Debugging) {
    const chunkSize = tileSize * chunk.tiles.length;
    const chunkLayerKey = `${chunkXY.x}_${chunkXY.y}_${layer}`;
    let readyForCache = true;
    if (mapChunkPaintCache[chunkLayerKey] === undefined) {
        const canvas = document.createElement('canvas');
        canvas.width = chunkSize;
        canvas.height = chunkSize;
        const cacheCtx: CanvasRenderingContext2D = canvas.getContext("2d")!;
        for (let tileX = 0; tileX < chunk.tiles.length; tileX++) {
            for (let tileY = 0; tileY < chunk.tiles[tileX].length; tileY++) {
                const x = tileX * tileSize;
                const y = tileY * tileSize;
                const tileReady = paintTile(layer, cacheCtx, { x, y }, tileSize, chunk.tiles[tileX][tileY]);
                if (tileReady && chunk.mapModifiers && chunk.mapModifiers.find(m => m === MODIFIER_NAME_DARKNESS)) {
                    const darkness = game.state.map.mapModifiers.find(m => m.type === MODIFIER_NAME_DARKNESS);
                    if (darkness) {
                        mapModifierDarknessDarknesChunkPaint(cacheCtx, darkness, chunkXY, tileX, tileY, x, y, tileSize, game);
                    }
                }
                if (debug?.paintTileXYNumbers && layer === "Layer2") {
                    cacheCtx.fillStyle = "black";
                    cacheCtx.font = "8px Arial";
                    cacheCtx.fillText((chunkXY.x * chunk.tiles.length + tileX) + "_" + (chunkXY.y * chunk.tiles.length + tileY), x, y + 10);
                }
                readyForCache = readyForCache && tileReady;
            }
        }
        if (readyForCache) mapChunkPaintCache[chunkLayerKey] = cacheCtx;
    }
    if (readyForCache) {
        ctx.drawImage(mapChunkPaintCache[chunkLayerKey].canvas, paintTopLeftPosition.x, paintTopLeftPosition.y);
        if (chunk.objects.length > 0 && layer === "Layer2") {
            paintMapChunkObjects(ctx, chunk, paintTopLeftPosition, game);
        }
    }
}

function paintTile(layer: MapPaintLayer, ctx: CanvasRenderingContext2D, paintPosition: Position, tileSize: number, tileId: number): boolean {
    let imageReady = true;
    if (TILE_VALUES[tileId]) {
        if (TILE_VALUES[tileId].imagePath !== undefined) {
            if (TILE_VALUES[tileId].imageRef === undefined) {
                const image = new Image();
                image.src = TILE_VALUES[tileId].imagePath!;
                imageReady = false;
                TILE_VALUES[tileId].imageRef = image;
            } else {
                if (!TILE_VALUES[tileId].imageRef!.complete) {
                    imageReady = false;
                } else {
                    if (TILE_VALUES[tileId].layer !== "Layer1" && layer === "Layer1") {
                        ctx.drawImage(TILE_VALUES[TILE_ID_GRASS].imageRef!, paintPosition.x, paintPosition.y);
                    } else if (TILE_VALUES[tileId].layer === layer) {
                        ctx.drawImage(TILE_VALUES[tileId].imageRef!, paintPosition.x, paintPosition.y);
                    }
                }
            }
        } else if (TILE_VALUES[tileId].color !== undefined) {
            if (TILE_VALUES[tileId].layer !== "Layer1" && layer === "Layer1") {
                ctx.fillStyle = TILE_VALUES[tileId].color!;
                ctx.fillRect(paintPosition.x, paintPosition.y, tileSize, tileSize);
            } else if (TILE_VALUES[tileId].layer === layer) {
                ctx.fillStyle = TILE_VALUES[tileId].color!;
                ctx.fillRect(paintPosition.x, paintPosition.y, tileSize, tileSize);
            }
        } else {
            console.log("missing tile color or image path", tileId);
        }
    }
    return imageReady;
}