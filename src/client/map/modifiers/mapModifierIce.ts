import { calculateDistance, getNextId } from "../../game.js";
import { Game, IdCounter, Position } from "../../gameModel.js";
import { MODIFY_SHAPE_NAME_CIRCLE } from "./mapShapeCircle.js";
import { GAME_MAP_MODIFIER_FUNCTIONS, GameMapModifier } from "./mapModifier.js";
import { GameMapArea, getShapeMiddle } from "./mapModifierShapes.js";
import { GameMapAreaRect, MODIFY_SHAPE_NAME_RECTANGLE } from "./mapShapeRectangle.js";
import { MODIFY_SHAPE_NAME_CELESTIAL_DIRECTION } from "./mapShapeCelestialDirection.js";
import { MapChunk, positionToGameMapTileXY, TILE_ID_GRASS, TILE_ID_ICE, TILE_ID_TREE } from "../map.js";
import { perlin_get } from "../mapGeneration.js";
import { nextRandom, RandomSeed } from "../../randomNumberGenerator.js";
import { createAreaBossIceSnowman } from "../../character/enemy/areaBoss/areaBossSnowman.js";

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
    isGoalTileOnLoop?: boolean,
    connectingGoalLoopId?: number,
}
export type MapModifierIce = GameMapModifier & {
    mazeOffset?: Position,
    maze?: Maze,
}

const MAZE_BLOCKING = 1;

export function addMapModifierIce() {
    GAME_MAP_MODIFIER_FUNCTIONS[MODIFIER_NAME_ICE] = {
        create: create,
        onGameInit: onGameInit,
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
                mapChunk.characters = [];
            } else {
                if (mapChunk.tiles[x][y] === TILE_ID_GRASS) {
                    let convertedDistance = mapPositiveNumberToNumberBetweenZeroAndOne(distance / (1 + modifier.level / 10));
                    if (iceMod.area.type === MODIFY_SHAPE_NAME_CELESTIAL_DIRECTION) {
                        convertedDistance = Math.min(0.4, convertedDistance);
                    }
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

function createMaze(randomSeed: RandomSeed): Maze {
    const minDifficulty = 5;
    let mazeCandidate;
    do {
        mazeCandidate = tryGenerateSomeMaze(randomSeed, 15);
    } while (mazeCandidate === undefined || mazeCandidate.difficulty < minDifficulty);
    return mazeCandidate.maze;
}

function tryGenerateSomeMaze(randomSeed: RandomSeed, radius: number): { maze: Maze, difficulty: number } | undefined {
    const maze: Maze = {
        entranceTile: { x: radius + 3, y: 3 },
        goalTile: { x: radius, y: radius },
        radiusTiles: radius,
        mazeTiles: [],
    }
    const middle: Position = { x: maze.radiusTiles, y: maze.radiusTiles };
    const mazeTileIsBlocking: number[][] = maze.mazeTiles;
    //generate empty maze
    for (let x = 0; x < maze.radiusTiles * 2; x++) {
        mazeTileIsBlocking[x] = [];
        for (let y = 0; y < maze.radiusTiles * 2; y++) {
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

    let isSolveableResult;
    let solve: MazeSolveLoop[];
    let counter = 0;
    do {
        counter++;
        solve = solveMazeBackwards(maze, mazeTileIsBlocking);
        isSolveableResult = isSolveable(solve, maze, mazeTileIsBlocking);
        if (!isSolveableResult) {
            if (counter > 100) {
                console.log("maze generation max loops reached. Maze is broken");
                break;
            }
            const randomLoopIndex = Math.floor(solve.length * nextRandom(randomSeed));
            const randomLoop = solve[randomLoopIndex];
            const listOfPathIndexesWithEnoughDistance = [];
            const minDistance = 2;
            for (let i = 0; i < randomLoop.tiles.length - 1; i++) {
                const distance = calculateDistance(randomLoop.tiles[i], randomLoop.tiles[i + 1]);
                if (distance >= minDistance) {
                    listOfPathIndexesWithEnoughDistance.push(i);
                }
            }
            if (listOfPathIndexesWithEnoughDistance.length === 0) continue;
            const randomPathIndex = Math.floor(listOfPathIndexesWithEnoughDistance.length * nextRandom(randomSeed));
            const randomPathStartPos = randomLoop.tiles[randomPathIndex];
            const distance = calculateDistance(randomPathStartPos, randomLoop.tiles[randomPathIndex + 1]);
            const randomDistance = 1 + Math.floor((distance - minDistance) * nextRandom(randomSeed));
            const sign = {
                x: Math.sign(randomLoop.tiles[randomPathIndex + 1].x - randomPathStartPos.x),
                y: Math.sign(randomLoop.tiles[randomPathIndex + 1].y - randomPathStartPos.y)
            };
            const randomTileOnPath: Position = {
                x: randomPathStartPos.x + randomDistance * sign.x,
                y: randomPathStartPos.y + randomDistance * sign.y,
            };
            const randomAdjacentTile: Position = {
                x: randomTileOnPath.x + sign.y,
                y: randomTileOnPath.y + sign.x,
            };
            if (randomAdjacentTile.x === maze.goalTile.x && randomAdjacentTile.y === maze.goalTile.y) continue;
            mazeTileIsBlocking[randomAdjacentTile.x][randomAdjacentTile.y] = MAZE_BLOCKING;
        }
    } while (!isSolveableResult);
    let difficulty = 0;
    if (isSolveableResult) {
        const entranceLoopId = getLoopIdForTileOnSolvePath(maze.entranceTile, solve, mazeTileIsBlocking)!;
        let currentLoopId = entranceLoopId;
        while (!solve[currentLoopId].isGoalTileOnLoop) {
            difficulty++;
            currentLoopId = solve[currentLoopId].connectingGoalLoopId!;
        }
    }
    return { maze, difficulty };
}

function isSolveable(backwardsSolve: MazeSolveLoop[], maze: Maze, mazeTileIsBlocking: number[][]): boolean {
    //isSolveable
    const isReachable = getLoopIdForTileOnSolvePath(maze.entranceTile, backwardsSolve, mazeTileIsBlocking);
    return isReachable !== undefined;
}

function getLoopIdForTileOnSolvePath(checkTile: Position, solve: MazeSolveLoop[], mazeTileIsBlocking: number[][]): number | undefined {
    const checkTileLoopId = getLoopIdForTileInSolve(checkTile, solve);
    if (checkTileLoopId !== undefined) return checkTileLoopId;

    const tileRight = nextTileBeforeBlockingTile(mazeTileIsBlocking, checkTile, { x: 1, y: 0 });
    const tileRightLoopId = getLoopIdForTileInSolve(tileRight, solve);
    if (tileRightLoopId !== undefined) return tileRightLoopId;

    const tileLeft = nextTileBeforeBlockingTile(mazeTileIsBlocking, checkTile, { x: -1, y: 0 });
    const tileLeftLoopId = getLoopIdForTileInSolve(tileLeft, solve);
    if (tileLeftLoopId) return tileLeftLoopId;

    const tileTop = nextTileBeforeBlockingTile(mazeTileIsBlocking, checkTile, { x: 0, y: -1 });
    const tileTopLoopId = getLoopIdForTileInSolve(tileTop, solve);
    if (tileTopLoopId) return tileTopLoopId;

    const tileBottom = nextTileBeforeBlockingTile(mazeTileIsBlocking, checkTile, { x: 0, y: 1 });
    const tileBottomLoopId = getLoopIdForTileInSolve(tileBottom, solve);
    if (tileBottomLoopId) return tileBottomLoopId;
    return undefined;
}

function getLoopIdForTileInSolve(checkTile: Position, solve: MazeSolveLoop[]): number | undefined {
    for (let loop of solve) {
        for (let tile of loop.tiles) {
            if (tile.x === checkTile.x && tile.y === checkTile.y) {
                return loop.id;
            }
        }
    }
    return undefined;
}


function solveMazeBackwards(maze: Maze, mazeTileIsBlocking: number[][]): MazeSolveLoop[] {
    const loops: MazeSolveLoop[] = [];
    let idCounter = 0;
    const initialTiles = getInitialLoopTilesForBeginningTile(maze, maze.goalTile, mazeTileIsBlocking);
    const checkLoopsBackwards: MazeSolveLoop[] = [];
    for (let tile of initialTiles) {
        const initLoopSolve = checkLoop(maze, tile, mazeTileIsBlocking, idCounter++);
        initLoopSolve.isGoalTileOnLoop = true;
        loops.push(initLoopSolve);
        checkLoopsBackwards.push(initLoopSolve);
    }
    while (checkLoopsBackwards.length > 0) {
        const currentChoiceCheckLoop = checkLoopsBackwards.shift()!;
        for (let i = 0; i < currentChoiceCheckLoop.tiles.length - 1; i++) {
            const currentTile = currentChoiceCheckLoop.tiles[i];
            const moveDirectionSign: Position = {
                x: Math.sign(currentChoiceCheckLoop.tiles[i + 1].x - currentTile.x),
                y: Math.sign(currentChoiceCheckLoop.tiles[i + 1].y - currentTile.y)
            };
            if (Math.abs(moveDirectionSign.x + moveDirectionSign.y) !== 1) {
                console.log("should not happen");
                continue;
            }
            const distance = Math.abs(currentChoiceCheckLoop.tiles[i + 1].x - currentTile.x + currentChoiceCheckLoop.tiles[i + 1].y - currentTile.y);
            for (let j = 1; j < distance; j++) {
                const nextLoopPathTilePos = {
                    x: currentTile.x + j * moveDirectionSign.x,
                    y: currentTile.y + j * moveDirectionSign.y,
                }
                if (mazeTileIsBlocking[nextLoopPathTilePos.x][nextLoopPathTilePos.y] !== MAZE_BLOCKING) {
                    const adjacentLoopPathTile1 = mazeTileIsBlocking[nextLoopPathTilePos.x + moveDirectionSign.y][nextLoopPathTilePos.y + moveDirectionSign.x];
                    const adjacentLoopPathTile2 = mazeTileIsBlocking[nextLoopPathTilePos.x - moveDirectionSign.y][nextLoopPathTilePos.y - moveDirectionSign.x];
                    if ((adjacentLoopPathTile1 === MAZE_BLOCKING && adjacentLoopPathTile2 !== MAZE_BLOCKING)
                        || (adjacentLoopPathTile2 === MAZE_BLOCKING && adjacentLoopPathTile1 !== MAZE_BLOCKING)
                    ) {
                        let exists = false;
                        for (let loop of loops) {
                            for (let choiceTile of loop.choiceTiles) {
                                if (choiceTile.tile.x === nextLoopPathTilePos.x && choiceTile.tile.y === nextLoopPathTilePos.y) {
                                    exists = true;
                                    choiceTile.connectingLoop = currentChoiceCheckLoop;
                                    break;
                                }
                            }
                            if (exists) break;
                        }
                        if (!exists) {
                            const loopSolve = checkLoop(maze, nextLoopPathTilePos, mazeTileIsBlocking, idCounter++);
                            loops.push(loopSolve);
                            loopSolve.connectingGoalLoopId = currentChoiceCheckLoop.id;
                            checkLoopsBackwards.push(loopSolve);
                            const choiceTile = loopSolve.choiceTiles.find(ct => ct.tile.x === nextLoopPathTilePos.x && ct.tile.y === nextLoopPathTilePos.y);
                            choiceTile!.connectingLoop = currentChoiceCheckLoop;

                        }
                    }
                } else {
                    console.log("should not happen");
                }
            }
        }
    }

    return loops;
}

function getInitialLoopTilesForBeginningTile(maze: Maze, beginningTile: Position, mazeTileIsBlocking: number[][]): Position[] {
    const initialLoopCornerTiles: Position[] = [];
    const tileLeft = nextTileBeforeBlockingTile(mazeTileIsBlocking, beginningTile, { x: -1, y: 0 });
    initialLoopCornerTiles.push(tileLeft);
    const tileTop = nextTileBeforeBlockingTile(mazeTileIsBlocking, beginningTile, { x: 0, y: -1 });
    initialLoopCornerTiles.push(tileTop);

    return initialLoopCornerTiles;
}

function checkLoop(maze: Maze, initialLoopTile: Position, mazeTileIsBlocking: number[][], id: number): MazeSolveLoop {
    const solve: MazeSolveLoop = {
        id: id,
        tiles: [],
        choiceTiles: [],
    }

    const openTiles: { pos: Position, doUnshift?: boolean }[] = [{ pos: initialLoopTile }];
    while (openTiles.length > 0) {
        const currentTile = openTiles.shift()!;
        const exists = solve.tiles.findIndex(t => t.x === currentTile.pos.x && t.y === currentTile.pos.y);
        if (exists > -1) continue;
        if (!currentTile.doUnshift) solve.tiles.push(currentTile.pos); else solve.tiles.unshift(currentTile.pos);
        if (mazeTileIsBlocking[currentTile.pos.x][currentTile.pos.y] === 1) throw "should not happen";
        if (mazeTileIsBlocking[currentTile.pos.x - 1][currentTile.pos.y] === MAZE_BLOCKING && mazeTileIsBlocking[currentTile.pos.x + 1][currentTile.pos.y] !== MAZE_BLOCKING) {
            const tile = nextTileBeforeBlockingTile(mazeTileIsBlocking, currentTile.pos, { x: 1, y: 0 });
            const exists = solve.tiles.findIndex(t => t.x === tile.x && t.y === tile.y);
            if (exists === -1) {
                if (!currentTile.doUnshift) {
                    openTiles.push({ pos: tile, doUnshift: currentTile.doUnshift });
                    currentTile.doUnshift = true;
                } else {
                    openTiles.unshift({ pos: tile, doUnshift: currentTile.doUnshift });
                }
            }
        }
        if (mazeTileIsBlocking[currentTile.pos.x + 1][currentTile.pos.y] === MAZE_BLOCKING && mazeTileIsBlocking[currentTile.pos.x - 1][currentTile.pos.y] !== MAZE_BLOCKING) {
            const tile = nextTileBeforeBlockingTile(mazeTileIsBlocking, currentTile.pos, { x: -1, y: 0 });
            const exists = solve.tiles.findIndex(t => t.x === tile.x && t.y === tile.y);
            if (exists === -1) {
                if (!currentTile.doUnshift) {
                    openTiles.push({ pos: tile, doUnshift: currentTile.doUnshift });
                    currentTile.doUnshift = true;
                } else {
                    openTiles.unshift({ pos: tile, doUnshift: currentTile.doUnshift });
                }
            }
        }
        if (mazeTileIsBlocking[currentTile.pos.x][currentTile.pos.y - 1] === MAZE_BLOCKING && mazeTileIsBlocking[currentTile.pos.x][currentTile.pos.y + 1] !== MAZE_BLOCKING) {
            const tile = nextTileBeforeBlockingTile(mazeTileIsBlocking, currentTile.pos, { x: 0, y: 1 });
            const exists = solve.tiles.findIndex(t => t.x === tile.x && t.y === tile.y);
            if (exists === -1) {
                if (!currentTile.doUnshift) {
                    openTiles.push({ pos: tile, doUnshift: currentTile.doUnshift });
                    currentTile.doUnshift = true;
                } else {
                    openTiles.unshift({ pos: tile, doUnshift: currentTile.doUnshift });
                }
            }
        }
        if (mazeTileIsBlocking[currentTile.pos.x][currentTile.pos.y + 1] === MAZE_BLOCKING && mazeTileIsBlocking[currentTile.pos.x][currentTile.pos.y - 1] !== MAZE_BLOCKING) {
            const tile = nextTileBeforeBlockingTile(mazeTileIsBlocking, currentTile.pos, { x: 0, y: -1 });
            const exists = solve.tiles.findIndex(t => t.x === tile.x && t.y === tile.y);
            if (exists === -1) {
                if (!currentTile.doUnshift) {
                    openTiles.push({ pos: tile, doUnshift: currentTile.doUnshift });
                    currentTile.doUnshift = true;
                } else {
                    openTiles.unshift({ pos: tile, doUnshift: currentTile.doUnshift });
                }
            }
        }
        if ((mazeTileIsBlocking[currentTile.pos.x - 1][currentTile.pos.y] !== MAZE_BLOCKING && mazeTileIsBlocking[currentTile.pos.x + 1][currentTile.pos.y] !== MAZE_BLOCKING)
            || (mazeTileIsBlocking[currentTile.pos.x][currentTile.pos.y - 1] !== MAZE_BLOCKING && mazeTileIsBlocking[currentTile.pos.x][currentTile.pos.y + 1] !== MAZE_BLOCKING)) {
            solve.choiceTiles.push({ tile: currentTile.pos });
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
    const areaBoss = createAreaBossIceSnowman(game.state.idCounter, spawn, modifier.id, game);
    game.state.bossStuff.bosses.push(areaBoss);
}
