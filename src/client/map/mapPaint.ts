import { paintCharacters } from "../character/characterPaint.js";
import { Debugging, Game, MapChunkPaintCache, Position } from "../gameModel.js";
import { GAME_IMAGES, loadImage } from "../imageLoad.js";
import { GameMap, getTileIdForTileName, IMAGE_FIRE_ANIMATION, MapChunk, MapTileAnimation, TILE_VALUES } from "./map.js";

export type MapPaintLayer = "Layer1" | "Layer2";

export function paintMap(layer: MapPaintLayer, ctx: CanvasRenderingContext2D, cameraPosition: Position, map: GameMap, mapChunkPaintCache: MapChunkPaintCache, debug: Debugging | undefined, time: number) {
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
            let chunkKey = `${chunkI}_${chunkJ}`;
            let chunk = map.chunks[chunkKey];
            if (chunk === undefined) {
                if(time > 1000) console.log("missing chunk creation", chunkKey);
                continue;
            }
            let x = chunkJ * chunkSize - startX;
            let y = chunkI * chunkSize - startY;
            paintChunk(layer, ctx, { x, y }, chunk, map.tileSize, { x: chunkJ, y: chunkI }, mapChunkPaintCache, time, debug);
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
    let startChunkI = Math.floor(startY / chunkSize);
    let startChunkJ = Math.floor(startX / chunkSize);

    for (let i = 0; i < Math.ceil(height / chunkSize) + 1; i++) {
        let chunkI = startChunkI + i;
        for (let j = 0; j < Math.ceil(width / chunkSize) + 1; j++) {
            let chunkJ = startChunkJ + j;
            let chunk = map.chunks[`${chunkI}_${chunkJ}`];
            if (chunk === undefined) continue;
            paintCharacters(ctx, chunk.characters, cameraPosition, game);
        }
    }
}

function paintChunk(layer: MapPaintLayer, ctx: CanvasRenderingContext2D, paintTopLeftPosition: Position, chunk: MapChunk, tileSize: number, chunkIJ: Position, mapChunkPaintCache: MapChunkPaintCache, time: number, debug: Debugging | undefined) {
    let chunkSize = tileSize * chunk.tiles.length;
    let chunkKey = `${chunkIJ.y}_${chunkIJ.x}_${layer}`;
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
                let tileReady = paintTile(layer, cacheCtx, { x, y }, tileSize, chunk.tiles[i][j]);
                if (debug?.paintTileIJNumbers && layer === "Layer2") {
                    cacheCtx.fillStyle = "black";
                    cacheCtx.font = "8px Arial";
                    cacheCtx.fillText((chunkIJ.x * chunk.tiles.length + j) + "_" + (chunkIJ.y * chunk.tiles.length + i), x, y + 10);
                }
                readyForCache = readyForCache && tileReady;
            }
        }
        if (readyForCache) mapChunkPaintCache[chunkKey] = cacheCtx;
    }
    if (readyForCache) {
        ctx.drawImage(mapChunkPaintCache[chunkKey].canvas, paintTopLeftPosition.x, paintTopLeftPosition.y);
        if(chunk.animatedTiles.length > 0 && layer === "Layer2"){
            for(let animation of chunk.animatedTiles){
                paintTileAnimation(ctx, animation, paintTopLeftPosition, tileSize, time);
            }
        }
    }
}

function paintTileAnimation(ctx: CanvasRenderingContext2D, animation: MapTileAnimation, paintTopLeftPosition: Position, tileSize: number, time: number){
    let animationImage = GAME_IMAGES[animation.name];
    loadImage(animationImage);
    if (animationImage.imageRef?.complete) {
        let paintX = paintTopLeftPosition.x + animation.j * tileSize;
        let paintY = paintTopLeftPosition.y + animation.i * tileSize;
        let spriteAnimation = Math.floor(time / 150) % 2;
        let spriteWidth = animationImage.spriteRowWidths[0];
        let spriteHeight = animationImage.spriteRowHeights[0];
        ctx.drawImage(
            animationImage.imageRef,
            0 + spriteAnimation * spriteWidth,
            0,
            spriteWidth, spriteHeight,
            Math.floor(paintX),
            Math.floor(paintY),
            spriteWidth, spriteHeight
        );
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