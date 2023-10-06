import { createCharacter } from "../character/characterModel.js";
import { CommandRestart, handleCommand } from "../commands.js";
import { changeCharacterAndAbilityIds, closeGame } from "../game.js";
import { CelestialDirection, FACTION_ENEMY, FACTION_PLAYER, Game, NextEndbosses, Position, setDefaultNextEndbosses } from "../gameModel.js";
import { createGame } from "../main.js";
import { addEnemyToMap, createMap, GameMap } from "../map/map.js";
import { createNewChunkTiles } from "../map/mapGeneration.js";
import { websocketConnect } from "../multiplayerConenction.js";
import { PlayerInput } from "../playerInput.js";
import { createProjectile, Projectile } from "../ability/projectile.js";
import { nextRandom, RandomSeed } from "../randomNumberGenerator.js";
import { detectAbilityObjectCircleToCharacterHit } from "../ability/ability.js";

let testInputs: (PlayerInput | Omit<CommandRestart, "executeTime">)[] = [];

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
    // replay.testInputFileQueue.push("/data/testInputShortBuilder.json");
    replay.testInputFileQueue.push("/data/testInputShortSniper.json");
    replay.testInputFileQueue.push("/data/testInputShortTamer.json");
    // replay.testInputFileQueue.push("/data/testInputLongSniper.json");
    // replay.testInputFileQueue.push("/data/testInputLongBuilder.json");
    // replay.testInputFileQueue.push("/data/testInputLongTamer.json");
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
    testInputs = JSON.parse(request.responseText);
    replay.data = testInputs as any;

    game.state.ended = true;
    if (game.state.map.endBossArea) {
        if (replay.data?.nextEndBosses) {
            game.state.bossStuff.nextEndbosses = replay.data?.nextEndBosses;
            let nextEndbosses: NextEndbosses = game.state.bossStuff.nextEndbosses;
            const keys = Object.keys(nextEndbosses) as CelestialDirection[];
            for (let key of keys) {
                let endboss = nextEndbosses[key];
                if (endboss) changeCharacterAndAbilityIds(endboss, game.state.idCounter);
            }    
        } else {
            setDefaultNextEndbosses(game);
        }
    }
    if (replay.data?.pastCharacters) {
        game.state.pastPlayerCharacters = replay.data.pastCharacters;
        for (let pastChar of game.state.pastPlayerCharacters.characters) {
            if (pastChar) changeCharacterAndAbilityIds(pastChar, game.state.idCounter);
        }
    } else {
        game.state.pastPlayerCharacters.characters = [];
    }
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
    let replay = game.testing.replay;
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
        let playerIndex = playerIds.findIndex((value) => input.clientId === value);
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
    let iterations = 100;
    let numberEnemies = 1000000;
    let numberProjectiles = 100;
    let projectiles: Projectile[] = [];
    let map: GameMap = createMap();
    let game: Game = createGame(undefined);
    let randomSeed: RandomSeed = { seed: 0 };
    for (let i = 0; i < numberEnemies; i++) {
        let posX = nextRandom(randomSeed) * 10000;
        let posY = nextRandom(randomSeed) * 10000;
        createNewChunk(map, Math.floor(posY / (map.tileSize * map.chunkLength)), Math.floor(posX / (map.tileSize * map.chunkLength)));
        addEnemyToMap(map, createTestCharacter(i, posX, posY));
    }
    for (let i = 0; i < numberProjectiles; i++) {
        projectiles.push(createTestProjectiles(nextRandom(randomSeed) * 200, nextRandom(randomSeed) * 200));
    }

    let startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
        for (let j = 0; j < projectiles.length; j++) {
            detectAbilityObjectCircleToCharacterHit(map, projectiles[j], game);
        }
    }
    let time = performance.now() - startTime;
    console.log("time", time / iterations, time);
}

function createNewChunk(map: GameMap, chunkI: number, chunkJ: number) {
    let key = `${chunkI}_${chunkJ}`;
    if (map.chunks[key] !== undefined) return;
    let newChunk = createNewChunkTiles(map, chunkI, chunkJ, map.seed!);
    map.chunks[key] = newChunk;
}