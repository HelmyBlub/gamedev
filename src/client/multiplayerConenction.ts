import { executeCommand } from "./commands.js";
import { createPaintTextData, getCameraPosition } from "./game.js";
import { Game } from "./gameModel.js";
import { PlayerInput } from "./playerInput.js";
import { decompressString } from "./stringCompress.js";

export function websocketConnect(game: Game, clientName: string = "Unknown", lobbyCode: string = "") {
    const protocol = window.location.protocol === "http:" ? "ws" : "wss";

    let url = `${protocol}://${window.location.host}/ws`;
    url += "?clientName=" + clientName;
    url += "&myGameTime=" + game.state.time;
    if(lobbyCode.length > 0) url += "&lobbyCode=" + lobbyCode;
    let lastIdentifier = localStorage.getItem('multiplayerIdentifier');
    if (lastIdentifier) {
        console.log("multiplayer Last Identifier", lastIdentifier);
        url += "&myId=" + lastIdentifier;
    }
    const socket = new WebSocket(url, 'gamedev');

    socket.onopen = function (e) {
        console.log("websocket open");
        document.getElementById('stringInput')?.classList.add('hide');
        let textPosition1 = getCameraPosition(game);
        textPosition1.y += 24;
        game.UI.displayTextData.push(createPaintTextData(textPosition1, `Multiplayer Connected`, "black", "24", game.state.time, 5000));

        game.multiplayer.connectMenuOpen = false;
        game.multiplayer.lastSendTime = [];

        game.multiplayer.websocket = socket;
        game.multiplayer.awaitingGameState.waiting = true;
    };

    socket.onmessage = async function (message: any) {
        let messageObj: any;
        try{ 
            messageObj = JSON.parse(message.data);
        }catch(e){
            const jsonString = await decompressString(message.data);
            messageObj = JSON.parse(jsonString);
        }
        determineDelay(messageObj, game);
        executeCommand(game, messageObj);
    };

    socket.onclose = function () {
        console.log("onclose");
        let textPosition1 = getCameraPosition(game);
        if(game.multiplayer.intentionalDisconnect){
            game.UI.displayTextData.push(createPaintTextData(textPosition1, `Multiplayer Disconnected`, "black", "24", game.state.time, 5000));
    
            game.multiplayer.awaitingGameState.waiting = false;
            game.multiplayer.websocket = null;
    
            let myClientId = game.multiplayer.myClientId;
            for (let i = game.state.cliendInfos.length - 1; i >= 0; i--) {
                if (game.state.cliendInfos[i].id !== myClientId) {
                    game.state.cliendInfos.splice(i,1);
                }
            }
            game.multiplayer.intentionalDisconnect = false;
        }else{
            //reconenct
            setTimeout(() => {
                game.UI.displayTextData.push(createPaintTextData(textPosition1, `Disconnected, reconnecting...`, "black", "24", game.state.time, 5000));
                websocketConnect(game, clientName, lobbyCode);    
            }, 500);
        }
    };

    socket.onerror = function (error) {
        game.multiplayer.awaitingGameState.waiting = false;
        (document.getElementById('multiplayerConnect') as HTMLButtonElement).disabled = false;  
        console.log("weboscket error", error);
    };
}

export function sendMultiplayer(data: any, game: Game) {
    if (data.command === "playerInput" && data.clientId === game.multiplayer.myClientId) {
        game.multiplayer.lastSendTime.push(performance.now());
    }
    game.multiplayer.websocket!.send(JSON.stringify(data));
}

function determineDelay(messageObj: PlayerInput, game: Game) {
    if (game.multiplayer.myClientId === -1) return;
    const clientId = game.multiplayer.myClientId;
    if (messageObj.command === "playerInput" && messageObj.clientId === clientId) {
        const lastSendTime = game.multiplayer.lastSendTime.shift();
        if (lastSendTime === undefined) {
            console.log("error: lastSendTime missing");
            return;
        }
        const currDelay = (performance.now() - lastSendTime);
        if (game.multiplayer.delay < currDelay) {
            game.multiplayer.delay = (game.multiplayer.delay + currDelay) / 2;
        } else {
            game.multiplayer.delay = (game.multiplayer.delay * 7 + currDelay) / 8;
        };

        if (game.multiplayer.minDelay < currDelay) {
            game.multiplayer.minDelay = (game.multiplayer.minDelay * 7 + currDelay) / 8;
        } else {
            game.multiplayer.minDelay = (game.multiplayer.minDelay + currDelay) / 2;
        };
    }
}
