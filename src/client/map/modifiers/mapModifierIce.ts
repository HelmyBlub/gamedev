import { calculateDistance, getNextId } from "../../game.js";
import { Game, IdCounter, Position } from "../../gameModel.js";
import { MODIFY_SHAPE_NAME_CIRCLE } from "./mapShapeCircle.js";
import { GAME_MAP_MODIFIER_FUNCTIONS, GameMapModifier } from "./mapModifier.js";
import { GameMapArea, getShapeMiddle, setShapeAreaToAmount } from "./mapModifierShapes.js";
import { GameMapAreaRect, MODIFY_SHAPE_NAME_RECTANGLE } from "./mapShapeRectangle.js";
import { MODIFY_SHAPE_NAME_CELESTIAL_DIRECTION } from "./mapShapeCelestialDirection.js";
import { MapChunk, positionToGameMapTileXY, TILE_ID_GRASS, TILE_ID_ICE, TILE_ID_TREE } from "../map.js";
import { perlin_get } from "../mapGeneration.js";
import { nextRandom, RandomSeed } from "../../randomNumberGenerator.js";

export const MODIFIER_NAME_ICE = "Ice";
type Maze = {
    radiusTiles: number,
    goalTile: Position,
    entranceTile: Position,
    mazeTiles: number[][],
}

type MazeSolveLoop = {
    id: number,
    tiles: Position[],
    choiceTiles: {
        tile: Position,
        connectingLoop?: MazeSolveLoop,
    }[],
}
export type MapModifierIce = GameMapModifier & {
    mazeOffset?: Position,
    maze?: Maze,
}

export function addMapModifierIce() {
    GAME_MAP_MODIFIER_FUNCTIONS[MODIFIER_NAME_ICE] = {
        create: create,
        onGameInit: onGameInit,
        growArea: growArea,
        onChunkCreateModify: onChunkCreateModify,
    };
}

export function create(
    area: GameMapArea,
    idCounter: IdCounter,
): MapModifierIce {
    const modifier = {
        id: getNextId(idCounter),
        type: MODIFIER_NAME_ICE,
        area: area,
        areaPerLevel: 1000000,
        level: 5,
    };
    return modifier;
}

function onChunkCreateModify(modifier: GameMapModifier, mapChunk: MapChunk, chunkX: number, chunkY: number, game: Game) {
    const middle = getShapeMiddle(modifier.area, game);
    if (!middle) return;
    const iceMod = modifier as MapModifierIce;
    const tileSize = game.state.map.tileSize;
    const chunkSize = game.state.map.chunkLength * tileSize;
    const chunkTopLeft: Position = {
        x: chunkX * chunkSize,
        y: chunkY * chunkSize,
    }
    for (let x = 0; x < mapChunk.tiles.length; x++) {
        for (let y = 0; y < mapChunk.tiles[x].length; y++) {
            const tileX = chunkTopLeft.x + x * tileSize;
            const tileY = chunkTopLeft.y + y * tileSize;
            const distance = calculateDistance(middle, { x: tileX, y: tileY });
            if (isMazeTile(iceMod, distance, tileSize)) {
                maze(mapChunk, x, y, distance, iceMod, tileSize, chunkX, chunkY, game);
            } else {
                if (mapChunk.tiles[x][y] === TILE_ID_GRASS) {
                    const convertedDistance = mapPositiveNumberToNumberBetweenZeroAndOne(distance / (1 + modifier.level / 10));
                    const perlin = perlin_get(tileX / chunkSize + 512, tileY / chunkSize, game.state.map.seed!);
                    if (convertedDistance < perlin) mapChunk.tiles[x][y] = TILE_ID_ICE;
                }
            }
        }
    }
}

function maze(mapChunk: MapChunk, x: number, y: number, distance: number, iceMod: MapModifierIce, tileSize: number, chunkX: number, chunkY: number, game: Game) {
    if (!iceMod.maze) return;
    if (distance > iceMod.maze.radiusTiles * tileSize - tileSize * 1.5) {
        mapChunk.tiles[x][y] = TILE_ID_GRASS;
        return;
    }
    mapChunk.tiles[x][y] = TILE_ID_ICE;
    if (iceMod.maze && iceMod.mazeOffset) {
        const chunkLength = game.state.map.chunkLength;
        const mazeTileX = x + chunkX * chunkLength - iceMod.mazeOffset.x;
        const mazeTileY = y + chunkY * chunkLength - iceMod.mazeOffset.y;
        if (iceMod.maze.entranceTile.x === mazeTileX && iceMod.maze.entranceTile.y === mazeTileY) {
            mapChunk.tiles[x][y] = TILE_ID_GRASS;
            return;
        }
        if (iceMod.maze.goalTile.x === mazeTileX && iceMod.maze.goalTile.y === mazeTileY) {
            mapChunk.tiles[x][y] = TILE_ID_GRASS;
            return;
        }
        if (iceMod.maze.mazeTiles[mazeTileX][mazeTileY] === MAZE_BLOCKING) {
            mapChunk.tiles[x][y] = TILE_ID_TREE;
        }
    }
}

const MAZE_BLOCKING = 1; //TODO delete after testing
function createMaze(randomSeed: RandomSeed): Maze {
    const middle: Position = { x: 10, y: 10 };
    const maze: Maze = {
        entranceTile: { x: 13, y: 3 },
        goalTile: { x: 10, y: 10 },
        radiusTiles: 10,
        mazeTiles: [],
    }
    const mazeTileIsBlocking: number[][] = maze.mazeTiles;
    //generate empty maze
    for (let x = -maze.radiusTiles + middle.x; x < maze.radiusTiles + middle.x; x++) {
        mazeTileIsBlocking[x] = [];
        for (let y = -maze.radiusTiles + middle.y; y < maze.radiusTiles + middle.y; y++) {
            const distance = calculateDistance(middle, { x, y });
            if (distance > maze.radiusTiles - 1.5) {
                mazeTileIsBlocking[x][y] = MAZE_BLOCKING;
                continue;
            }
            if (distance >= maze.radiusTiles - 3) {
                mazeTileIsBlocking[x][y] = MAZE_BLOCKING;
                continue;
            }
            mazeTileIsBlocking[x][y] = 0;
        }
    }
    mazeTileIsBlocking[maze.entranceTile.x][maze.entranceTile.y] = 2;
    mazeTileIsBlocking[maze.entranceTile.x][maze.entranceTile.y + 3] = MAZE_BLOCKING;
    console.log(mazeTileIsBlocking);

    let isSolveableResult;
    let solve: MazeSolveLoop[];
    do {
        solve = solveMaze(maze, mazeTileIsBlocking);
        isSolveableResult = isSolveableAndEscapeable(solve, maze, mazeTileIsBlocking);
        if (typeof isSolveableResult === "object") {
            if (isSolveableResult.failingLoopId !== undefined) {
                let loop = solve[isSolveableResult.failingLoopId];
                let distance = 0;
                let tile1;
                let tile2;
                let findCounter = 0;
                do {
                    findCounter++;
                    if (findCounter % 10 === 0) {
                        if (findCounter > 100) break;
                        if (loop.choiceTiles.length > 0 && loop.choiceTiles[0].connectingLoop) {
                            loop = loop.choiceTiles[0].connectingLoop;
                        } else {
                            break;
                        }
                    }
                    const randomTileIndex = Math.floor(loop.tiles.length * nextRandom(randomSeed));
                    tile1 = loop.tiles[randomTileIndex];
                    let counter = 0;
                    do {
                        counter++;
                        tile2 = loop.tiles[(randomTileIndex + counter) % loop.tiles.length];
                    } while (tile1.x !== tile2.x && tile1.y !== tile2.y);
                    distance = calculateDistance(tile1, tile2);
                } while (distance < 3);
                if (distance >= 3 && tile2 && tile1) {
                    const randomDistance = Math.floor(distance * nextRandom(randomSeed));
                    const signX = Math.sign(tile2.x - tile1.x);
                    const signY = Math.sign(tile2.y - tile1.y);
                    const randomTile = {
                        x: tile1.x + signX * randomDistance,
                        y: tile1.y + signY * randomDistance,
                    }
                    mazeTileIsBlocking[randomTile.x][randomTile.y] = MAZE_BLOCKING;
                } else {
                    break;
                }
            } else if (isSolveableResult.goalNotReachable === true) {
                break;
            }
        }
    } while (typeof isSolveableResult !== "boolean" || isSolveableResult !== true);
    console.log(solve);
    console.log(isSolveableResult);
    return maze;
}

function isSolveableAndEscapeable(solve: MazeSolveLoop[], maze: Maze, mazeTileIsBlocking: number[][]): { failingLoopId?: number, goalNotReachable?: boolean } | boolean {
    //isEscapeable
    const escapeableLoops: boolean[] = [];
    escapeableLoops[0] = true;
    for (let i = 1; i < solve.length; i++) {
        escapeableLoops[solve[i].id] = false;
    }
    for (let i = 1; i < solve.length; i++) {
        const loop = solve[i];
        if (escapeableLoops[loop.id]) continue;
        for (let choice of loop.choiceTiles) {
            if (!choice.connectingLoop) continue;
            if (escapeableLoops[choice.connectingLoop.id]) {
                escapeableLoops[loop.id] = true;
                i = 1;
                break;
            }
        }
    }
    for (let i = 1; i < escapeableLoops.length; i++) {
        if (!escapeableLoops[i]) {
            return { failingLoopId: i };
        }
    }

    //isSolveable
    const isReachable = isTileReacheable(maze.goalTile, solve, mazeTileIsBlocking);
    return isReachable ? true : { goalNotReachable: true };
}

function isTileReacheable(checkTile: Position, solve: MazeSolveLoop[], mazeTileIsBlocking: number[][]): boolean {
    if (isTileInSolve(checkTile, solve)) return true;
    const tileRight = nextTileBeforeBlockingTile(mazeTileIsBlocking, checkTile, { x: 1, y: 0 });
    if (isTileInSolve(tileRight, solve)) return true;
    const tileLeft = nextTileBeforeBlockingTile(mazeTileIsBlocking, checkTile, { x: -1, y: 0 });
    if (isTileInSolve(tileLeft, solve)) return true;
    const tileTop = nextTileBeforeBlockingTile(mazeTileIsBlocking, checkTile, { x: 0, y: -1 });
    if (isTileInSolve(tileTop, solve)) return true;
    const tileBottom = nextTileBeforeBlockingTile(mazeTileIsBlocking, checkTile, { x: 0, y: 1 });
    if (isTileInSolve(tileTop, solve)) return true;
    return false;
}

function isTileInSolve(checkTile: Position, solve: MazeSolveLoop[]): boolean {
    for (let loop of solve) {
        for (let tile of loop.tiles) {
            if (tile.x === checkTile.x && tile.y === checkTile.y) {
                return true;
            }
        }
    }
    return false;
}

function solveMaze(maze: Maze, mazeTileIsBlocking: number[][]): MazeSolveLoop[] {
    const loops: MazeSolveLoop[] = [];
    let idCounter = 0;
    const initLoopSolve = checkLoop(maze, maze.entranceTile, mazeTileIsBlocking, idCounter++);
    const checkChoicesInLoop: MazeSolveLoop[] = [];
    loops.push(initLoopSolve);
    checkChoicesInLoop.push(initLoopSolve);
    while (checkChoicesInLoop.length > 0) {
        const currentChoiceCheckLoop = checkChoicesInLoop.shift()!;
        if (currentChoiceCheckLoop.choiceTiles.length > 0) {
            for (let tileData of currentChoiceCheckLoop.choiceTiles) {
                const tile = tileData.tile;
                let beforeBlockingTile;
                if (mazeTileIsBlocking[tile.x - 1][tile.y] !== 1 && mazeTileIsBlocking[tile.x + 1][tile.y] !== 1) {
                    beforeBlockingTile = nextTileBeforeBlockingTile(mazeTileIsBlocking, tile, { x: -1, y: 0 });
                } else {
                    beforeBlockingTile = nextTileBeforeBlockingTile(mazeTileIsBlocking, tile, { x: 0, y: -1 });
                }
                let isNewLoop = true;
                for (let loop of loops) {
                    const exists = loop.tiles.findIndex(t => t.x === beforeBlockingTile.x && t.y === beforeBlockingTile.y);
                    if (exists > -1) {
                        tileData.connectingLoop = loop;
                        isNewLoop = false;
                        break;
                    }
                }
                if (!isNewLoop) continue;
                const newLoop = checkLoop(maze, beforeBlockingTile, mazeTileIsBlocking, idCounter++);
                tileData.connectingLoop = newLoop;
                loops.push(newLoop);
                checkChoicesInLoop.push(newLoop);
            }
        }
    }
    return loops;
}

function checkLoop(maze: Maze, initialLoopTile: Position, mazeTileIsBlocking: number[][], id: number): MazeSolveLoop {
    const solve: MazeSolveLoop = {
        id: id,
        tiles: [],
        choiceTiles: [],
    }

    const openTiles: Position[] = [initialLoopTile];
    while (openTiles.length > 0) {
        const currentTile = openTiles.shift()!;
        const exists = solve.tiles.findIndex(t => t.x === currentTile.x && t.y === currentTile.y);
        if (exists > -1) continue;
        solve.tiles.push(currentTile);
        if (mazeTileIsBlocking[currentTile.x][currentTile.y] === 1) throw "should not happen";
        if (mazeTileIsBlocking[currentTile.x - 1][currentTile.y] === MAZE_BLOCKING && mazeTileIsBlocking[currentTile.x + 1][currentTile.y] !== MAZE_BLOCKING) {
            const tile = nextTileBeforeBlockingTile(mazeTileIsBlocking, currentTile, { x: 1, y: 0 });
            const exists = solve.tiles.findIndex(t => t.x === tile.x && t.y === tile.y);
            if (exists === -1) openTiles.push(tile);
        }
        if (mazeTileIsBlocking[currentTile.x + 1][currentTile.y] === MAZE_BLOCKING && mazeTileIsBlocking[currentTile.x - 1][currentTile.y] !== MAZE_BLOCKING) {
            const tile = nextTileBeforeBlockingTile(mazeTileIsBlocking, currentTile, { x: -1, y: 0 });
            const exists = solve.tiles.findIndex(t => t.x === tile.x && t.y === tile.y);
            if (exists === -1) openTiles.push(tile);
        }
        if (mazeTileIsBlocking[currentTile.x][currentTile.y - 1] === MAZE_BLOCKING && mazeTileIsBlocking[currentTile.x][currentTile.y + 1] !== MAZE_BLOCKING) {
            const tile = nextTileBeforeBlockingTile(mazeTileIsBlocking, currentTile, { x: 0, y: 1 });
            const exists = solve.tiles.findIndex(t => t.x === tile.x && t.y === tile.y);
            if (exists === -1) openTiles.push(tile);
        }
        if (mazeTileIsBlocking[currentTile.x][currentTile.y + 1] === MAZE_BLOCKING && mazeTileIsBlocking[currentTile.x][currentTile.y - 1] !== MAZE_BLOCKING) {
            const tile = nextTileBeforeBlockingTile(mazeTileIsBlocking, currentTile, { x: 0, y: -1 });
            const exists = solve.tiles.findIndex(t => t.x === tile.x && t.y === tile.y);
            if (exists === -1) openTiles.push(tile);
        }
        if ((mazeTileIsBlocking[currentTile.x - 1][currentTile.y] !== MAZE_BLOCKING && mazeTileIsBlocking[currentTile.x + 1][currentTile.y] !== MAZE_BLOCKING)
            || (mazeTileIsBlocking[currentTile.x][currentTile.y - 1] !== MAZE_BLOCKING && mazeTileIsBlocking[currentTile.x][currentTile.y + 1] !== MAZE_BLOCKING)) {
            solve.choiceTiles.push({ tile: currentTile });
        }
    }

    return solve;
}

function nextTileBeforeBlockingTile(mazeTileIsBlocking: number[][], initialTile: Position, direction: Position): Position {
    let counter = 0;
    while (true) {
        counter++;
        if (mazeTileIsBlocking[initialTile.x + direction.x * counter][initialTile.y + direction.y * counter] === MAZE_BLOCKING) {
            counter--;
            break;
        }
    }
    return { x: initialTile.x + direction.x * counter, y: initialTile.y + direction.y * counter };
}

function isMazeTile(iceMod: MapModifierIce, distance: number, tileSize: number): boolean {
    if (iceMod.maze && distance < iceMod.maze.radiusTiles * tileSize) {
        return true;
    }
    return false;
}

function initMaze(modifier: GameMapModifier, game: Game) {
    if (modifier.area.type === MODIFY_SHAPE_NAME_CELESTIAL_DIRECTION) return;
    const middle = getShapeMiddle(modifier.area, game);
    if (!middle) return;
    const iceMod = modifier as MapModifierIce;
    const middleTile = positionToGameMapTileXY(game.state.map, middle);
    iceMod.maze = createMaze(game.state.randomSeed);
    iceMod.mazeOffset = {
        x: middleTile.x - Math.ceil(iceMod.maze.radiusTiles),
        y: middleTile.y - Math.ceil(iceMod.maze.radiusTiles),
    }

}

function mapPositiveNumberToNumberBetweenZeroAndOne(x: number): number {
    return Math.atan(x * x / 100000) / (Math.PI / 2);
}

function onGameInit(modifier: GameMapModifier, game: Game) {
    let spawn: Position | undefined = undefined;

    if (modifier.area.type === MODIFY_SHAPE_NAME_RECTANGLE || modifier.area.type === MODIFY_SHAPE_NAME_CIRCLE) {
        const area = modifier.area as GameMapAreaRect;
        if (game.state.activeCheats && game.state.activeCheats.indexOf("closeCurses") !== -1) {
            area.x = 1500;
            area.y = 1500;
        }
    }
    const ice = modifier as MapModifierIce;
    if (ice.area.type === MODIFY_SHAPE_NAME_CELESTIAL_DIRECTION) {
        return;
    }
    spawn = getShapeMiddle(modifier.area, game);
    initMaze(modifier, game);
    if (spawn === undefined) return;
    // const areaBoss = createAreaBossLighntingCloudMachine(game.state.idCounter, spawn, modifier.id, game);
    // game.state.bossStuff.bosses.push(areaBoss);
}

//TODO make it a general version every modifier uses
function growArea(modifier: GameMapModifier) {
    const lightning = modifier as MapModifierIce;
    lightning.level++;
    if (lightning.areaPerLevel === undefined) return;
    const areaAmount = lightning.level * lightning.areaPerLevel;
    setShapeAreaToAmount(lightning.area, areaAmount);
}
