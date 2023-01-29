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
            for (let i = 0; i < game.state.clientIds.length; i++) {
                if (game.multiplayer.myClientId === game.state.clientIds[i]) {
                    game.clientKeyBindings = [{
                        clientIdRef: game.multiplayer.myClientId,
                        keyCodeToActionPressed: createDefaultKeyBindings1()
                    }];
                }
            }
            break;
        case "connectInfo":
            game.multiplayer.myClientId = data.clientId;
            game.state.clientIds = [data.clientId];
            game.multiplayer.updateInterval = data.updateInterval;
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
            let oldReceivedTime =  multi.maxServerGameTimeReceivedTime;
            multi.maxServerGameTime = data.time;
            multi.maxServerGameTimeReceivedTime = performance.now();
            let validTimeUpdate = oldReceivedTime > 0 && oldReceivedTime < multi.maxServerGameTimeReceivedTime;
            if(validTimeUpdate){
                let startTime = multi.maxServerGameTimeReceivedTime - multi.maxServerGameTime + multi.updateInterval;
                if(multi.worstCaseGameStartTime < startTime){
                    multi.worstCaseGameStartTime = startTime;
                }
            }
    
            break;
        default:
            console.log("unkown command: " + command, data);
    }
}