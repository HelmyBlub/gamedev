import { findAndSetNewCameraCharacterId } from "./character/character.js";
import { damageMeterChangeClientId } from "./combatlog.js";
import { pushStackPaintTextData } from "./floatingText.js";
import { deepCopy, setClientDefaultKeyBindings } from "./game.js";
import { Game, GameState, RecordDataMultiplayer } from "./gameModel.js";
import { sendMultiplayer } from "./multiplayerConenction.js";
import { createDefaultKeyBindings1, createDefaultUiKeyBindings, findPlayerByCliendId } from "./player.js";
import { playerAction, PlayerInput } from "./input/playerInput.js";
import { compressString } from "./stringCompress.js";

type Command = { command: string };
type CommandTimeUpdate = Command & { time: number };
export const COMMAND_COMPARE_STATE_HASH = "COMPARE_STATE_HASH";
export const COMMAND_COMPARE_STATE = "COMPARE_STATE";
export type CommandRestart = PlayerInput & {
    recordInputs?: boolean,
    replay?: boolean,
    testMapSeed?: number,
    testRandomStartSeed?: number,
    testEnemyTypeDirectionSeed?: number
}

type ConnectInfo = {
    clientName: string,
    clientId: number,
    updateInterval: number,
    randomIdentifier: string,
    numberConnections: number,
}

type PlayerJoined = {
    clientName: string,
    clientId: number,
}

export type StateCompareHash = {
    time: number,
    hash: number,
    restartCounter: number,
    playersJson?: string,
}

type StateComparePlayers = {
    time: number,
    playersJson: string,
}

export function handleCommand(game: Game, data: any) {
    if (game.multiplayer.websocket === null) {
        if (data.executeTime === undefined) data.executeTime = game.state.time + 1;
        executeCommand(game, data);
    } else {
        sendMultiplayer(data, game);
    }
}

export function executeCommand(game: Game, data: any) {
    const command = data.command;
    if (game.multiplayer.awaitingGameState.waiting &&
        (command !== "gameState" && command !== "sendGameState" && command !== "connectInfo")) {
        game.multiplayer.awaitingGameState.receivedCommands.push(data);
        return;
    }

    switch (command) {
        case "restart":
            restart(game, data);
            break;
        case "playerInput":
            if (game.state.ended) {
                //cheats can be changed when game ended
                playerAction(data.clientId, data.data, game);
            } else {
                playerInput(game, data);
            }
            break;
        case "sendGameState":
            playerJoined(game, data);
            const compressedState = compressString(JSON.stringify({ command: "gameState", data: game.state, toId: data.clientId }));
            game.multiplayer.websocket!.send(compressedState);
            break;
        case "gameState":
            gameState(game, data.data);
            break;
        case "connectInfo":
            connectInfo(game, data);
            break;
        case "playerJoined":
            playerJoined(game, data);
            break;
        case "playerLeft":
            for (let i = 0; i < game.state.clientInfos.length; i++) {
                if (game.state.clientInfos[i].id === data.clientId) {
                    pushStackPaintTextData(game.UI.stackTextsData, `${game.state.clientInfos[i].name} diconnected`, game.state.time);
                    console.log("client removed", game.state.clientInfos[i]);
                    game.state.clientInfos.splice(i, 1);
                    break;
                }
            }
            break;
        case "timeUpdate":
            timeUpdate(game, data);
            break;
        case COMMAND_COMPARE_STATE_HASH:
            compareStateHash(game, data.data);
            break;
        case COMMAND_COMPARE_STATE:
            compareStatePlayers(game, data.data);
            break;
        default:
            console.log("unkown command: " + command, data);
    }
}

function compareStatePlayers(game: Game, data: StateComparePlayers) {
    const compare = game.multiplayer.gameStateCompare;
    if (!compare) return;
    console.log(JSON.parse(data.playersJson), data.time);
}

function logFirstStringDifference(string1: string, string2: string) {
    const length = Math.max(string1.length, string2.length);
    for (let i = 0; i < length; i++) {
        if (string1[i] !== string2[i]) {
            const substringSize = 15;
            let substringStart = i - substringSize;
            if (substringStart < 0) substringStart = 0;
            const substring1 = string1.substring(substringStart, i + substringSize);
            const substring2 = string2.substring(substringStart, i + substringSize);
            console.log(substring1, substring2, substringStart);
            break;
        }
    }
}

function compareStateHash(game: Game, data: StateCompareHash) {
    const compare = game.multiplayer.gameStateCompare;
    if (!compare) return;
    let timeAndHash = compare.timeAndHash.find(e => e.time === data.time);
    if (game.state.restartCounter !== data.restartCounter && game.state.time < 30000) {
        return;
    }
    if (timeAndHash === undefined) {
        compare.timeAndHash.push({ hash: data.hash, time: data.time, playersJson: data.playersJson, restartCounter: data.restartCounter });
        if (compare.timeAndHash.length > compare.maxKeep) {
            compare.timeAndHash.shift();
        }
        return;
    }
    if (timeAndHash.hash !== data.hash) {
        if (timeAndHash.playersJson && data.playersJson) {
            logFirstStringDifference(timeAndHash.playersJson, data.playersJson);
            console.log(timeAndHash, data);
        }
        compare.stateTainted = true;
    } else {
        compare.stateTainted = false;
    }
}

function playerJoined(game: Game, data: PlayerJoined) {
    game.state.clientInfos.push({ id: data.clientId, name: data.clientName, lastMousePosition: { x: 0, y: 0 } });
    pushStackPaintTextData(game.UI.stackTextsData, `${data.clientName} joined`, game.state.time);
}

function connectInfo(game: Game, data: ConnectInfo) {
    const oldId = game.multiplayer.myClientId;
    game.multiplayer.myClientId = data.clientId;
    game.state.clientInfos = [{ id: data.clientId, name: data.clientName, lastMousePosition: { x: 0, y: 0 } }];
    game.multiplayer.updateInterval = data.updateInterval;
    if (data.numberConnections === 0) {
        game.multiplayer.awaitingGameState.waiting = false;
        const myPlayerIndex = game.state.players.findIndex(p => p.clientId === oldId);
        const correctToNewClientIds = myPlayerIndex !== -1 && game.state.players[myPlayerIndex].clientId !== data.clientId;
        if (correctToNewClientIds) {
            const replaceOtherClientId = game.state.players.findIndex(p => p.clientId === data.clientId);
            game.state.players[myPlayerIndex].clientId = data.clientId;
            if (replaceOtherClientId !== -1) {
                game.state.players[replaceOtherClientId].clientId = oldId;
            }
        }
        damageMeterChangeClientId(game.UI.damageMeter, oldId, data.clientId);
    }
    if (data.randomIdentifier) {
        console.log("myIdentifier", data.randomIdentifier);
        game.multiplayer.multiplayerIdentifier = data.randomIdentifier;
        localStorage.setItem('multiplayerIdentifier', data.randomIdentifier);
    }
}

function gameState(game: Game, data: GameState) {
    if (!game.multiplayer.awaitingGameState) return;
    game.multiplayer.awaitingGameState.waiting = false;
    game.state = data;
    game.performance = { chunkGraphRectangles: {} };
    for (let i = 0; i < game.state.clientInfos.length; i++) {
        if (game.multiplayer.myClientId === game.state.clientInfos[i].id) {
            setClientDefaultKeyBindings(game);
        }
    }
    findAndSetNewCameraCharacterId(game.camera, game.state.players, game.multiplayer.myClientId);
    handleReceivedInputsWhichCameBeforeGameState(game);
}

function handleReceivedInputsWhichCameBeforeGameState(game: Game) {
    for (let i = 0; i < game.multiplayer.awaitingGameState.receivedCommands.length; i++) {
        const input = game.multiplayer.awaitingGameState.receivedCommands[i];
        executeCommand(game, input);
    }
    game.multiplayer.awaitingGameState.receivedCommands = [];
}

function restart(game: Game, data: CommandRestart) {
    if (game.testing.record?.data.replayPlayerInputs !== undefined) game.testing.record.data.replayPlayerInputs.push(data);
    game.state.playerInputs.push(data);
    game.state.triggerRestart = true;
    game.multiplayer.lastRestartReceiveTime = performance.now();
    game.multiplayer.cachePlayerInputs = [];
    if (data.recordInputs) {
        game.testing.record = { data: { replayPlayerInputs: [], permanentData: {} } };
        if (game.debug.extendedReplayDebugData) game.testing.record.data.extendendInputData = [];
        if (game.multiplayer.websocket && game.state.clientInfos.length > 1) {
            game.testing.record.data.multiplayerData = [];
            for (let client of game.state.clientInfos) {
                const player = findPlayerByCliendId(client.id, game.state.players);
                let playerPermanentData = player?.permanentData;
                if (playerPermanentData === undefined) playerPermanentData = { money: 0, upgrades: {} };
                const multiplayerDataClient: RecordDataMultiplayer = {
                    clientInfo: deepCopy(client),
                    playerCharacterPermanentUpgrades: deepCopy(playerPermanentData),
                }
                game.testing.record.data.multiplayerData.push(multiplayerDataClient);
            }
        }
        game.testing.record.restartPlayerInput = { ...data };
        if (data.testMapSeed !== undefined) game.testing.record.mapSeed = data.testMapSeed;
    } else if (game.testing.record) {
        delete game.testing.record;
    }
    if (data.replay) {
        if (!game.testing.replay) game.testing.replay = { startTime: performance.now() };
        game.testing.replay.mapSeed = data.testMapSeed;
        game.testing.replay.randomStartSeed = data.testRandomStartSeed;
        game.testing.replay.enemyTypeDirectionSeed = data.testEnemyTypeDirectionSeed;
    } else {
        delete game.testing.replay;
    }
}

function playerInput(game: Game, data: PlayerInput) {
    if (game.testing.record !== undefined) {
        game.testing.record.data.replayPlayerInputs.push(data);
    }
    if (game.state.triggerRestart) {
        game.multiplayer.cachePlayerInputs!.push(data);
    } else {
        if (game.state.playerInputs.length === 0 || data.executeTime >= game.state.playerInputs[game.state.playerInputs.length - 1].executeTime) {
            game.state.playerInputs.push(data);
        } else {
            let inserted = false;
            for (let i = 0; i < game.state.playerInputs.length; i++) {
                if (data.executeTime < game.state.playerInputs[i].executeTime) {
                    game.state.playerInputs.splice(i, 0, data);
                    inserted = true;
                    break;
                }
            }
            if (!inserted) {
                console.log("should not be possible. Input not inserted", data);
            }
        }
    }
}

function timeUpdate(game: Game, data: CommandTimeUpdate) {
    const multi = game.multiplayer;
    const timeNow = performance.now();
    const oldReceivedTime = multi.maxServerGameTimeReceivedTime;
    multi.timePassedWithoutSeverUpdate = timeNow;
    multi.maxServerGameTime = data.time;
    multi.maxServerGameTimeReceivedTime = timeNow;
    const validTimeUpdate = oldReceivedTime > 0 && oldReceivedTime < multi.maxServerGameTimeReceivedTime;
    if (validTimeUpdate) {
        let startTime = multi.maxServerGameTimeReceivedTime - multi.maxServerGameTime + multi.updateInterval;
        if (multi.worstCaseGameStartTime < startTime) {
            multi.worstCaseGameStartTime = startTime;
            multi.worstCaseAge = timeNow;
            multi.worstRecentCaseGameStartTime = Number.NEGATIVE_INFINITY;
        } else {
            if (multi.worstRecentCaseGameStartTime < startTime) {
                multi.worstRecentCaseGameStartTime = startTime;
            }
            if (multi.worstCaseAge + 1000 < timeNow) {
                multi.worstCaseGameStartTime = multi.worstRecentCaseGameStartTime;
                multi.worstCaseAge = timeNow;
                multi.worstRecentCaseGameStartTime = Number.NEGATIVE_INFINITY;
            }
        }
    }
}