import { countAlivePlayerCharacters, detectCharacterDeath, determineCharactersInDistance, findCharacterById, getPlayerCharacters, tickCharacters, tickMapCharacters } from "./character/character.js";
import { paintAll } from "./gamePaint.js";
import { gameInitPlayers, Player } from "./player.js";
import { tickPlayerInputs } from "./playerInput.js";
import { Projectile, tickProjectiles } from "./projectile.js";
import { Position, GameState, Game, IdCounter, TestingStuff, Debugging } from "./gameModel.js";
import { createMap, determineMapKeysInDistance, GameMap, removeAllMapCharacters } from "./map/map.js";
import { Character } from "./character/characterModel.js";
import { createNewChunk } from "./map/mapGeneration.js";
import { createFixPositionRespawnEnemiesOnInit } from "./character/enemy/fixPositionRespawnEnemyModel.js";
import { handleCommand } from "./commands.js";

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

export function addHTMLDebugCheckboxesToSettings(game: Game) {
    let settingsElement = document.getElementById('settings');
    if (!settingsElement) return;
    addSettingCheckbox("takeTimeMeasures", game);
    addSettingCheckbox("paintTileIJNumbers", game);
    addSettingCheckbox("paintMarkActiveChunks", game);
}

export function gameInit(game: Game) {
    game.state.projectiles = [];
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

export function generateMissingChunks(map: GameMap, positions: Position[], idCounter: IdCounter) {
    let chunkSize = map.tileSize * map.chunkLength;
    let generationRadius = 1500;

    for (const position of positions) {
        let startX = (position.x - generationRadius);
        let startY = (position.y - generationRadius);
        let startChunkI = Math.floor(startY / chunkSize);
        let startChunkJ = Math.floor(startX / chunkSize);

        for (let i = 0; i < Math.ceil(generationRadius / chunkSize * 2); i++) {
            let chunkI = startChunkI + i;
            for (let j = 0; j < Math.ceil(generationRadius / chunkSize * 2); j++) {
                let chunkJ = startChunkJ + j;
                let chunk = map.chunks[`${chunkI}_${chunkJ}`];
                if (chunk === undefined) {
                    chunk = createNewChunk(map, chunkI, chunkJ, idCounter);
                    map.chunks[`${chunkI}_${chunkJ}`] = chunk;
                }
            }
        }
    }
}

function addSettingCheckbox(checkboxName: string, game: Game) {
    let settingsElement = document.getElementById('settings');
    if (!settingsElement) return;
    let debug: any = game.debug;
    let checkbox: HTMLInputElement = document.getElementById(checkboxName) as HTMLInputElement;
    if (!checkbox) {
        let canvasHTML = `
            <input type="checkbox" id="${checkboxName}" name="${checkboxName}">
            <label for="debug">${checkboxName}</label><br>
        `;
        settingsElement.insertAdjacentHTML("beforeend", canvasHTML);
        checkbox = document.getElementById(checkboxName) as HTMLInputElement;
    }
    if (checkbox) {
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                debug[checkboxName] = true;
                game.performance = {};
            } else {
                debug[checkboxName] = false;                
                game.performance = {};
            }
        });
    }
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
                    console.log("game slow down, can not keep up");
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
        takeTimeMeasure(game.debug, "", "generateMissingChunks");
        generateMissingChunks(game.state.map, getPlayerCharacters(game.state.players), game.state.idCounter);

        takeTimeMeasure(game.debug, "generateMissingChunks", "tickPlayerInputs");
        tickPlayerInputs(game.state.playerInputs, game.state.time, game);

        takeTimeMeasure(game.debug, "tickPlayerInputs", "tickMapCharacters");
        tickMapCharacters(game.state.map, game);

        takeTimeMeasure(game.debug, "tickMapCharacters", "tickCharacters");
        tickCharacters(getPlayerCharacters(game.state.players), game);

        takeTimeMeasure(game.debug, "tickCharacters", "tickProjectiles");
        tickProjectiles(game.state.projectiles, game.state.time);

        takeTimeMeasure(game.debug, "tickProjectiles", "detectProjectileToCharacterHit");
        detectProjectileToCharacterHit(game.state.map, game.state.projectiles, game.state.players);

        takeTimeMeasure(game.debug, "detectProjectileToCharacterHit", "detectCharacterDeath");
        detectCharacterDeath(game.state.map, game.state, game.camera);
        takeTimeMeasure(game.debug, "detectCharacterDeath", "");

        if (gameEndedCheck(game)) endGame(game.state, game.testing);
        if (game.state.restartAfterTick) gameRestart(game);

        takeTimeMeasure(game.debug, "", "determineActiveChunks");
        determineActiveChunks(getPlayerCharacters(game.state.players), game.state.map);
        takeTimeMeasure(game.debug, "determineActiveChunks", "");
    }
}

function addTestReplayInputs(game: Game) {
    if (game.testing && game.testing.replayPlayerInputs) {
        if (game.testing.replayInputCounter === undefined) game.testing.replayInputCounter = 0;
        while (game.testing.replayPlayerInputs[game.testing.replayInputCounter]
            && game.testing.replayPlayerInputs[game.testing.replayInputCounter].executeTime < game.state.time + 1000
        ) {
            let data = game.testing.replayPlayerInputs[game.testing.replayInputCounter];
            if (game.state.players.length === 1) {
                data.clientId = game.multiplayer.myClientId;
            }
            handleCommand(game, data);
            game.testing.replayInputCounter++;
        }
    }
}

function determineActiveChunks(characters: Character[], map: GameMap) {
    let keySet: Set<string> = new Set();
    for (let i = 0; i < characters.length; i++) {
        if (characters[i].isDead) continue;
        let nearMapKeys = determineMapKeysInDistance(characters[i], map, map.activeChunkRange, false);
        for (const mapKey of nearMapKeys) {
            keySet.add(mapKey);
        }
    }
    map.activeChunkKeys = [...keySet];
}

export function detectProjectileToCharacterHit(map: GameMap, projectiles: Projectile[], players: Player[]) {
    for (let projIt = 0; projIt < projectiles.length; projIt++) {
        let projectile = projectiles[projIt];
        let maxEnemySizeEstimate = 40;
        let maxProjectileSizeEstimate = 20;

        let characters = determineCharactersInDistance(projectile, map, players, projectile.size + maxEnemySizeEstimate + maxProjectileSizeEstimate);
        for (let charIt = characters.length - 1; charIt >= 0; charIt--) {
            let c = characters[charIt];
            if (c.isDead || c.faction === projectile.faction) continue;
            let distance = calculateDistance(c, projectile);
            if (distance < projectile.size / 2 + c.width / 2) {
                c.hp -= projectile.damage;
                c.wasHitRecently = true;
                projectile.pierceCount--;
                if (projectile.pierceCount < 0) break;
            }
        }
    }
}

function setTestSeeds(game: Game) {
    game.state.randomSeed.seed = 0;
    game.state.map = createMap();
    game.state.map.seed = 0;
    if (game.testing) game.testing.collectedTestInputs = [];
}
