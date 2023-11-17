import { findAndSetNewCameraCharacterId } from "./character/character.js";
import { createPaintTextData, getCameraPosition } from "./game.js";
import { Game, GameState } from "./gameModel.js";
import { sendMultiplayer } from "./multiplayerConenction.js";
import { createDefaultKeyBindings1 } from "./player.js";
import { PlayerInput } from "./playerInput.js";
import { compressString } from "./stringCompress.js";

type Command = { command: string };
type CommandTimeUpdate = Command & { time: number };
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
            playerInput(game, data);
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
                    const textPosition = getCameraPosition(game);
                    game.UI.displayTextData.push(createPaintTextData(textPosition, `${game.state.clientInfos[i].name} diconnected`, "black", "24", game.state.time, 5000));
                    console.log("client removed", game.state.clientInfos[i]);
                    game.state.clientInfos.splice(i, 1);
                    break;
                }
            }
            break;
        case "timeUpdate":
            timeUpdate(game, data);
            break;
        default:
            console.log("unkown command: " + command, data);
    }
}

function playerJoined(game: Game, data: PlayerJoined) {
    game.state.clientInfos.push({ id: data.clientId, name: data.clientName, lastMousePosition: { x: 0, y: 0 } });
    const textPosition = getCameraPosition(game);
    game.UI.displayTextData.push(createPaintTextData(textPosition, `${data.clientName} joined`, "black", "24", game.state.time, 5000));
}

function connectInfo(game: Game, data: ConnectInfo) {
    game.multiplayer.myClientId = data.clientId;
    game.state.clientInfos = [{ id: data.clientId, name: data.clientName, lastMousePosition: { x: 0, y: 0 } }];
    game.multiplayer.updateInterval = data.updateInterval;
    if (data.numberConnections === 0) {
        game.multiplayer.awaitingGameState.waiting = false;
        game.state.players[0].clientId = data.clientId;
        game.clientKeyBindings[0].clientIdRef = data.clientId;
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
    game.performance = {};
    for (let i = 0; i < game.state.clientInfos.length; i++) {
        if (game.multiplayer.myClientId === game.state.clientInfos[i].id) {
            game.clientKeyBindings = [{
                clientIdRef: game.multiplayer.myClientId,
                keyCodeToActionPressed: createDefaultKeyBindings1()
            }];
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
        game.testing.record = { data: { replayPlayerInputs: [] } };
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
    if (game.testing.record !== undefined) game.testing.record.data.replayPlayerInputs.push(data);
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