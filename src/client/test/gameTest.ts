import { createCharacter } from "../character/characterModel.js";
import { CommandRestart, handleCommand } from "../commands.js";
import { closeGame, getGameVersionString } from "../game.js";
import { FACTION_ENEMY, FACTION_PLAYER, Game, Replay, ReplayAssert, ReplayData } from "../gameModel.js";
import { GAME_VERSION, createGame } from "../main.js";
import { addEnemyToMap, chunkXYToMapKey, createMap, GameMap } from "../map/map.js";
import { createNewChunkTiles } from "../map/mapGeneration.js";
import { websocketConnect } from "../multiplayerConenction.js";
import { PlayerInput } from "../input/playerInput.js";
import { createProjectile, Projectile } from "../ability/projectile.js";
import { nextRandom, RandomSeed } from "../randomNumberGenerator.js";
import { detectAbilityObjectCircleToCharacterHit } from "../ability/ability.js";

type PastReplayData = {
    maxKeep: number,
    results: {
        [fileName: string]: ReplayResult[],
    }
}
export type ReplayResult = {
    fileName: string,
    time: number,
    runOnVersionNumber: string,
    replayVersionNumber: string,
    success: boolean,
    replayAssertData: ReplayAssertResult[] | undefined,
    screenSize: string,
}
export type ReplayAssertResult = {
    type: string,
    expected: any,
    actual: any,
}

const LOCALSTORAGE_PAST_TEST_REPLAY_DATA = "testReplayData";
export function saveReplayDataToLocalStorage(replayResult: ReplayResult) {
    if (replayResult.fileName === "Unknown") {
        console.log(replayResult);
        return;
    }
    const localStoragePastReplayData = localStorage.getItem(LOCALSTORAGE_PAST_TEST_REPLAY_DATA);
    let pastReplayData: PastReplayData = { maxKeep: 10, results: {} };
    if (localStoragePastReplayData) {
        pastReplayData = JSON.parse(localStoragePastReplayData) as PastReplayData;
    }
    if (!pastReplayData.results[replayResult.fileName]) pastReplayData.results[replayResult.fileName] = [];
    const fileResults = pastReplayData.results[replayResult.fileName];
    fileResults.push(replayResult);
    let timeChangeToLastRun = 0;
    if (fileResults.length > 1) {
        const newTime = replayResult.time;
        const lastTime = fileResults[fileResults.length - 2].time;
        const lastVersion = fileResults[fileResults.length - 2].replayVersionNumber;
        const isSameReplayVersion = lastVersion === replayResult.replayVersionNumber;
        if (isSameReplayVersion) timeChangeToLastRun = (newTime - lastTime) / lastTime;
        while (fileResults.length > pastReplayData.maxKeep) {
            fileResults.shift();
        }
    }
    localStorage.setItem(LOCALSTORAGE_PAST_TEST_REPLAY_DATA, JSON.stringify(pastReplayData));
    console.log(
        `Filename: ${replayResult.fileName}`,
        replayResult.success ? `` : `success: ${replayResult.success}`,
        timeChangeToLastRun ? `${(timeChangeToLastRun * 100).toFixed(2)}%` : `New Replay`,
        fileResults
    );
}

export function testGame(game: Game) {
    console.log("start test");
    //testPathing(game.ctx);
    //runGameWithPlayerInputs(game, testMultiplayerInputs);
    testPlayerClasses(game);
    //testOne(game);
}

export function initReplay(): Replay {
    return {
        startTime: performance.now(),
        frameSkipAmount: 60,
        zeroTimeout: true,
    }
}

function testOne(game: Game) {
    if (game.state.players.length > 1) return;
    game.testing.replay = initReplay();

    const replay = game.testing.replay;
    replay.testInputFileQueue = [];
    replay.testInputFileQueue.push("/data/testReplayLongTamer.json");
    replayNextInReplayQueue(game);
}

function testPlayerClasses(game: Game) {
    if (game.state.players.length > 1) return;
    game.testing.replay = initReplay();

    const replay = game.testing.replay;
    replay.testInputFileQueue = [];
    replay.testInputFileQueue.push("/data/testReplayShortRetry.json");
    replay.testInputFileQueue.push("/data/testReplayShortSniper.json");
    replay.testInputFileQueue.push("/data/testReplayShortBuilder.json");
    replay.testInputFileQueue.push("/data/testReplayShortTamer.json");
    replay.testInputFileQueue.push("/data/testReplayShortBall.json");
    replay.testInputFileQueue.push("/data/testReplayShortMusician.json");
    replay.testInputFileQueue.push("/data/testReplayShortKing.json");

    replay.testInputFileQueue.push("/data/testReplayLongSniper.json");
    replay.testInputFileQueue.push("/data/testReplayLongBuilder.json");
    // replay.testInputFileQueue.push("/data/testReplayLongTamer.json");
    replay.testInputFileQueue.push("/data/testReplayLongBall.json");
    // replay.testInputFileQueue.push("/data/testReplayLongMusician.json");
    // replay.testInputFileQueue.push("/data/testReplayHardModeGodKill.json");

    // replay.testInputFileQueue.push("/data/testInputError.json");
    // replay.testInputFileQueue.push("/data/testReplayMultiplayer.json");
    // replay.testInputFileQueue.push("/data/testReplayMultiplayerLong.json");
    //replay.testInputFileQueue.push("/data/testReplayLongAll.json");

    replayNextInReplayQueue(game);

}

export function replayNextInReplayQueue(game: Game): boolean {
    const replay = game.testing.replay;
    if (!replay || !replay.testInputFileQueue || replay.testInputFileQueue.length === 0) return false;
    let request = new XMLHttpRequest();
    const nextInputFile = replay.testInputFileQueue.shift()!;
    request.open("GET", nextInputFile, false);
    request.send(null)
    const testData = JSON.parse(request.responseText) as ReplayData;
    replay.currentReplayName = nextInputFile;
    return replayReplayData(game, testData);
}

export function replayReplayData(game: Game, replayData: ReplayData): boolean {
    const replay = game.testing.replay;
    if (!replay) return false;
    replay.replayInputCounter = 0;
    replay.data = replayData;
    replay.startTime = performance.now();

    game.state.ended = true;
    if (replay.data!.replayPlayerInputs[0].command === "restart") {
        let startCommand: CommandRestart = replay.data!.replayPlayerInputs.shift() as any;
        startCommand.replay = true;
        handleCommand(game, startCommand);
    } else {
        handleCommand(game, { command: "restart", clientId: game.multiplayer.myClientId, testing: true });
    }
    return true;
}

export function replayGameEndAssert(game: Game, newScore: number) {
    const replay = game.testing.replay;
    if (!replay?.data) return;
    const time = performance.now() - replay.startTime;
    let success = true;
    const replayAssertResultData: ReplayAssertResult[] = [];
    if (replay.data.gameEndAsserts) {
        for (let assert of replay.data?.gameEndAsserts) {
            switch (assert.type) {
                case "score":
                    success = (assert.data === newScore) && success;
                    replayAssertResultData.push({
                        type: assert.type,
                        expected: assert.data,
                        actual: newScore,
                    });
                    break;
                case "killCounter":
                    success = (assert.data === game.state.killCounter) && success;
                    replayAssertResultData.push({
                        type: assert.type,
                        expected: assert.data,
                        actual: game.state.killCounter,
                    });
                    break;
            }
        }
    }
    let screenSize = "";
    if (game.ctx) screenSize = `${game.ctx.canvas.width}x${game.ctx.canvas.height}`;
    const replayResult: ReplayResult = {
        fileName: replay.currentReplayName ?? "Unknown",
        success,
        time,
        runOnVersionNumber: getGameVersionString(GAME_VERSION),
        replayVersionNumber: getGameVersionString(replay.data.permanentData.gameVersion),
        replayAssertData: replayAssertResultData,
        screenSize: screenSize,
    }
    saveReplayDataToLocalStorage(replayResult);
}

function getUntilPromise(fn: Function, time = 1000) {
    return new Promise((resolve) => {
        const timer = setInterval(() => {
            if (fn()) {
                clearInterval(timer);
                resolve(true);
            }
        }, time);
    });
}

async function runGameWithPlayerInputsMultiplayer(game: Game, playerInputs: PlayerInput[], playerIds: number[]) {
    const playerCount = playerIds.length;
    const games: Game[] = [game];
    if (!game.multiplayer.websocket) {
        websocketConnect(game, "1");
        game.testing.replay = {
            startTime: performance.now(),
        };
    }
    for (let i = 1; i < playerCount; i++) {
        games.push(createGame(undefined, true));
        websocketConnect(games[i], i.toString());
        games[i].testing.replay = {
            startTime: performance.now(),
            doNotPaint: true,
        };
    }

    const waitForMultiplayerConnections = getUntilPromise(() => {
        for (const tGame of games) {
            if (!tGame.multiplayer.websocket) return false;
        }
        return true;
    }, 50);
    await waitForMultiplayerConnections;

    game.state.ended = true;
    handleCommand(game, { command: "restart", clientId: game.multiplayer.myClientId, testing: true });
    const waitForRestart = getUntilPromise(() => {
        for (const tGame of games) {
            if (tGame.state.ended) return false;
        }
        return true;
    }, 50);
    await waitForRestart;

    for (const input of playerInputs) {
        const playerIndex = playerIds.findIndex((value) => input.clientId === value);
        input.clientId = games[playerIndex].multiplayer.myClientId;
        if (input.executeTime > games[playerIndex].state.time + 2000) {
            await getUntilPromise(() => input.executeTime < games[playerIndex].state.time + 2000, 50);
        }
        handleCommand(games[playerIndex], input);
    }

    for (let i = 1; i < playerCount; i++) {
        closeGame(games[i]);
    }
}

//---------------------//

function createTestCharacter(id: number, x: number, y: number) {
    return createCharacter(id, x, y, 5, 5, "black", 0.5, 1000, FACTION_ENEMY, "randomSpawnFollowingEnemy", 1);
}

function createTestProjectiles(x: number, y: number, pierceCount: number = 10, timeToLive: number = 1000) {
    return createProjectile(x, y, 0, 2, FACTION_PLAYER, 2, 0, pierceCount, timeToLive, "Projectile");
}


// time 4520 4520, firefox, only 1 iteration
// time 2.566000000005588 256.6000000005588, firefox, 100 iterations, 
function testDetectProjectileToCharacterHitPerformance() {
    const iterations = 100;
    const numberEnemies = 1000000;
    const numberProjectiles = 100;
    const projectiles: Projectile[] = [];
    const map: GameMap = createMap();
    const game: Game = createGame(undefined);
    const randomSeed: RandomSeed = { seed: 0 };
    for (let i = 0; i < numberEnemies; i++) {
        const posX = nextRandom(randomSeed) * 10000;
        const posY = nextRandom(randomSeed) * 10000;
        createNewChunk(map, Math.floor(posX / (map.tileSize * map.chunkLength)), Math.floor(posY / (map.tileSize * map.chunkLength)), game);
        addEnemyToMap(map, createTestCharacter(i, posX, posY));
    }
    for (let i = 0; i < numberProjectiles; i++) {
        projectiles.push(createTestProjectiles(nextRandom(randomSeed) * 200, nextRandom(randomSeed) * 200));
    }

    const startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
        for (let j = 0; j < projectiles.length; j++) {
            detectAbilityObjectCircleToCharacterHit(map, projectiles[j], game);
        }
    }
    const time = performance.now() - startTime;
    console.log("time", time / iterations, time);
}

function createNewChunk(map: GameMap, chunkX: number, chunkY: number, game: Game) {
    const key = chunkXYToMapKey(chunkX, chunkY);
    if (map.chunks[key] !== undefined) return;
    const newChunk = createNewChunkTiles(map, chunkX, chunkY, map.seed!, game);
    map.chunks[key] = newChunk;
}