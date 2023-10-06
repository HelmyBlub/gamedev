import { paintCharacters } from "../character/characterPaint.js";
import { Debugging, Game, MapChunkPaintCache, Position } from "../gameModel.js";
import { chunkXYToMapKey, GameMap, getTileIdForTileName, MapChunk, TILE_VALUES } from "./map.js";
import { paintMapChunkObjects } from "./mapObjects.js";

export type MapPaintLayer = "Layer1" | "Layer2";

export function paintMap(layer: MapPaintLayer, ctx: CanvasRenderingContext2D, cameraPosition: Position, map: GameMap, mapChunkPaintCache: MapChunkPaintCache, debug: Debugging | undefined, game: Game) {
    let chunkSize = map.tileSize * map.chunkLength;
    let width = ctx.canvas.width;
    let height = ctx.canvas.height;
    let startX = (cameraPosition.x - width / 2);
    let startY = (cameraPosition.y - height / 2);
    let startChunkX = Math.floor(startX / chunkSize);
    let startChunkY = Math.floor(startY / chunkSize);

    for (let chunkYIndex = 0; chunkYIndex < Math.ceil(height / chunkSize) + 1; chunkYIndex++) {
        let chunkY = startChunkY + chunkYIndex;
        for (let chunkXIndex = 0; chunkXIndex < Math.ceil(width / chunkSize) + 1; chunkXIndex++) {
            let chunkX = startChunkX + chunkXIndex;
            let chunkKey = chunkXYToMapKey(chunkX, chunkY);
            let chunk = map.chunks[chunkKey];
            if (chunk === undefined) {
                if(game.state.time > 1000) console.log("missing chunk creation", chunkKey);
                continue;
            }
            let x = chunkX * chunkSize - startX;
            let y = chunkY * chunkSize - startY;
            paintChunk(layer, ctx, { x, y }, chunk, map.tileSize, { x: chunkX, y: chunkY }, mapChunkPaintCache, game, debug);
            if (debug?.paintMarkActiveChunks && layer === "Layer2") {
                if (map.activeChunkKeys.indexOf(chunkKey) > -1) {
                    ctx.lineWidth = 1;
                    ctx.beginPath()
                    ctx.strokeStyle = 'red';
                    ctx.rect(x + 1, y + 1, chunkSize - 2, chunkSize - 2);
                    ctx.stroke();
                    ctx.closePath();
                }
            }
        }
    }
}

export function paintMapCharacters(ctx: CanvasRenderingContext2D, cameraPosition: Position, map: GameMap, game: Game) {
    let chunkSize = map.tileSize * map.chunkLength;
    let width = ctx.canvas.width;
    let height = ctx.canvas.height;
    let startX = (cameraPosition.x - width / 2);
    let startY = (cameraPosition.y - height / 2);
    let startChunkX = Math.floor(startX / chunkSize);
    let startChunkY = Math.floor(startY / chunkSize);

    for (let chunkYIndex = 0; chunkYIndex < Math.ceil(height / chunkSize) + 1; chunkYIndex++) {
        let chunkY = startChunkY + chunkYIndex;
        for (let chunkXIndex = 0; chunkXIndex < Math.ceil(width / chunkSize) + 1; chunkXIndex++) {
            let chunkX = startChunkX + chunkXIndex;
            let chunk = map.chunks[chunkXYToMapKey(chunkX, chunkY)];
            if (chunk === undefined) continue;
            paintCharacters(ctx, chunk.characters, cameraPosition, game);
        }
    }
}

function paintChunk(layer: MapPaintLayer, ctx: CanvasRenderingContext2D, paintTopLeftPosition: Position, chunk: MapChunk, tileSize: number, chunkXY: Position, mapChunkPaintCache: MapChunkPaintCache, game: Game, debug: Debugging | undefined) {
    let chunkSize = tileSize * chunk.tiles.length;
    let chunkLayerKey = `${chunkXY.x}_${chunkXY.y}_${layer}`;
    let readyForCache = true;
    if (mapChunkPaintCache[chunkLayerKey] === undefined) {
        let canvas = document.createElement('canvas');
        canvas.width = chunkSize;
        canvas.height = chunkSize;
        let cacheCtx: CanvasRenderingContext2D = canvas.getContext("2d")!;
        for (let tileX = 0; tileX < chunk.tiles.length; tileX++) {
            for (let tileY = 0; tileY < chunk.tiles[tileX].length; tileY++) {
                let x = tileX * tileSize;
                let y = tileY * tileSize;
                let tileReady = paintTile(layer, cacheCtx, { x, y }, tileSize, chunk.tiles[tileX][tileY]);
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
        if(chunk.objects.length > 0 && layer === "Layer2"){
            paintMapChunkObjects(ctx, chunk, paintTopLeftPosition, game);
        }
    }
}

function paintTile(layer: MapPaintLayer, ctx: CanvasRenderingContext2D, paintPosition: Position, tileSize: number, tileId: number): boolean {
    let imageReady = true;
    if (TILE_VALUES[tileId]) {
        if (TILE_VALUES[tileId].imagePath !== undefined) {
            if (TILE_VALUES[tileId].imageRef === undefined) {
                let image = new Image();
                image.src = TILE_VALUES[tileId].imagePath!;
                imageReady = false;
                TILE_VALUES[tileId].imageRef = image;
            } else {
                if (!TILE_VALUES[tileId].imageRef!.complete) {
                    imageReady = false;
                } else {
                    const grassid = getTileIdForTileName("grass");
                    if(TILE_VALUES[tileId].layer !== "Layer1" && layer === "Layer1"){
                        ctx.drawImage(TILE_VALUES[grassid].imageRef!, paintPosition.x, paintPosition.y);
                    }else if(TILE_VALUES[tileId].layer === layer){
                        ctx.drawImage(TILE_VALUES[tileId].imageRef!, paintPosition.x, paintPosition.y);
                    }
                }
            }
        } else if (TILE_VALUES[tileId].color !== undefined) {
            ctx.fillStyle = TILE_VALUES[tileId].color!;
            ctx.fillRect(paintPosition.x, paintPosition.y, tileSize, tileSize);
        } else {
            console.log("missing tile color or image path", tileId);
        }
    }
    return imageReady;
}