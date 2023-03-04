import { countAlivePlayerCharacters, detectCharacterDeath, findCharacterById, getPlayerCharacters, tickCharacters, tickMapCharacters } from "./character/character.js";
import { paintAll } from "./gamePaint.js";
import { gameInitPlayers, Player } from "./player.js";
import { tickPlayerInputs } from "./playerInput.js";
import { Position, GameState, Game, IdCounter, TestingStuff, Debugging } from "./gameModel.js";
import { createMap, determineMapKeysInDistance, GameMap, removeAllMapCharacters } from "./map/map.js";
import { Character } from "./character/characterModel.js";
import { generateMissingChunks } from "./map/mapGeneration.js";
import { createFixPositionRespawnEnemiesOnInit } from "./character/enemy/fixPositionRespawnEnemyModel.js";
import { handleCommand } from "./commands.js";
import { tickAbilityObjects } from "./ability/ability.js";
import { garbageCollectPathingCache } from "./character/pathing.js";

export function calculateDirection(startPos: Position, targetPos: Position): number {
    let direction = 0;

    let yDiff = (startPos.y - targetPos.y);
    let xDiff = (startPos.x - targetPos.x);

    if (xDiff >= 0) {
        direction = - Math.PI + Math.atan(yDiff / xDiff);
    } else if (yDiff < 0) {
        direction = - Math.atan(xDiff / yDiff) + Math.PI / 2;
    } else {
        direction = - Math.atan(xDiff / yDiff) - Math.PI / 2;
    }
    if (isNaN(direction)) return 0;
    return direction;
}

export function getNextId(idCounter: IdCounter) {
    return idCounter.nextId++;
}

export function gameRestart(game: Game) {
    if (game.testing) {
        setTestSeeds(game);
    }
    gameInit(game);
}

export function closeGame(game: Game) {
    if (game.multiplayer.websocket) {
        game.multiplayer.websocket.close();
    }
    game.closeGame = true;
    console.log("closing game");
}

export function gameInit(game: Game) {
    game.state.abilityObjects = [];
    game.state.players = [];
    game.state.killCounter = 0;
    game.state.ended = false;
    game.state.triggerRestart = false;
    game.state.restartAfterTick = false;
    game.state.time = 0;
    game.state.playerInputs = [];
    game.clientKeyBindings = [];
    game.performance = {};
    removeAllMapCharacters(game.state.map);
    createFixPositionRespawnEnemiesOnInit(game);
    gameInitPlayers(game);
    if (game.multiplayer.websocket !== null) {
        game.multiplayer.maxServerGameTime = 0;
        game.state.playerInputs = game.multiplayer.cachePlayerInputs!;
    }
}

export function getCameraPosition(game: Game): Position {
    let cameraPosition: Position = { x: 0, y: 0 };
    if (game.camera.characterId !== undefined) {
        let character = findCharacterById(getPlayerCharacters(game.state.players), game.camera.characterId);
        if (character !== null) cameraPosition = character;
    }

    return cameraPosition;
}

export function calculateDistance(objectA: { x: number, y: number }, objectB: { x: number, y: number }) {
    let xDiff = objectA.x - objectB.x;
    let yDiff = objectA.y - objectB.y;
    return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
}

export function takeTimeMeasure(debug: Debugging | undefined, endName: string, startName: string) {
    if (debug === undefined || debug.takeTimeMeasures !== true) return;
    if (debug.timeMeasuresData === undefined) debug.timeMeasuresData = [];
    let timeNow = performance.now();
    if (endName !== "") {
        let data = debug.timeMeasuresData?.find((e) => e.name === endName);
        if (data === undefined) throw Error("did not startTimeMeasure for " + endName);
        data.timeMeasures.push(timeNow - data.tempTime);
        if (data.timeMeasures.length > 30) data.timeMeasures.shift();
    }
    if (startName !== "") {
        let data = debug.timeMeasuresData?.find((e) => e.name === startName);
        if (data === undefined) {
            data = { name: startName, timeMeasures: [], tempTime: timeNow };
            debug.timeMeasuresData!.push(data);
        } else {
            data.tempTime = timeNow;
        }
    }
}

export function runner(game: Game) {
    takeTimeMeasure(game.debug, "", "runner");
    takeTimeMeasure(game.debug, "", "tick");
    if (game.multiplayer.websocket === null) {
        if (game.testing && game.testing.frameSkipAmount && game.testing.frameSkipAmount > 0) {
            for (let i = 0; i < game.testing.frameSkipAmount; i++) {
                tick(game.tickInterval, game);
                if (i < game.testing.frameSkipAmount - 1) takeTimeMeasure(game.debug, "tick", "tick");
            }
        } else {
            tick(game.tickInterval, game);
        }
    } else {
        const timeNow = performance.now();
        let counter = 0;
        let maxCounter = 50;
        let realTimePassed = timeNow - game.multiplayer.worstCaseGameStartTime;
        while (!game.state.ended
            && (
                (game.multiplayer.maxServerGameTime >= game.state.time + game.tickInterval
                    && realTimePassed > game.state.time + game.tickInterval)
                || game.state.triggerRestart
            )
            && counter < maxCounter
        ) {
            counter++;
            tick(game.tickInterval, game);
        }
        if (counter >= 50) {
            console.log("game can not keep up");
        }
    }
    takeTimeMeasure(game.debug, "tick", "paint");

    paintAll(game.ctx, game);
    takeTimeMeasure(game.debug, "paint", "");
    if (game.state.ended && game.state.triggerRestart) {
        gameRestart(game);
    }

    if (!game.closeGame) {
        let timeoutSleep = determineRunnerTimeout(game);
        setTimeout(() => runner(game), timeoutSleep);
    }
    takeTimeMeasure(game.debug, "runner", "");
}

export function setRelativeMousePosition(event: MouseEvent, game: Game) {
    let target = event.currentTarget as HTMLElement;
    game.mouseRelativeCanvasPosition = { x: event.x - target.offsetLeft, y: event.y - target.offsetTop };
}

export function calculateDistancePointToLine(point: Position, linestart: Position, lineEnd: Position) {
    var A = point.x - linestart.x;
    var B = point.y - linestart.y;
    var C = lineEnd.x - linestart.x;
    var D = lineEnd.y - linestart.y;

    var dot = A * C + B * D;
    var len_sq = C * C + D * D;
    var param = -1;
    if (len_sq != 0) //in case of 0 length line
        param = dot / len_sq;

    var xx, yy;

    if (param < 0) {
        xx = linestart.x;
        yy = linestart.y;
    }
    else if (param > 1) {
        xx = lineEnd.x;
        yy = lineEnd.y;
    }
    else {
        xx = linestart.x + param * C;
        yy = linestart.y + param * D;
    }

    var dx = point.x - xx;
    var dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

function determineRunnerTimeout(game: Game): number {
    if (game.testing?.zeroTimeout) {
        return 0;
    } else {
        if (game.multiplayer.websocket === null) {
            if (game.shouldTickTime === undefined) {
                game.shouldTickTime = performance.now();
                return game.tickInterval;
            } else {
                let timeoutSleep;
                game.shouldTickTime += game.tickInterval;
                let timeEnd = performance.now();
                timeoutSleep = game.shouldTickTime - timeEnd;
                if (timeoutSleep < 0) {
                    game.shouldTickTime = timeEnd;
                    timeoutSleep = 0;
                    if (game.state.time > 1000) {
                        console.log("game slow down, can not keep up");
                    }
                }
                return timeoutSleep;
            }
        } else {
            return 5;
        }
    }
}

function gameEndedCheck(game: Game) {
    let alivePlayersCount = countAlivePlayerCharacters(game.state.players)
    if (alivePlayersCount === 0) {
        return true;
    }
    return false;
}

function endGame(state: GameState, testing: TestingStuff | undefined) {
    if (testing) {
        if (testing.collectedTestInputs) console.log("testInputs", testing.collectedTestInputs);
        console.log("time:", performance.now() - testing.startTime);
    }
    state.ended = true;
    let newScore: number = 0;
    for (const player of state.players) {
        let distance = Math.round(calculateDistance(player.character, { x: 0, y: 0 }));
        if (distance > newScore) newScore = distance;
    }
    state.highscores.scores.push(newScore);
    state.highscores.scores.sort((a, b) => b - a);
    if (state.highscores.scores.length > state.highscores.maxLength) {
        state.highscores.scores.pop();
    }
}

function tick(gameTimePassed: number, game: Game) {
    if (!game.state.ended) {
        addTestReplayInputs(game);
        game.state.time += gameTimePassed;
        generateMissingChunks(game.state.map, getPlayerCharacters(game.state.players), game.state.idCounter, game);
        tickPlayerInputs(game.state.playerInputs, game.state.time, game);
        tickMapCharacters(game.state.map, game);
        tickCharacters(getPlayerCharacters(game.state.players), game);
        tickAbilityObjects(game.state.abilityObjects, game);
        detectCharacterDeath(game.state.map, game.state, game.camera, game);

        if (gameEndedCheck(game)) endGame(game.state, game.testing);
        if (game.state.restartAfterTick) gameRestart(game);

        garbageCollectPathingCache(game.performance.pathingCache, game.state.time, game);
        determineActiveChunks(getPlayerCharacters(game.state.players), game.state.map, game);
    }
}

function addTestReplayInputs(game: Game) {
    if (game.testing && game.testing.replayPlayerInputs) {
        if (game.testing.replayInputCounter === undefined) game.testing.replayInputCounter = 0;
        while (game.testing.replayPlayerInputs[game.testing.replayInputCounter]
            && game.testing.replayPlayerInputs[game.testing.replayInputCounter].executeTime < game.state.time + 1000
        ) {
            let original = game.testing.replayPlayerInputs[game.testing.replayInputCounter]
            let data = { ...original };
            if (game.state.players.length === 1
                || (data.clientId === -1 && game.state.players[0].clientId === game.multiplayer.myClientId)) {
                data.clientId = game.multiplayer.myClientId;
            }
            handleCommand(game, data);
            game.testing.replayInputCounter++;
        }
    }
}

function determineActiveChunks(characters: Character[], map: GameMap, game: Game) {
    takeTimeMeasure(game.debug, "", "determineActiveChunks");
    let keySet: Set<string> = new Set();
    for (let i = 0; i < characters.length; i++) {
        if (characters[i].isDead) continue;
        let nearMapKeys = determineMapKeysInDistance(characters[i], map, map.activeChunkRange, false);
        for (const mapKey of nearMapKeys) {
            keySet.add(mapKey);
        }
    }
    map.activeChunkKeys = [...keySet];
    takeTimeMeasure(game.debug, "determineActiveChunks", "");
}

function setTestSeeds(game: Game) {
    game.state.randomSeed.seed = 0;
    game.state.map = createMap();
    game.state.map.seed = 0;
    if (game.testing){
        game.testing.collectedTestInputs = []
        if(game.testing.restartPlayerInput) game.testing.collectedTestInputs.push(game.testing.restartPlayerInput);
        if(game.testing.mapSeed !== undefined) game.state.map.seed = game.testing.mapSeed;
        if(game.testing.randomStartSeed !== undefined) game.state.randomSeed.seed = game.testing.randomStartSeed;
    };
}
