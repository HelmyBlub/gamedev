import { Position } from "../gameModel.js";
import { GameMap, TILE_VALUES } from "./map.js";
import { createNewChunk } from "./mapGeneration.js";

export function paintMap(ctx: CanvasRenderingContext2D, cameraPosition: Position, map: GameMap) {
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
            if (!chunk) {
                chunk = createNewChunk(map.chunkLength, chunkI, chunkJ, map.seed!);
                map.chunks[`${chunkI}_${chunkJ}`] = chunk;
            }
            let x = chunkJ * chunkSize - startX;
            let y = chunkI * chunkSize - startY;
            paintChunk(ctx, { x, y }, chunk, map.tileSize, {x: chunkJ, y: chunkI});
        }
    }
}

function paintChunk(ctx: CanvasRenderingContext2D, paintTopLeftPosition: Position, chunk: number[][], tileSize: number, chunkIJ: Position) {
    if (chunk) {
        for (let i = 0; i < chunk.length; i++) {
            for (let j = 0; j < chunk[i].length; j++) {
                let x = paintTopLeftPosition.x + j * tileSize;
                let y = paintTopLeftPosition.y + i * tileSize;
                paintTile(ctx, { x, y }, tileSize, chunk[i][j], {x:chunkIJ.x * chunk.length + j, y:chunkIJ.y * chunk.length + i});
            }
        }
    }
}


function paintTile(ctx: CanvasRenderingContext2D, paintPosition: Position, tileSize: number, tileId: number, posIJ: Position) {
    if (paintPosition.x + tileSize < 0 || paintPosition.x > ctx.canvas.width
        || paintPosition.y + tileSize < 0 || paintPosition.y > ctx.canvas.height) {
        return;
    }

    ctx.fillStyle = "white";
    if (TILE_VALUES[tileId]) {
        if (TILE_VALUES[tileId].imagePath !== undefined) {
            if (TILE_VALUES[tileId].imageRef === undefined) {
                let image = new Image();
                image.src = TILE_VALUES[tileId].imagePath!;
                ctx.drawImage(image, paintPosition.x, paintPosition.y);
                TILE_VALUES[tileId].imageRef = image;
            } else {
                ctx.drawImage(TILE_VALUES[tileId].imageRef!, paintPosition.x, paintPosition.y);
//                ctx.fillStyle = "Black";
//                ctx.font = "8px Arial";
//                ctx.fillText(`${posIJ.x}_${posIJ.y}`, paintPosition.x + 10, paintPosition.y + 20);
            }
        } else if (TILE_VALUES[tileId].color !== undefined) {
            ctx.fillStyle = TILE_VALUES[tileId].color!;
            ctx.fillRect(paintPosition.x, paintPosition.y, tileSize, tileSize);
        } else {
            console.log("missing tile color or image path", tileId);
        }
    }
}