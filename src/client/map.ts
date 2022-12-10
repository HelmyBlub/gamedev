import { Game, GameState, Position } from "./game.js"
import { nextRandom } from "./randomNumberGenerator.js";

let TILE_VALUES: { [key: number]: { name: string, color?: string, imagePath?: string, imageRef?: HTMLImageElement } } = {
    0: { name: "grass", imagePath: "/images/grass.png" },
    1: { name: "tree", imagePath: "/images/tree.png"},
    2: { name: "rock", imagePath: "/images/rock.png"},
}

export type GameMap = {
    tileSize: number,
    chunkLength: number,
    chunks: { [chunkId: string]: number[][] },
}

export function createMap(): GameMap {
    return {
        tileSize: 40,
        chunkLength: 8,
        chunks: {},
    }
}

export function paintMap(ctx: CanvasRenderingContext2D, cameraPosition: Position, map: GameMap, game: Game) {
    let chunkSize = map.tileSize * map.chunkLength;
    let startChunkI = Math.floor(cameraPosition.y / chunkSize);
    let startChunkJ = Math.floor(cameraPosition.x / chunkSize);

    for(let i = 0; i < 2; i++){
        let chunkI = startChunkI + i;
        for(let j = 0; j < 3; j++){
            let chunkJ = startChunkJ + j;
            let chunk = map.chunks[`${chunkI}_${chunkJ}`];
            if (!chunk) {
                chunk = createNewChunk(map.chunkLength, game.state);
                map.chunks[`${chunkI}_${chunkJ}`] = chunk;
            }
            let x = chunkJ * chunkSize - cameraPosition.x;
            let y = chunkI * chunkSize - cameraPosition.y;
            paintChunk(ctx, { x, y }, chunk, map.tileSize);
        }
    }
}

function paintChunk(ctx: CanvasRenderingContext2D, paintTopLeftPosition: Position, chunk: number[][], tileSize: number) {
    if (chunk) {
        for (let i = 0; i < chunk.length; i++) {
            for (let j = 0; j < chunk[i].length; j++) {
                let x = paintTopLeftPosition.x + j * tileSize;
                let y = paintTopLeftPosition.y + i * tileSize;
                paintTile(ctx, { x, y }, tileSize, chunk[i][j]);
            }
        }
    }
}

function createNewChunk(chunkLength: number, state: GameState): number[][] {
    let chunk: number[][] = [];
    for (let i = 0; i < chunkLength; i++) {
        chunk.push([]);
        for (let j = 0; j < chunkLength; j++) {
            chunk[i].push(Math.floor(nextRandom(state) * 3));
        }
    }

    return chunk;
}

function paintTile(ctx: CanvasRenderingContext2D, paintPosition: Position, tileSize: number, tileId: number) {
    ctx.fillStyle = "white";
    if (TILE_VALUES[tileId]) {
        if(TILE_VALUES[tileId].imagePath !== undefined){
            if(TILE_VALUES[tileId].imageRef === undefined){
                let image = new Image();
                image.src = TILE_VALUES[tileId].imagePath!;
                ctx.drawImage(image, paintPosition.x, paintPosition.y);   
                TILE_VALUES[tileId].imageRef = image;
                console.log("image load");
            }else{
                ctx.drawImage(TILE_VALUES[tileId].imageRef!, paintPosition.x, paintPosition.y);    
            }
        }else if(TILE_VALUES[tileId].color !== undefined){
            ctx.fillStyle = TILE_VALUES[tileId].color!;
            ctx.fillRect(paintPosition.x, paintPosition.y, tileSize, tileSize);
        }else{
            console.log("missing tile color or image path", tileId);
        }
    }
}

