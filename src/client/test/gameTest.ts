import { createCharacter } from "../character/characterModel.js";
import { CommandRestart, handleCommand } from "../commands.js";
import { changeCharacterAndAbilityIds, closeGame } from "../game.js";
import { CelestialDirection, FACTION_ENEMY, FACTION_PLAYER, Game, NextEndbosses, Position, setDefaultNextEndbosses } from "../gameModel.js";
import { createGame } from "../main.js";
import { addEnemyToMap, chunkXYToMapKey, createMap, GameMap } from "../map/map.js";
import { createNewChunkTiles } from "../map/mapGeneration.js";
import { websocketConnect } from "../multiplayerConenction.js";
import { PlayerInput } from "../playerInput.js";
import { createProjectile, Projectile } from "../ability/projectile.js";
import { nextRandom, RandomSeed } from "../randomNumberGenerator.js";
import { detectAbilityObjectCircleToCharacterHit } from "../ability/ability.js";
import { loadNextEnbosses, loadPastCharacters } from "../permanentData.js";

let testData: (PlayerInput | Omit<CommandRestart, "executeTime">)[] = [];

export function testGame(game: Game) {
    console.log("start test");
    //testPathing(game.ctx);
    //runGameWithPlayerInputs(game, testMultiplayerInputs);
    testPlayerClasses(game);
    console.log("end test");
}

function testPlayerClasses(game: Game) {
    if (game.state.players.length > 1) return;
    game.testing.replay = { startTime: performance.now() };

    const replay = game.testing.replay;
    replay.testInputFileQueue = [];
    // replay.testInputFileQueue.push("/data/testInputError.json");
    replay.testInputFileQueue.push("/data/testInputShortBuilder.json");
    replay.testInputFileQueue.push("/data/testInputShortSniper.json");
    replay.testInputFileQueue.push("/data/testInputShortTamer.json");
    replay.testInputFileQueue.push("/data/testInputLongTamer.json");
    replay.testInputFileQueue.push("/data/testInputLongBall.json");
    replay.testInputFileQueue.push("/data/testInputLongSniper.json");
    replay.testInputFileQueue.push("/data/testInputLongBuilder.json");
    replay.frameSkipAmount = 60;
    replay.zeroTimeout = true;

    replayNextInReplayQueue(game);

}

export function replayNextInReplayQueue(game: Game): boolean {
    const replay = game.testing.replay;
    if (!replay || !replay.testInputFileQueue || replay.testInputFileQueue.length === 0) return false;
    replay.replayInputCounter = 0;
    var request = new XMLHttpRequest();
    const nextInputFile = replay.testInputFileQueue.shift()!;
    request.open("GET", nextInputFile, false);
    request.send(null)
    testData = JSON.parse(request.responseText);
    replay.data = testData as any;

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

export function setPastCharactersAndEndBossesForReplayFromReplayData(game: Game) {
    const replay = game.testing.replay;
    if (!replay) return;
    if (game.state.map.endBossArea) {
        if (replay.data?.permanentData.nextEndBosses) {
            loadNextEnbosses(replay.data?.permanentData.nextEndBosses, game);
        } else {
            setDefaultNextEndbosses(game);
        }
    }
    if (replay.data?.permanentData.pastCharacters) {
        loadPastCharacters(replay.data.permanentData.pastCharacters, game);
    } else {
        game.state.pastPlayerCharacters.characters = [];
    }
}

export function replayGameEndAssert(game: Game, newScore: number) {
    const replay = game.testing.replay;
    if (replay?.data?.gameEndAsserts) {
        for (let assert of replay.data?.gameEndAsserts) {
            switch (assert.type) {
                case "score":
                    assertEquals(assert.type, assert.data, newScore);
                    break;
                case "killCounter":
                    assertEquals(assert.type, assert.data, game.state.killCounter);
                    break;
            }
        }
    }
}

function assertEquals(type: string, expected: any, actual: any) {
    if (expected === actual) {
        console.debug(`assert ${type} success`);
    } else {
        console.log(`assert ${type} failed. Expected: ${expected}, actual: ${actual}`);
    }
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
        websocketConnect(game);
        game.testing.replay = {
            startTime: performance.now(),
        };
    }
    for (let i = 1; i < playerCount; i++) {
        games.push(createGame(undefined, true));
        websocketConnect(games[i]);
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