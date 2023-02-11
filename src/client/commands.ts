import { findAndSetNewCameraCharacterId } from "./character/character.js";
import { Game } from "./gameModel.js";
import { sendMultiplayer } from "./multiplayerConenction.js";
import { createDefaultKeyBindings1 } from "./player.js";

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
    switch (command) {
        case "restart":
            if (game.testing?.collectedTestInputs !== undefined) game.testing.collectedTestInputs.push(data);
            game.state.playerInputs.push(data);
            game.state.triggerRestart = true;
            game.multiplayer.lastRestartReceiveTime = performance.now();
            game.multiplayer.cachePlayerInputs = [];
            if (data.testing){
                if(game.testing){
                    game.testing.startTime = performance.now();
                }else{
                    game.testing = {startTime: performance.now()};
                }
            } 
            break;
        case "playerInput":
            if (game.testing?.collectedTestInputs !== undefined) game.testing.collectedTestInputs.push(data);
            if (game.state.triggerRestart) {
                game.multiplayer.cachePlayerInputs!.push(data);
            } else {
                game.state.playerInputs.push(data);
            }
            break;
        case "sendGameState":
            game.state.clientIds.push(data.clientId);
            game.multiplayer.websocket!.send(JSON.stringify({ command: "gameState", data: game.state }));
            break;
        case "gameState":
            game.state = data.data;
            game.performance = {};
            for (let i = 0; i < game.state.clientIds.length; i++) {
                if (game.multiplayer.myClientId === game.state.clientIds[i]) {
                    game.clientKeyBindings = [{
                        clientIdRef: game.multiplayer.myClientId,
                        keyCodeToActionPressed: createDefaultKeyBindings1()
                    }];
                }
            }
            findAndSetNewCameraCharacterId(game.camera, game.state.players, game.multiplayer.myClientId);
            break;
        case "connectInfo":
            game.multiplayer.myClientId = data.clientId;
            game.state.clientIds = [data.clientId];
            game.multiplayer.updateInterval = data.updateInterval;
            if(data.randomIdentifier){
                console.log("myIdentifier", data.randomIdentifier);
                localStorage.setItem('multiplayerIdentifier', data.randomIdentifier);
            }
            break;
        case "playerLeft":
            for (let i = 0; i < game.state.clientIds.length; i++) {
                if (game.state.clientIds[i] === data.clientId) {
                    console.log("client removed", game.state.clientIds[i]);
                    game.state.clientIds.splice(i, 1);
                    break;
                }
            }
            break;
        case "timeUpdate":
            let multi = game.multiplayer;
            let timeNow = performance.now();
            let oldReceivedTime =  multi.maxServerGameTimeReceivedTime;
            multi.maxServerGameTime = data.time;
            multi.maxServerGameTimeReceivedTime = timeNow;
            let validTimeUpdate = oldReceivedTime > 0 && oldReceivedTime < multi.maxServerGameTimeReceivedTime;
            if(validTimeUpdate){
                let startTime = multi.maxServerGameTimeReceivedTime - multi.maxServerGameTime + multi.updateInterval;
                if(multi.worstCaseGameStartTime < startTime){
                    multi.worstCaseGameStartTime = startTime;
                    multi.worstCaseAge = timeNow;
                    multi.worstRecentCaseGameStartTime = Number.NEGATIVE_INFINITY;
                }else{
                    if(multi.worstRecentCaseGameStartTime < startTime){
                        multi.worstRecentCaseGameStartTime = startTime;
                    }
                    if(multi.worstCaseAge + 1000 < timeNow){
                        multi.worstCaseGameStartTime = multi.worstRecentCaseGameStartTime;
                        multi.worstCaseAge = timeNow;
                        multi.worstRecentCaseGameStartTime = Number.NEGATIVE_INFINITY;    
                    }
                }
            }
    
            break;
        default:
            console.log("unkown command: " + command, data);
    }
}