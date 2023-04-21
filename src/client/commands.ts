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
    testing?: boolean,
    testMapSeed?: number,
    testRandomStartSeed?: number,
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
    if(game.multiplayer.awaitingGameState.waiting &&
        (command !== "gameState" && command !== "sendGameState" && command !== "connectInfo")){
        game.multiplayer.awaitingGameState.receivedCommands.push(data);
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
            let compressedState = compressString(JSON.stringify({ command: "gameState", data: game.state, toId: data.clientId }));
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
            for (let i = 0; i < game.state.cliendInfos.length; i++) {
                if (game.state.cliendInfos[i].id === data.clientId) {
                    let textPosition = getCameraPosition(game);
                    game.UI.displayTextData.push(createPaintTextData(textPosition, `${game.state.cliendInfos[i].name} diconnected`, "black", "24", game.state.time, 5000));
                    console.log("client removed", game.state.cliendInfos[i]);
                    game.state.cliendInfos.splice(i, 1);
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

function playerJoined(game: Game, data: PlayerJoined){
    game.state.cliendInfos.push({id: data.clientId, name:data.clientName});
    let textPosition = getCameraPosition(game);
    game.UI.displayTextData.push(createPaintTextData(textPosition, `${data.clientName} joined`, "black", "24", game.state.time, 5000));

}

function connectInfo(game: Game, data: ConnectInfo){
    game.multiplayer.myClientId = data.clientId;
    game.state.cliendInfos = [{id: data.clientId, name: data.clientName}];
    game.multiplayer.updateInterval = data.updateInterval;
    if(data.numberConnections === 0){
        game.multiplayer.awaitingGameState.waiting = false;
        game.state.players[0].clientId = data.clientId;
        game.clientKeyBindings[0].clientIdRef = data.clientId;
    }
    if (data.randomIdentifier) {
        console.log("myIdentifier", data.randomIdentifier);
        localStorage.setItem('multiplayerIdentifier', data.randomIdentifier);
    }
}

function gameState(game: Game, data: GameState){
    if(!game.multiplayer.awaitingGameState) return;
    game.multiplayer.awaitingGameState.waiting = false;
    game.state = data;
    game.performance = {};
    for (let i = 0; i < game.state.cliendInfos.length; i++) {
        if (game.multiplayer.myClientId === game.state.cliendInfos[i].id) {
            game.clientKeyBindings = [{
                clientIdRef: game.multiplayer.myClientId,
                keyCodeToActionPressed: createDefaultKeyBindings1()
            }];
        }
    }
    findAndSetNewCameraCharacterId(game.camera, game.state.players, game.multiplayer.myClientId);
    handleReceivedInputsWhichCameBeforeGameState(game);
}

function handleReceivedInputsWhichCameBeforeGameState(game: Game){
    for(let i = 0; i< game.multiplayer.awaitingGameState.receivedCommands.length; i++){
        let input = game.multiplayer.awaitingGameState.receivedCommands[i];
        if(input.executeTime === undefined || input.executeTime > game.state.time){
            executeCommand(game, input);
        }
    }
    game.multiplayer.awaitingGameState.receivedCommands = [];
}

function restart(game: Game, data: CommandRestart) {
    if (game.testing.recordAndReplay?.collectedTestInputs !== undefined) game.testing.recordAndReplay.collectedTestInputs.push(data);
    game.state.playerInputs.push(data);
    game.state.triggerRestart = true;
    game.multiplayer.lastRestartReceiveTime = performance.now();
    game.multiplayer.cachePlayerInputs = [];
    if (data.testing) {
        if (game.testing.recordAndReplay) {
            game.testing.recordAndReplay.startTime = performance.now();
        } else {
            game.testing.recordAndReplay = { startTime: performance.now() };
        }
        if(data.testMapSeed !== undefined) game.testing.recordAndReplay.mapSeed = data.testMapSeed;
        if(data.testRandomStartSeed !== undefined) game.testing.recordAndReplay.randomStartSeed = data.testRandomStartSeed;
    } else if (game.testing.recordAndReplay) {
        delete game.testing.recordAndReplay;
    }
}

function playerInput(game: Game, data: PlayerInput) {
    if (game.testing.recordAndReplay?.collectedTestInputs !== undefined) game.testing.recordAndReplay.collectedTestInputs.push(data);
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
    let multi = game.multiplayer;
    let timeNow = performance.now();
    let oldReceivedTime = multi.maxServerGameTimeReceivedTime;
    multi.timePassedWithoutSeverUpdate = timeNow;
    multi.maxServerGameTime = data.time;
    multi.maxServerGameTimeReceivedTime = timeNow;
    let validTimeUpdate = oldReceivedTime > 0 && oldReceivedTime < multi.maxServerGameTimeReceivedTime;
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