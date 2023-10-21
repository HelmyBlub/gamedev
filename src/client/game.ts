import { changeCharacterId, countAlivePlayerCharacters, findAndSetNewCameraCharacterId, findCharacterById, findMyCharacter, getPlayerCharacters, resetCharacter, tickCharacters, tickMapCharacters } from "./character/character.js";
import { paintAll } from "./gamePaint.js";
import { createDefaultKeyBindings1, findPlayerByCharacterId, gameInitPlayers } from "./player.js";
import { MOUSE_ACTION, UPGRADE_ACTIONS, tickPlayerInputs } from "./playerInput.js";
import { Position, GameState, Game, IdCounter, Debugging, PaintTextData, ClientInfo, LOCALSTORAGE_PASTCHARACTERS, LOCALSTORAGE_NEXTENDBOSSES, NextEndbosses, CelestialDirection } from "./gameModel.js";
import { changeTileIdOfMapChunk, createMap, determineMapKeysInDistance, GameMap, removeAllMapCharacters } from "./map/map.js";
import { Character, DEFAULT_CHARACTER } from "./character/characterModel.js";
import { generateMissingChunks, pastCharactersMapTilePositions } from "./map/mapGeneration.js";
import { createFixPositionRespawnEnemiesOnInit } from "./character/enemy/fixPositionRespawnEnemyModel.js";
import { CommandRestart, handleCommand } from "./commands.js";
import { ABILITIES_FUNCTIONS, tickAbilityObjects } from "./ability/ability.js";
import { garbageCollectPathingCache, getPathingCache } from "./character/pathing.js";
import { createObjectDeathCircle } from "./ability/abilityDeathCircle.js";
import { checkForBossSpawn, tickBossCharacters } from "./character/enemy/bossEnemy.js";
import { autoPlay } from "./test/autoPlay.js";
import { replayGameEndAssert, replayNextInReplayQueue, setPastCharactersAndEndBossesForReplayFromReplayData } from "./test/gameTest.js";
import { checkForEndBossAreaTrigger } from "./map/mapEndBossArea.js";
import { calculateHighscoreOnGameEnd } from "./highscores.js";
import { setPlayerAsEndBoss } from "./character/enemy/endBossEnemy.js";
import { ABILITY_NAME_FEED_PET } from "./ability/petTamer/abilityFeedPet.js";
import { ABILITY_NAME_LOVE_PET } from "./ability/petTamer/abilityLovePet.js";
import { COMMAND_RESTART } from "./globalVars.js";

export function calculateDirection(startPos: Position, targetPos: Position): number {
    let direction = 0;

    const yDiff = (startPos.y - targetPos.y);
    const xDiff = (startPos.x - targetPos.x);

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
    if (game.testing.replay) {
        setReplaySeeds(game);
        setPastCharactersAndEndBossesForReplayFromReplayData(game);
    }
    if (game.testing.record) {
        const record = game.testing.record;
        if (record.restartPlayerInput) record.data.replayPlayerInputs.push(record.restartPlayerInput);
        const restart: CommandRestart = record.data.replayPlayerInputs[0] as any;
        if (restart.command && restart.command === COMMAND_RESTART) {
            restart.testRandomStartSeed = game.state.randomSeed.seed;
        }
        record.data.nextEndBosses = deepCopy(game.state.bossStuff.nextEndbosses);
        record.data.pastCharacters = deepCopy(game.state.pastPlayerCharacters);
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
    game.state.timeFirstKill = undefined;
    game.state.playerInputs = [];
    if (game.state.bossStuff.closedOfEndBossEntrance) {
        const entrance = game.state.bossStuff.closedOfEndBossEntrance;
        changeTileIdOfMapChunk(entrance.chunkX, entrance.chunkY, entrance.tileX, entrance.tileY, entrance.tileId, game);
    }
    game.state.bossStuff.bosses = [];
    game.state.bossStuff.bossLevelCounter = 1;
    game.state.bossStuff.endBossStarted = false;
    game.state.deathCircleCreated = false;
    game.state.paused = false;
    game.clientKeyBindings = [];
    game.performance = {};
    game.UI.displayTextData = [];
    removeAllMapCharacters(game.state.map);
    createFixPositionRespawnEnemiesOnInit(game);
    gameInitPlayers(game);
    game.multiplayer.autosendMousePosition.nextTime = 0;
    if (game.multiplayer.websocket !== null) {
        game.multiplayer.maxServerGameTime = 0;
        game.state.playerInputs = game.multiplayer.cachePlayerInputs!;
    }
    resetPastCharacters(game);
}

export function resetGameNonStateData(game: Game){
    game.performance = {};
    game.UI.displayTextData = [];
    game.multiplayer.autosendMousePosition.nextTime = 0;
    for (let i = 0; i < game.state.clientInfos.length; i++) {
        if (game.multiplayer.myClientId === game.state.clientInfos[i].id) {
            game.clientKeyBindings = [{
                clientIdRef: game.multiplayer.myClientId,
                keyCodeToActionPressed: createDefaultKeyBindings1()
            }];
        }
    }
    findAndSetNewCameraCharacterId(game.camera, game.state.players, game.multiplayer.myClientId);
}

export function getCameraPosition(game: Game): Position {
    let cameraPosition: Position = { x: 0, y: 0 };
    if (game.camera.characterId !== undefined) {
        const character = findCharacterById(getPlayerCharacters(game.state.players), game.camera.characterId);
        if (character !== null) cameraPosition = { x: character.x, y: character.y };
    }

    return cameraPosition;
}

export function calculateDistance(objectA: { x: number, y: number }, objectB: { x: number, y: number }) {
    const xDiff = objectA.x - objectB.x;
    const yDiff = objectA.y - objectB.y;
    return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
}

export function calcNewPositionMovedInDirection(position: Position, direction: number, range: number): Position {
    return {
        x: position.x + Math.cos(direction) * range,
        y: position.y + Math.sin(direction) * range,
    }
}

export function takeTimeMeasure(debug: Debugging | undefined, endName: string, startName: string) {
    if (debug === undefined || debug.takeTimeMeasures !== true) return;
    if (debug.timeMeasuresData === undefined) debug.timeMeasuresData = [];
    const timeNow = performance.now();
    if (endName !== "") {
        const data = debug.timeMeasuresData?.find((e) => e.name === endName);
        if (data === undefined) return;
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
    takeTimeMeasure(game.debug, "total", "");
    takeTimeMeasure(game.debug, "", "total");
    takeTimeMeasure(game.debug, "timeout", "");
    takeTimeMeasure(game.debug, "", "runner");
    takeTimeMeasure(game.debug, "", "tick");
    if (game.multiplayer.websocket === null) {
        if (game.testing.replay && game.testing.replay.frameSkipAmount && game.testing.replay.frameSkipAmount > 0) {
            for (let i = 0; i < game.testing.replay.frameSkipAmount; i++) {
                tick(game.tickInterval, game);
                if (i < game.testing.replay.frameSkipAmount - 1) takeTimeMeasure(game.debug, "tick", "tick");
            }
        } else {
            tick(game.tickInterval, game);
        }
    } else {
        const timeNow = performance.now();
        let counter = 0;
        const maxCounter = 50;
        const realTimePassed = timeNow - game.multiplayer.worstCaseGameStartTime;
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
        const timeoutSleep = determineRunnerTimeout(game);
        if (timeoutSleep > 17) {
            console.log("timeoutSleep to big?");
            debugger;
        }
        setTimeout(() => {
            try {
                runner(game);
            } catch (e) {
                console.log(game);
                console.log(game.testing.record?.data);
                throw e;
            }
        }, timeoutSleep);
    }
    takeTimeMeasure(game.debug, "runner", "");
    takeTimeMeasure(game.debug, "", "timeout");
}

export function setRelativeMousePosition(event: MouseEvent, game: Game) {
    const target = event.currentTarget as HTMLElement;
    game.mouseRelativeCanvasPosition = { x: event.x - target.offsetLeft, y: event.y - target.offsetTop };
}

export function createPaintTextData(position: Position, text: string, color: string, fontSize: string, currentTime: number, duration: number = 1000): PaintTextData {
    return {
        text: text,
        paintPosition: { x: position.x, y: position.y },
        color: color,
        fontSize: fontSize,
        removeTime: currentTime + duration,
    }
}

export function getClientInfo(clientId: number, game: Game): ClientInfo | undefined {
    for (let clientInfo of game.state.clientInfos) {
        if (clientInfo.id === clientId) {
            return clientInfo;
        }
    }
    return undefined;
}

export function getClientInfoByCharacterId(characterId: number, game: Game): ClientInfo | undefined {
    const player = findPlayerByCharacterId(game.state.players, characterId);
    if (player) return getClientInfo(player.clientId, game);
    return undefined;
}

export function getTimeSinceFirstKill(gameState: GameState): number {
    if (gameState.timeFirstKill === undefined) return 0;
    return gameState.time - gameState.timeFirstKill;
}

export function calculateDistancePointToLine(point: Position, linestart: Position, lineEnd: Position) {
    const A = point.x - linestart.x;
    const B = point.y - linestart.y;
    const C = lineEnd.x - linestart.x;
    const D = lineEnd.y - linestart.y;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq != 0) //in case of 0 length line
        param = dot / len_sq;

    let xx, yy;

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

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

export function deepCopy(object: any): any {
    const json = JSON.stringify(object);
    return JSON.parse(json);
}

export function endGame(game: Game, isEndbossKill: boolean = false) {
    game.state.ended = true;
    const newScore = calculateHighscoreOnGameEnd(game, isEndbossKill);
    if (isEndbossKill) {
        setPlayerAsEndBoss(game);
    } else {
        savePlayerCharatersAsPastCharacters(game);
    }
    endGameReplayStuff(game, newScore);
    if (game.testing.record) {
        if (game.testing.record.data.replayPlayerInputs) {
            game.testing.record.data.gameEndAsserts = [];
            game.testing.record.data.gameEndAsserts.push({ type: "score", data: newScore });
            game.testing.record.data.gameEndAsserts.push({ type: "killCounter", data: game.state.killCounter });
            if (!game.testing.replay) {
                console.log("testData", deepCopy(game.testing.record.data));
            }
        }
    }
}

export function loadFromLocalStorage(game: Game) {
    const pastCharactersString = localStorage.getItem(LOCALSTORAGE_PASTCHARACTERS);
    if (pastCharactersString) {
        game.state.pastPlayerCharacters = JSON.parse(pastCharactersString);
        for (let pastChar of game.state.pastPlayerCharacters.characters) {
            if (!pastChar) continue;
            resetCharacter(pastChar);
            changeCharacterAndAbilityIds(pastChar, game.state.idCounter);
        }
    }
    const nextEndbossesString = localStorage.getItem(LOCALSTORAGE_NEXTENDBOSSES);
    if (nextEndbossesString) {
        const nextEndbosses: NextEndbosses = JSON.parse(nextEndbossesString);
        game.state.bossStuff.nextEndbosses = nextEndbosses;
        const keys = Object.keys(nextEndbosses) as CelestialDirection[];
        for (let key of keys) {
            const endboss = nextEndbosses[key];
            if (endboss) changeCharacterAndAbilityIds(endboss, game.state.idCounter);
        }
    }
}

export function changeCharacterAndAbilityIds(character: Character, idCounter: IdCounter) {
    changeCharacterId(character, getNextId(idCounter));
    for (let ability of character.abilities) {
        ability.id = getNextId(idCounter);
    }
}

export function saveCharacterAsPastCharacter(character: Character, game: Game) {
    if (game.testing.replay) return;
    const newPastCharacter: Character = deepCopy(character);
    resetCharacter(newPastCharacter);
    changeCharacterId(newPastCharacter, getNextId(game.state.idCounter));
    if (newPastCharacter.pets) {
        for (let pet of newPastCharacter.pets) {
            for (let ability of pet.abilities) {
                ability.disabled = true;
            }
        }
    }
    newPastCharacter.isUnMoveAble = true;
    const pastCharacters = game.state.pastPlayerCharacters.characters;
    pastCharacters.push(newPastCharacter);
    for (let i = 0; i < pastCharacters.length; i++) {
        while (!pastCharacters[i]) {
            pastCharacters.splice(i, 1);
        }
    }

    if (pastCharacters.length > game.state.pastPlayerCharacters.maxNumber) {
        pastCharacters.splice(0, 1);
    }

    for (let i = 0; i < pastCharacters.length; i++) {
        const pastCharacter = pastCharacters[i];
        if (!pastCharacter) continue;
        if (pastCharactersMapTilePositions.length > i) {
            const nextTileInfo = pastCharactersMapTilePositions[i];
            pastCharacter.x = nextTileInfo.x * 40 + 20;
            pastCharacter.y = nextTileInfo.y * 40 + 20;
            pastCharacter.moveDirection = nextTileInfo.lookDirection;
            if (pastCharacter.pets) {
                for (let pet of pastCharacter.pets) {
                    pet.x = nextTileInfo.x * 40 + 20;
                    pet.y = nextTileInfo.y * 40 + 20;
                }
            }
        } else {
            pastCharacter.x = i * 20;
            pastCharacter.y = 0;
            if (pastCharacter.pets) {
                for (let pet of pastCharacter.pets) {
                    pet.x = i * 20;
                    pet.y = 0;
                }
            }
        }
    }
    if (!game.multiplayer.disableLocalStorage) {
        localStorage.setItem(LOCALSTORAGE_PASTCHARACTERS, JSON.stringify(game.state.pastPlayerCharacters));
    }
}

function resetPastCharacters(game: Game) {
    for (let character of game.state.pastPlayerCharacters.characters) {
        if (character) resetCharacter(character);
    }
}

function tickPastCharacters(game: Game) {
    const pastCharacters = game.state.pastPlayerCharacters.characters;
    tickCharacters(pastCharacters, game, getPathingCache(game));
    for (let character of pastCharacters) {
        if (character && character.pets) {
            for (let ability of character.abilities) {
                if (ability.name === ABILITY_NAME_FEED_PET || ability.name === ABILITY_NAME_LOVE_PET) {
                    const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
                    if (abilityFunctions.tickBossAI) abilityFunctions.tickBossAI(character, ability, game);
                }
            }
        }
    }
}

function determineRunnerTimeout(game: Game): number {
    if (game.testing.replay?.zeroTimeout) {
        return 0;
    } else {
        if (game.multiplayer.websocket === null) {
            if (game.shouldTickTime === undefined) {
                game.shouldTickTime = performance.now();
                return game.tickInterval;
            } else {
                let timeoutSleep;
                game.shouldTickTime += game.tickInterval;
                const timeEnd = performance.now();
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
    const alivePlayersCount = countAlivePlayerCharacters(game.state.players)
    if (alivePlayersCount === 0) {
        return true;
    }
    return false;
}

function savePlayerCharatersAsPastCharacters(game: Game) {
    const players = game.state.players;
    for (let player of players) {
        saveCharacterAsPastCharacter(player.character, game);
    }
}

function endGameReplayStuff(game: Game, newScore: number) {
    const replay = game.testing.replay;
    if (replay) {
        replayGameEndAssert(game, newScore);
        console.log("time:", performance.now() - replay.startTime);
        const moreReplays = replayNextInReplayQueue(game);
        if (!moreReplays) {
            loadFromLocalStorage(game);
        }
    }
}

function tick(gameTimePassed: number, game: Game) {
    if (!game.state.ended && (!game.state.paused || game.state.tickOnceInPaused)) {
        if (game.state.tickOnceInPaused) game.state.tickOnceInPaused = false;
        game.state.time += gameTimePassed;
        doStuff(game);
        addReplayInputs(game);
        generateMissingChunks(game.state.map, getPlayerCharacters(game.state.players), game.state.idCounter, game);
        determineActiveChunks(getPlayerCharacters(game.state.players), game.state.map, game);
        tickPlayerInputs(game.state.playerInputs, game.state.time, game);
        tickMapCharacters(game.state.map, game);
        tickBossCharacters(game.state.bossStuff, game);

        takeTimeMeasure(game.debug, "", "playerTick");
        tickCharacters(getPlayerCharacters(game.state.players), game, getPathingCache(game));
        tickPastCharacters(game);
        takeTimeMeasure(game.debug, "playerTick", "");

        tickAbilityObjects(game.state.abilityObjects, game);

        if (gameEndedCheck(game)) endGame(game);        
        if (game.state.restartAfterTick) gameRestart(game);

        garbageCollectPathingCache(game.performance.pathingCache, game.state.time, game);
        saveStates(game);
    }
}

function saveStates(game: Game){
    if(game.debug.activateSaveStates && !game.multiplayer.websocket){
        const saveStates = game.testing.saveStates;
        if(saveStates.nextSaveStateTime === undefined || saveStates.nextSaveStateTime <= game.state.time){
            saveStates.nextSaveStateTime = game.state.time + saveStates.saveInterval;
            saveStates.states.push(JSON.stringify(game.state));
            saveStates.statesRecordData.push(JSON.stringify(game.testing.record?.data));
            if(saveStates.states.length > saveStates.maxNumberStates){
                saveStates.states.shift();
                saveStates.statesRecordData.shift();
            }
        }
    }
}

function doStuff(game: Game) {
    checkForEndBossAreaTrigger(game);
    checkDeathCircleSpawn(game);
    checkForBossSpawn(game);
    checkMovementKeyPressedHint(game);
    checkForAutoSkill(game);
    autoPlay(game);
    autoSendMyMousePosition(game);
}

function autoSendMyMousePosition(game: Game) {
    if (game.testing.replay) return;
    if (!game.multiplayer.autosendMousePosition.active) return;
    if (game.multiplayer.autosendMousePosition.nextTime <= game.state.time) {
        const cameraPosition = getCameraPosition(game);
        const castPosition = {
            x: game.mouseRelativeCanvasPosition.x - game.canvasElement!.width / 2 + cameraPosition.x,
            y: game.mouseRelativeCanvasPosition.y - game.canvasElement!.height / 2 + cameraPosition.y
        }

        handleCommand(game, {
            command: "playerInput",
            clientId: game.multiplayer.myClientId,
            data: { action: MOUSE_ACTION, mousePosition: castPosition },
        });
        game.multiplayer.autosendMousePosition.nextTime = game.state.time + game.multiplayer.autosendMousePosition.interval;
    }
}

function checkForAutoSkill(game: Game) {
    if (!game.settings.autoSkillEnabled) return;

    const character: Character | undefined = findMyCharacter(game);
    if (character && character.type !== DEFAULT_CHARACTER) {
        if (character.upgradeChoices.length > 0) {
            handleCommand(game, {
                command: "playerInput",
                clientId: game.multiplayer.myClientId,
                data: { action: UPGRADE_ACTIONS[0], isKeydown: true },
            });
        }
    }
}

function checkMovementKeyPressedHint(game: Game) {
    if (getTimeSinceFirstKill(game.state) > 10000 && !game.UI.movementKeyPressed && !game.multiplayer.websocket) {
        game.UI.displayMovementKeyHint = true;
    }
}

function checkDeathCircleSpawn(game: Game) {
    if (!game.state.deathCircleCreated) {
        const spawnAfterTime = getTimeSinceFirstKill(game.state) > 30000;
        if (spawnAfterTime) {
            game.state.abilityObjects.push(createObjectDeathCircle(game.state.map));
            game.state.deathCircleCreated = true;
        }
    }
}

function addReplayInputs(game: Game) {
    if (game.testing.replay) {
        const replay = game.testing.replay;
        if (replay.replayInputCounter === undefined) replay.replayInputCounter = 0;
        while (replay.data!.replayPlayerInputs[replay.replayInputCounter]
            && replay.data!.replayPlayerInputs[replay.replayInputCounter].executeTime < game.state.time + 1000
        ) {
            const original = replay.data!.replayPlayerInputs[replay.replayInputCounter]
            const data = { ...original };
            if (game.state.players.length === 1
                || (data.clientId === -1 && game.state.players[0].clientId === game.multiplayer.myClientId)) {
                data.clientId = game.multiplayer.myClientId;
            }
            handleCommand(game, data);
            replay.replayInputCounter++;
        }
    }
}

function determineActiveChunks(characters: Character[], map: GameMap, game: Game) {
    takeTimeMeasure(game.debug, "", "determineActiveChunks");
    const keySet: Set<string> = new Set();
    for (let i = 0; i < characters.length; i++) {
        if (characters[i].isDead) continue;
        const nearMapKeys = determineMapKeysInDistance(characters[i], map, map.activeChunkRange, false);
        for (let mapKey of nearMapKeys) {
            keySet.add(mapKey);
        }
    }
    map.activeChunkKeys = [...keySet];
    takeTimeMeasure(game.debug, "determineActiveChunks", "");
}

function setReplaySeeds(game: Game) {
    game.state.randomSeed.seed = 0;
    game.state.map = createMap();
    game.state.map.seed = 0;
    if (game.state.bossStuff.closedOfEndBossEntrance) {
        game.state.bossStuff.closedOfEndBossEntrance = undefined;
    }
    if (game.testing.replay) {
        if (game.testing.replay.mapSeed !== undefined) game.state.map.seed = game.testing.replay.mapSeed;
        if (game.testing.replay.randomStartSeed !== undefined) game.state.randomSeed.seed = game.testing.replay.randomStartSeed;
    };
}
