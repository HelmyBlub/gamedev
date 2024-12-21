import { calculateDistance, getNextId } from "../../game.js";
import { Game, IdCounter, Position } from "../../gameModel.js";
import { MODIFY_SHAPE_NAME_CIRCLE } from "./mapShapeCircle.js";
import { GAME_MAP_MODIFIER_FUNCTIONS, GameMapModifier } from "./mapModifier.js";
import { GameMapArea, getShapeMiddle, setShapeAreaToAmount } from "./mapModifierShapes.js";
import { GameMapAreaRect, MODIFY_SHAPE_NAME_RECTANGLE } from "./mapShapeRectangle.js";
import { MODIFY_SHAPE_NAME_CELESTIAL_DIRECTION } from "./mapShapeCelestialDirection.js";
import { MapChunk, positionToGameMapTileXY, TILE_ID_GRASS, TILE_ID_ICE, TILE_ID_TREE } from "../map.js";
import { perlin_get } from "../mapGeneration.js";

export const MODIFIER_NAME_ICE = "Ice";
type Maze = {
    radiusTiles: number,
    goalTile: Position,
    entranceTile: Position,
}

type MazeSolveLoop = {
    tiles: Position[],
    choiceTiles: {
        tile: Position,
        connectingLoop?: MazeSolveLoop,
    }[],
}
export type MapModifierIce = GameMapModifier & {
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
    if (distance >= iceMod.maze.radiusTiles * tileSize - tileSize * 3) {
        mapChunk.tiles[x][y] = TILE_ID_TREE;
        return;
    }
    const chunkLength = game.state.map.chunkLength;
    if (iceMod.maze.goalTile.x === x + chunkX * chunkLength && iceMod.maze.goalTile.y === y + chunkY * chunkLength) {
        mapChunk.tiles[x][y] = TILE_ID_GRASS;
        return;
    }

    mapChunk.tiles[x][y] = TILE_ID_ICE;
}

function testSolveMaze() {
    const mazeTileIsBlocking: number[][] = [];
    const middle: Position = { x: 10, y: 10 };
    const maze: Maze = {
        entranceTile: { x: 13, y: 3 },
        goalTile: { x: 0, y: 0 },
        radiusTiles: 10,
    }
    //generate empty maze
    for (let x = -maze.radiusTiles + middle.x; x < maze.radiusTiles + middle.x; x++) {
        mazeTileIsBlocking[x] = [];
        for (let y = -maze.radiusTiles + middle.y; y < maze.radiusTiles + middle.y; y++) {
            const distance = calculateDistance(middle, { x, y });
            if (distance > maze.radiusTiles - 1.5) {
                mazeTileIsBlocking[x][y] = 1;
                continue;
            }
            if (distance >= maze.radiusTiles - 3) {
                mazeTileIsBlocking[x][y] = 1;
                continue;
            }
            mazeTileIsBlocking[x][y] = 0;
        }
    }
    mazeTileIsBlocking[maze.entranceTile.x][maze.entranceTile.y] = 2;
    console.log(mazeTileIsBlocking);
    //solve it. get data to determine if it is a solveable maze and escapeable
    const loops: MazeSolveLoop[] = [];
    const initLoopSolve = checkLoop(maze, maze.entranceTile, mazeTileIsBlocking);
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
                const newLoop = checkLoop(maze, beforeBlockingTile, mazeTileIsBlocking);
                tileData.connectingLoop = newLoop;
                loops.push(newLoop);
                checkChoicesInLoop.push(newLoop);
            }
        }
    }

    console.log(loops);

    //if not solveable and escapeable place "random tiles"* until possible
    //    *not to random as it could make the maze impossible
}

function checkLoop(maze: Maze, initialLoopTile: Position, mazeTileIsBlocking: number[][]): MazeSolveLoop {
    const solve: MazeSolveLoop = {
        tiles: [],
        choiceTiles: [],
    }

    const openTiles: Position[] = [initialLoopTile];
    while (openTiles.length > 0) {
        const currentTile = openTiles.shift()!;
        solve.tiles.push(currentTile);
        if (mazeTileIsBlocking[currentTile.x][currentTile.y] === 1) throw "should not happen";
        if (mazeTileIsBlocking[currentTile.x - 1][currentTile.y] === 1 && mazeTileIsBlocking[currentTile.x + 1][currentTile.y] !== 1) {
            const tile = nextTileBeforeBlockingTile(mazeTileIsBlocking, currentTile, { x: 1, y: 0 });
            const exists = solve.tiles.findIndex(t => t.x === tile.x && t.y === tile.y);
            if (exists === -1) openTiles.push(tile);
        }
        if (mazeTileIsBlocking[currentTile.x + 1][currentTile.y] === 1 && mazeTileIsBlocking[currentTile.x - 1][currentTile.y] !== 1) {
            const tile = nextTileBeforeBlockingTile(mazeTileIsBlocking, currentTile, { x: -1, y: 0 });
            const exists = solve.tiles.findIndex(t => t.x === tile.x && t.y === tile.y);
            if (exists === -1) openTiles.push(tile);
        }
        if (mazeTileIsBlocking[currentTile.x][currentTile.y - 1] === 1 && mazeTileIsBlocking[currentTile.x][currentTile.y + 1] !== 1) {
            const tile = nextTileBeforeBlockingTile(mazeTileIsBlocking, currentTile, { x: 0, y: 1 });
            const exists = solve.tiles.findIndex(t => t.x === tile.x && t.y === tile.y);
            if (exists === -1) openTiles.push(tile);
        }
        if (mazeTileIsBlocking[currentTile.x][currentTile.y + 1] === 1 && mazeTileIsBlocking[currentTile.x][currentTile.y - 1] !== 1) {
            const tile = nextTileBeforeBlockingTile(mazeTileIsBlocking, currentTile, { x: 0, y: -1 });
            const exists = solve.tiles.findIndex(t => t.x === tile.x && t.y === tile.y);
            if (exists === -1) openTiles.push(tile);
        }
        if ((mazeTileIsBlocking[currentTile.x - 1][currentTile.y] !== 1 && mazeTileIsBlocking[currentTile.x + 1][currentTile.y] !== 1)
            || (mazeTileIsBlocking[currentTile.x][currentTile.y - 1] !== 1 && mazeTileIsBlocking[currentTile.x][currentTile.y + 1] !== 1)) {
            solve.choiceTiles.push({ tile: currentTile });
        }
    }

    return solve;
}

function nextTileBeforeBlockingTile(mazeTileIsBlocking: number[][], initialTile: Position, direction: Position): Position {
    let counter = 0;
    while (true) {
        counter++;
        if (mazeTileIsBlocking[initialTile.x + direction.x * counter][initialTile.y + direction.y * counter] === 1) {
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
    const goalTile = positionToGameMapTileXY(game.state.map, middle);
    iceMod.maze = {
        radiusTiles: 13,
        goalTile: goalTile,
        entranceTile: { x: 0, y: 0 },
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
    testSolveMaze();
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
