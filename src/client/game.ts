import { changeCharacterId, countAlivePlayerCharacters, findAndSetNewCameraCharacterId, findCharacterById, findMyCharacter, getPlayerCharacters, resetCharacter, tickCharacters, tickMapCharacters } from "./character/character.js";
import { paintAll } from "./gamePaint.js";
import { Player, createDefaultKeyBindings1, createDefaultUiKeyBindings, findNearesPastPlayerCharacter, findPlayerByCharacterId, gameInitPlayers, isAutoSkillActive } from "./player.js";
import { MOUSE_ACTION, UPGRADE_ACTIONS, tickPlayerInputs } from "./playerInput.js";
import { Position, GameState, Game, IdCounter, Debugging, PaintTextData, ClientInfo } from "./gameModel.js";
import { changeTileIdOfMapChunk, createMap, determineMapKeysInDistance, GameMap, getMapMidlePosition } from "./map/map.js";
import { Character } from "./character/characterModel.js";
import { generateMissingChunks, pastCharactersMapTilePositions } from "./map/mapGeneration.js";
import { createFixPositionRespawnEnemiesOnInit } from "./character/enemy/fixPositionRespawnEnemyModel.js";
import { CommandRestart, handleCommand } from "./commands.js";
import { ABILITIES_FUNCTIONS, tickAbilityObjects } from "./ability/ability.js";
import { garbageCollectPathingCache, getPathingCache } from "./character/pathing.js";
import { createObjectDeathCircle } from "./ability/abilityDeathCircle.js";
import { checkForBossSpawn, tickBossCharacters } from "./character/enemy/bossEnemy.js";
import { autoPlay } from "./test/autoPlay.js";
import { replayGameEndAssert, replayNextInReplayQueue } from "./test/gameTest.js";
import { checkForKingAreaTrigger } from "./map/mapKingArea.js";
import { calculateHighscoreOnGameEnd } from "./highscores.js";
import { setPlayerAsKing } from "./character/enemy/kingEnemy.js";
import { ABILITY_NAME_FEED_PET } from "./ability/petTamer/abilityFeedPet.js";
import { ABILITY_NAME_LOVE_PET } from "./ability/petTamer/abilityLovePet.js";
import { COMMAND_RESTART } from "./globalVars.js";
import { consoleLogCombatlog } from "./combatlog.js";
import { mapObjectPlaceClassBuilding } from "./map/mapObjectClassBuilding.js";
import { hasPlayerChoosenStartClassUpgrade } from "./character/playerCharacters/playerCharacters.js";
import { copyAndSetPermanentDataForReplay, localStorageLoad, localStorageSavePastCharacters, localStorageSavePermanentPlayerData, setPermanentDataFromReplayData } from "./permanentData.js";
import { MapTileObject, findNearesInteractableMapChunkObject } from "./map/mapObjects.js";
import { classBuildingCheckAllPlayerForLegendaryAbilitiesAndMoveBackToBuilding } from "./map/buildings/classBuilding.js";
import { mapObjectPlaceUpgradeBuilding } from "./map/mapObjectUpgradeBuilding.js";

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

export function modulo(number: number, mod: number): number {
    return ((number % mod) + mod) % mod;
}

export function getNextId(idCounter: IdCounter) {
    return idCounter.nextId++;
}

export function gameRestart(game: Game) {
    classBuildingCheckAllPlayerForLegendaryAbilitiesAndMoveBackToBuilding(game);
    if (game.testing.replay) {
        setReplaySeeds(game);
        setPermanentDataFromReplayData(game);
    }
    if (game.testing.record) {
        const record = game.testing.record;
        if (record.restartPlayerInput) record.data.replayPlayerInputs.push(record.restartPlayerInput);
        const restart: CommandRestart = record.data.replayPlayerInputs[0] as any;
        if (restart.command && restart.command === COMMAND_RESTART) {
            restart.testRandomStartSeed = game.state.randomSeed.seed;
            restart.testEnemyTypeDirectionSeed = game.state.enemyTypeDirectionSeed;
        }
        copyAndSetPermanentDataForReplay(record.data.permanentData, game);
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
    game.state.killCounter = 0;
    game.state.ended = false;
    game.state.triggerRestart = false;
    game.state.restartAfterTick = false;
    game.state.time = 0;
    game.state.timeFirstKill = undefined;
    game.state.playerInputs = [];
    if (game.state.bossStuff.closedOfKingAreaEntrance) {
        const entrance = game.state.bossStuff.closedOfKingAreaEntrance;
        changeTileIdOfMapChunk(entrance.chunkX, entrance.chunkY, entrance.tileX, entrance.tileY, entrance.tileId, game);
        game.state.bossStuff.closedOfKingAreaEntrance = undefined;
    }
    game.state.bossStuff.bosses = [];
    game.state.bossStuff.bossLevelCounter = 1;
    game.state.bossStuff.kingFightStarted = false;
    game.state.deathCircleCreated = false;
    game.state.paused = false;
    game.state.enemyTypeDirectionSeed += 1;
    game.performance = {};
    game.UI.displayTextData = [];
    game.testing.saveStates.autoSaves.nextSaveStateTime = 10000;
    game.state.map.activeChunkKeys = [];
    game.state.map.chunks = {};
    createFixPositionRespawnEnemiesOnInit(game);
    gameInitPlayers(game);
    game.multiplayer.autosendMousePosition.nextTime = 0;
    if (game.multiplayer.websocket !== null) {
        game.multiplayer.maxServerGameTime = 0;
        game.state.playerInputs = game.multiplayer.cachePlayerInputs!;
    }
    resetPastCharacters(game);
}

export function resetGameNonStateData(game: Game) {
    game.performance = {};
    game.UI.displayTextData = [];
    game.multiplayer.autosendMousePosition.nextTime = 0;
    for (let i = 0; i < game.state.clientInfos.length; i++) {
        if (game.multiplayer.myClientId === game.state.clientInfos[i].id) {
            game.clientKeyBindings = {
                clientIdRef: game.multiplayer.myClientId,
                keyCodeToActionPressed: createDefaultKeyBindings1(),
                keyCodeToUiAction: createDefaultUiKeyBindings(),
            };
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

export function takeTimeMeasure(debug: Debugging | undefined, endName: string, startName: string, timeOffset: number = 0) {
    if (debug === undefined || debug.takeTimeMeasures !== true) return;
    if (debug.timeMeasuresData === undefined) debug.timeMeasuresData = [];
    const timeNow = performance.now() + timeOffset;
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

export async function runner(game: Game) {
    while (!game.closeGame) {
        const sleepTime = tickAndPaint(game);
        await sleep(sleepTime);
    }
}

async function sleep(milliseconds: number) {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

export function getRelativeMousePoistion(event: MouseEvent): Position {
    const target = event.currentTarget as HTMLElement;
    return { x: event.x - target.offsetLeft, y: event.y - target.offsetTop };
}

export function setRelativeMousePosition(event: MouseEvent, game: Game) {
    game.mouseRelativeCanvasPosition = getRelativeMousePoistion(event);
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

export function findClientInfo(clientId: number, game: Game): ClientInfo | undefined {
    for (let clientInfo of game.state.clientInfos) {
        if (clientInfo.id === clientId) {
            return clientInfo;
        }
    }
    return undefined;
}

export function findClientInfoByCharacterId(characterId: number, game: Game): ClientInfo | undefined {
    const player = findPlayerByCharacterId(game.state.players, characterId);
    if (player) return findClientInfo(player.clientId, game);
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

export function endGame(game: Game, isKingKill: boolean = false) {
    game.state.ended = true;
    addPlayerMoney(game, isKingKill);
    const newScore = calculateHighscoreOnGameEnd(game, isKingKill);
    if (isKingKill) {
        setPlayerAsKing(game);
        mapObjectPlaceClassBuilding(game);
    } else {
        savePlayerCharatersAsPastCharacters(game);
        if (!game.testing.replay) {
            const myCharacter = findMyCharacter(game);
            if (myCharacter && myCharacter.combatlog) consoleLogCombatlog(myCharacter.combatlog);
        }
    }
    mapObjectPlaceUpgradeBuilding(game);
    endGameReplayStuff(game, newScore);
    if (game.testing.record) {
        if (game.testing.record.data.replayPlayerInputs) {
            game.testing.record.data.gameEndAsserts = [];
            game.testing.record.data.gameEndAsserts.push({ type: "score", data: newScore });
            game.testing.record.data.gameEndAsserts.push({ type: "killCounter", data: game.state.killCounter });
            if (!game.testing.replay) {
                game.testing.lastReplay = deepCopy(game.testing.record.data);
            }
        }
    }
}

export function changeCharacterAndAbilityIds(character: Character, idCounter: IdCounter) {
    changeCharacterId(character, idCounter);
    for (let ability of character.abilities) {
        ability.id = getNextId(idCounter);
    }
}

export function saveCharacterAsPastCharacter(character: Character, game: Game) {
    if (game.testing.replay) return;
    const newPastCharacter: Character = deepCopy(character);
    for (let i = newPastCharacter.abilities.length - 1; i >= 0; i--) {
        const ability = newPastCharacter.abilities[i];
        if (ability.legendary) {
            newPastCharacter.abilities.splice(i, 1);
        }
    }
    resetCharacter(newPastCharacter, game);
    changeCharacterId(newPastCharacter, game.state.idCounter);
    if (newPastCharacter.pets) {
        for (let i = newPastCharacter.pets.length - 1; i >= 0; i--) {
            const pet = newPastCharacter.pets[i];
            if (pet.legendary) {
                newPastCharacter.pets.splice(i, 1);
                continue;
            }
            for (let ability of pet.abilities) {
                ability.disabled = true;
            }
        }
    }
    if (newPastCharacter.characterClasses) {
        for (let i = newPastCharacter.characterClasses.length - 1; i >= 0; i--) {
            const charClass = newPastCharacter.characterClasses[i];
            if (charClass.legendary) newPastCharacter.characterClasses.splice(i, 1);
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
    localStorageSavePastCharacters(game);
}

export function autoSendMousePositionHandler(ownerId: number, identifier: string, activateAutoSend: boolean, castPosition: Position | undefined, game: Game) {
    const clientInfo = findClientInfoByCharacterId(ownerId, game);
    if (!clientInfo) return;
    if (clientInfo.id === game.multiplayer.myClientId) {
        const sendForOwners = game.multiplayer.autosendMousePosition.sendForOwners;
        const alreadyAddedIndex = sendForOwners.findIndex((e) => e === identifier);
        if (activateAutoSend) {
            if (alreadyAddedIndex === -1) {
                sendForOwners.push(identifier);
            }
        } else {
            if (alreadyAddedIndex !== -1) {
                sendForOwners.splice(alreadyAddedIndex, 1);
            }
        }
    }
    if (castPosition) clientInfo.lastMousePosition = castPosition;
}

export function findClosestInteractable(game: Game): { pastCharacter?: Character, mapObject?: MapTileObject } | undefined {
    const character = findMyCharacter(game);
    if (!character) return;
    const pastCharacter = findNearesPastPlayerCharacter(character, game);
    const interactableMapObject = findNearesInteractableMapChunkObject(character, game);
    if (pastCharacter && interactableMapObject) {
        const distancePastChar = calculateDistance(pastCharacter, character);
        const tileSize = game.state.map.tileSize;
        const mapObjectPosition: Position = { x: interactableMapObject.x * tileSize, y: interactableMapObject.y * tileSize };
        const distanceMapObject = calculateDistance(mapObjectPosition, character);
        if (distanceMapObject > distancePastChar) {
            return { pastCharacter: pastCharacter };
        } else {
            return { mapObject: interactableMapObject };
        }
    } else if (pastCharacter) {
        return { pastCharacter: pastCharacter };
    } else if (interactableMapObject) {
        return { mapObject: interactableMapObject };
    }
}

export function addMoneyAmountToPlayer(moneyAmount: number, players: Player[], game: Game) {
    for (let player of players) {
        const moneyFactor = player.character.bonusMoneyFactor !== undefined ? player.character.bonusMoneyFactor : 1;
        const finalMoneyAmount = moneyAmount * moneyFactor;
        player.permanentData.money += finalMoneyAmount;
        if (finalMoneyAmount > 0 && player.clientId === game.multiplayer.myClientId) {
            const textPosition = getCameraPosition(game);
            game.UI.displayTextData.push(createPaintTextData(textPosition, `$${finalMoneyAmount.toFixed(1)}`, "black", "24", game.state.time, 5000));
        }
    }
    localStorageSavePermanentPlayerData(game);
}

function tickAndPaint(game: Game) {
    takeTimeMeasure(game.debug, "total", "");
    takeTimeMeasure(game.debug, "", "total");
    takeTimeMeasure(game.debug, "?timeout?", "");
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

    const timeoutSleep = determineRunnerTimeout(game);
    takeTimeMeasure(game.debug, "runner", "");
    takeTimeMeasure(game.debug, "", "?timeout?", timeoutSleep);
    return timeoutSleep;
}

function resetPastCharacters(game: Game) {
    for (let character of game.state.pastPlayerCharacters.characters) {
        if (character) resetCharacter(character, game);
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
                game.shouldTickTime += game.tickInterval;
                const timeEnd = performance.now();
                let timeoutSleep = game.shouldTickTime - timeEnd;
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
            localStorageLoad(game);
        }
    }
}

function addPlayerMoney(game: Game, isKingKill: boolean = false) {
    let highestPlayerDistane = 0;
    for (let i = 0; i < game.state.players.length; i++) {
        const player = game.state.players[i];
        const distance = Math.round(calculateDistance(player.character, getMapMidlePosition(game.state.map)));
        if (distance > highestPlayerDistane) highestPlayerDistane = distance;
    }
    let moneyGain = Math.max(0, (highestPlayerDistane / 1000) - 2);
    if (isKingKill && game.state.bossStuff.bosses.length >= 2) {
        const boss = game.state.bossStuff.bosses[game.state.bossStuff.bosses.length - 2];
        if (boss) moneyGain += boss.maxHp / 5000000;
    }
    addMoneyAmountToPlayer(moneyGain, game.state.players, game);
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

function saveStates(game: Game) {
    if (game.debug.activateSaveStates && !game.multiplayer.websocket) {
        const autoSaveStates = game.testing.saveStates.autoSaves;
        if (autoSaveStates.nextSaveStateTime === undefined || autoSaveStates.nextSaveStateTime <= game.state.time) {
            autoSaveStates.nextSaveStateTime = game.state.time + autoSaveStates.saveInterval;
            autoSaveStates.states.push(JSON.stringify(game.state));
            autoSaveStates.statesRecordData.push(JSON.stringify(game.testing.record?.data));
            if (autoSaveStates.states.length > autoSaveStates.maxNumberStates) {
                autoSaveStates.states.shift();
                autoSaveStates.statesRecordData.shift();
            }
        }
    }
}

function doStuff(game: Game) {
    checkForKingAreaTrigger(game);
    checkDeathCircleSpawn(game);
    checkForBossSpawn(game);
    checkMovementKeyPressedHint(game);
    checkForAutoSkill(game);
    autoPlay(game);
    autoSendMyMousePosition(game);
}

function autoSendMyMousePosition(game: Game) {
    if (game.testing.replay) return;
    if (game.multiplayer.autosendMousePosition.sendForOwners.length === 0) return;
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
    if (!isAutoSkillActive(game)) return;

    const character: Character | undefined = findMyCharacter(game);
    if (character && hasPlayerChoosenStartClassUpgrade(character)) {
        if (character.upgradeChoices.length > 0) {
            let randomChoice = Math.floor(Math.random() * character.upgradeChoices.length);
            handleCommand(game, {
                command: "playerInput",
                clientId: game.multiplayer.myClientId,
                data: { action: UPGRADE_ACTIONS[randomChoice], isKeydown: true },
            });
        }
    }
}

function checkMovementKeyPressedHint(game: Game) {
    if (game.state.time > 10000 && !game.UI.movementKeyPressed && !game.multiplayer.websocket) {
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
    if (game.state.bossStuff.closedOfKingAreaEntrance) {
        game.state.bossStuff.closedOfKingAreaEntrance = undefined;
    }
    if (game.testing.replay) {
        if (game.testing.replay.mapSeed !== undefined) game.state.map.seed = game.testing.replay.mapSeed;
        if (game.testing.replay.randomStartSeed !== undefined) game.state.randomSeed.seed = game.testing.replay.randomStartSeed;
        if (game.testing.replay.enemyTypeDirectionSeed !== undefined) game.state.enemyTypeDirectionSeed = game.testing.replay.enemyTypeDirectionSeed;
    };
}
