import { paintCharacters } from "../character/character.js";
import { MapChunkPaintCache, MapPaintCache, Position } from "../gameModel.js";
import { GameMap, MapChunk, TILE_VALUES } from "./map.js";

export function paintMap(ctx: CanvasRenderingContext2D, cameraPosition: Position, map: GameMap, mapChunkPaintCache: MapChunkPaintCache, mapPaintCache: MapPaintCache) {
    let chunkSize = map.tileSize * map.chunkLength;
    let width = ctx.canvas.width;
    let height = ctx.canvas.height;
    let startX = (cameraPosition.x - width / 2);
    let startY = (cameraPosition.y - height / 2);
    let startChunkI = Math.floor(startY / chunkSize);
    let startChunkJ = Math.floor(startX / chunkSize);
    let readyForCache = true;

    if (mapPaintCache.cacheCtx === undefined || startChunkI !== mapPaintCache.startI  || startChunkJ !== mapPaintCache.startJ) {
        let canvas = document.createElement('canvas');
        canvas.width = (Math.ceil(width / chunkSize) + 1) * chunkSize;
        canvas.height = (Math.ceil(height / chunkSize) + 1) * chunkSize;
        let cacheCtx: CanvasRenderingContext2D = canvas.getContext("2d")!;

        for (let i = 0; i < Math.ceil(height / chunkSize) + 1; i++) {
            let chunkI = startChunkI + i;
            for (let j = 0; j < Math.ceil(width / chunkSize) + 1; j++) {
                let chunkJ = startChunkJ + j;
                let chunk = map.chunks[`${chunkI}_${chunkJ}`];
                if (chunk === undefined) {
                    console.log("missing chunk creation", `${chunkI}_${chunkJ}`);
                    continue;
                }
                let x = j * chunkSize;
                let y = i * chunkSize;
                let chunkReady = paintChunk(cacheCtx, { x, y }, chunk, map.tileSize, { x: chunkJ, y: chunkI }, mapChunkPaintCache);
                readyForCache = readyForCache && chunkReady;
            }
        }
        if(readyForCache){
            mapPaintCache.cacheCtx = cacheCtx;
            mapPaintCache.startI = startChunkI;
            mapPaintCache.startJ = startChunkJ;
        }
    }
    if(readyForCache){
        let offsetX = Math.floor(startX % chunkSize);
        if(offsetX < 0) offsetX += chunkSize;
        let offsetY =  Math.floor(startY % chunkSize);
        if(offsetY < 0) offsetY += chunkSize;
        ctx.drawImage(mapPaintCache.cacheCtx!.canvas,
            offsetX,
            offsetY,
            width,
            height,
            0,
            0,
            width,
            height
        );
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

function paintChunk(ctx: CanvasRenderingContext2D, paintTopLeftPosition: Position, chunk: MapChunk, tileSize: number, chunkIJ: Position, mapChunkPaintCache: MapChunkPaintCache): boolean {
    let readyForCache = false;
    if (chunk) {
        readyForCache = true;
        let chunkSize = tileSize * chunk.tiles.length;
        let chunkKey = `${chunkIJ.y}_${chunkIJ.x}`;
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
    return readyForCache;
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
                }
                ctx.drawImage(image, paintPosition.x, paintPosition.y);
                TILE_VALUES[tileId].imageRef = image;
            } else {
                if (!TILE_VALUES[tileId].imageRef!.complete) {
                    imageReady = false;
                }
                ctx.drawImage(TILE_VALUES[tileId].imageRef!, paintPosition.x, paintPosition.y);
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