import { Game, GameState, Position } from "./game.js"
import { nextRandom } from "./randomNumberGenerator.js";

let TILE_VALUES: { [key: number]: { name: string, color?: string, imagePath?: string, imageRef?: HTMLImageElement } } = {
    0: { name: "grass", imagePath: "/images/grass.png" },
    1: { name: "tree", imagePath: "/images/tree.png" },
    2: { name: "rock", imagePath: "/images/rock.png" },
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
    let width = ctx.canvas.width;
    let height = ctx.canvas.height;
    let startChunkI = Math.floor(cameraPosition.y / chunkSize);
    let startChunkJ = Math.floor(cameraPosition.x / chunkSize);

    for (let i = 0; i < Math.ceil(height / chunkSize) + 1; i++) {
        let chunkI = startChunkI + i;
        for (let j = 0; j < Math.ceil(width / chunkSize) + 1; j++) {
            let chunkJ = startChunkJ + j;
            let chunk = map.chunks[`${chunkI}_${chunkJ}`];
            if (!chunk) {
                chunk = createNewChunk(map.chunkLength, game.state, chunkI, chunkJ);
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

function createNewChunk(chunkLength: number, state: GameState, chunkI: number, chunkJ: number): number[][] {

    let chunk: number[][] = [];
    for (let i = 0; i < chunkLength; i++) {
        chunk.push([]);
        for (let j = 0; j < chunkLength; j++) {
            //            let random = testFixedRandom((chunkI*chunkLength + i), (chunkJ*chunkLength + j));
            //            random = random / 2 + testFixedRandom(chunkI, chunkJ) / 2;
            //            let randomTileId = Math.floor(random / 256 * 3);
            let px = (chunkI * chunkLength + i) / 16;
            let py = (chunkJ * chunkLength + i) / 16;
            let perlin = perlin_get(px, py);
            console.log(perlin, px, py);
            let randomTileId = Math.floor((perlin + 1));
            chunk[i].push(randomTileId);
        }
    }

    return chunk;
}

function testFixedRandom(x: number, y: number) {
    return (Math.sin((x * 112.01716 + y * 718.233) * 437057.545323) * 1000000) & 255;
}

function paintTile(ctx: CanvasRenderingContext2D, paintPosition: Position, tileSize: number, tileId: number) {
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
                console.log("image load");
            } else {
                ctx.drawImage(TILE_VALUES[tileId].imageRef!, paintPosition.x, paintPosition.y);
            }
        } else if (TILE_VALUES[tileId].color !== undefined) {
            ctx.fillStyle = TILE_VALUES[tileId].color!;
            ctx.fillRect(paintPosition.x, paintPosition.y, tileSize, tileSize);
        } else {
            console.log("missing tile color or image path", tileId);
        }
    }
}



function random_unit_vector() {
    let theta = Math.random() * 2 * Math.PI;
    return { x: Math.cos(theta), y: Math.sin(theta) };
}


let grid: { x: number, y: number }[][] = [];

function perlin_get(x: number, y: number) {
    let x0 = Math.floor(x);
    let x1 = x0 + 1;
    let y0 = Math.floor(y);
    let y1 = y0 + 1;

    let dotProdX0Y0 = dot_prod_grid(x, y, x0, y0, grid);
    let dotProdX1Y0 = dot_prod_grid(x, y, x1, y0, grid);
    let dotProdX0Y1 = dot_prod_grid(x, y, x0, y1, grid);
    let dotProdX1Y1 = dot_prod_grid(x, y, x1, y1, grid);

    let inter1 = interp(x - x0, dotProdX0Y0, dotProdX1Y0);
    let inter2 = interp(x - x0, dotProdX0Y1, dotProdX1Y1);
    let result = interp(y - y0, inter1, inter2);

    return result;
}

function dot_prod_grid(x: number, y: number, vx: number, vy: number, gradients: any) {
    let g_vect;
    let d_vect = { x: x - vx, y: y - vy };
    if (gradients[vx] && gradients[vx][vy]) {
        g_vect = gradients[vx][vy];
    } else {
        if (!gradients[vx]) gradients[vx] = [];
        g_vect = random_unit_vector();
        gradients[vx][vy] = g_vect;
    }
    return d_vect.x * g_vect.x + d_vect.y * g_vect.y;
}

function smootherstep(x: number) {
    return 6 * x ** 5 - 15 * x ** 4 + 10 * x ** 3;
}

function interp(x: number, a: number, b: number) {
    return a + smootherstep(x) * (b - a);
}