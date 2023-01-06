import { paintCharacters } from "../character/character.js";
import { MapChunkPaintCache, Position } from "../gameModel.js";
import { GameMap, MapChunk, TILE_VALUES } from "./map.js";

export function paintMap(ctx: CanvasRenderingContext2D, cameraPosition: Position, map: GameMap, mapChunkPaintCache: MapChunkPaintCache) {
    let chunkSize = map.tileSize * map.chunkLength;
    let width = ctx.canvas.width;
    let height = ctx.canvas.height;
    let startX = (cameraPosition.x - width / 2);
    let startY = (cameraPosition.y - height / 2);
    let startChunkI = Math.floor(startY / chunkSize);
    let startChunkJ = Math.floor(startX / chunkSize);

    for (let i = 0; i < Math.ceil(height / chunkSize) + 1; i++) {
        let chunkI = startChunkI + i;
        for (let j = 0; j < Math.ceil(width / chunkSize) + 1; j++) {
            let chunkJ = startChunkJ + j;
            let chunk = map.chunks[`${chunkI}_${chunkJ}`];
            if (chunk === undefined) {
                console.log("missing chunk creation", `${chunkI}_${chunkJ}`);
                continue;
            }
            let x = chunkJ * chunkSize - startX;
            let y = chunkI * chunkSize - startY;
            paintChunk(ctx, { x, y }, chunk, map.tileSize, { x: chunkJ, y: chunkI }, mapChunkPaintCache);
        }
    }

    for (let i = 0; i < Math.ceil(height / chunkSize) + 1; i++) {
        let chunkI = startChunkI + i;
        for (let j = 0; j < Math.ceil(width / chunkSize) + 1; j++) {
            let chunkJ = startChunkJ + j;
            let chunk = map.chunks[`${chunkI}_${chunkJ}`];
            if (chunk === undefined) continue;
            paintCharacters(ctx, chunk.characters, cameraPosition);
        }
    }
}

function paintChunk(ctx: CanvasRenderingContext2D, paintTopLeftPosition: Position, chunk: MapChunk, tileSize: number, chunkIJ: Position, mapChunkPaintCache: MapChunkPaintCache) {
    if (chunk) {
        let chunkSize = tileSize * chunk.tiles.length;
        let chunkKey = `${chunkIJ.y}_${chunkIJ.x}`;
        let readyForCache = true;
        if (mapChunkPaintCache[chunkKey] === undefined) {
            let canvas = document.createElement('canvas');
            canvas.width = chunkSize;
            canvas.height = chunkSize;
            let cacheCtx: CanvasRenderingContext2D = canvas.getContext("2d")!;
            for (let i = 0; i < chunk.tiles.length; i++) {
                for (let j = 0; j < chunk.tiles[i].length; j++) {
                    let x = j * tileSize;
                    let y = i * tileSize;
                    let tileReady = paintTile(cacheCtx, { x, y }, tileSize, chunk.tiles[i][j], { x: chunkIJ.x * chunk.tiles.length + j, y: chunkIJ.y * chunk.tiles.length + i });
                    readyForCache = readyForCache && tileReady;
                }
            }
            if (readyForCache) mapChunkPaintCache[chunkKey] = cacheCtx;
        }
        if (readyForCache) {
            ctx.drawImage(mapChunkPaintCache[chunkKey].canvas, paintTopLeftPosition.x, paintTopLeftPosition.y);
        }
    }
}


function paintTile(ctx: CanvasRenderingContext2D, paintPosition: Position, tileSize: number, tileId: number, posIJ: Position): boolean {
    let imageReady = true;
    if (TILE_VALUES[tileId]) {
        if (TILE_VALUES[tileId].imagePath !== undefined) {
            if (TILE_VALUES[tileId].imageRef === undefined) {
                let image = new Image();
                image.src = TILE_VALUES[tileId].imagePath!;
                if (!image.complete) {
                    imageReady = false;
                }else{
                    ctx.drawImage(image, paintPosition.x, paintPosition.y);
                }
                TILE_VALUES[tileId].imageRef = image;
            } else {
                if (!TILE_VALUES[tileId].imageRef!.complete) {
                    imageReady = false;
                }else{
                    ctx.drawImage(TILE_VALUES[tileId].imageRef!, paintPosition.x, paintPosition.y);
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