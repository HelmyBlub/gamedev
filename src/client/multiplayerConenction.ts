import { executeCommand } from "./commands.js";
import { pushStackPaintTextData } from "./floatingText.js";
import { getCameraPosition } from "./game.js";
import { Game } from "./gameModel.js";
import { PlayerInput } from "./playerInput.js";
import { decompressString } from "./stringCompress.js";

export function websocketConnect(game: Game, clientName: string, lobbyCode: string = "") {
    const protocol = window.location.protocol === "http:" ? "ws" : "wss";

    let url = `${protocol}://${window.location.host}/ws`;
    url += "?clientName=" + clientName;
    url += "&myGameTime=" + game.state.time;
    if (lobbyCode.length > 0) url += "&lobbyCode=" + lobbyCode;
    const lastIdentifier = getMyClientIdentifier(game);
    if (lastIdentifier) {
        console.log("multiplayer Last Identifier", lastIdentifier);
        url += "&myId=" + lastIdentifier;
    }
    const socket = new WebSocket(url, 'gamedev');

    socket.onopen = function (e) {
        console.log("websocket open");
        game.state.paused = false;
        game.multiplayer.disableLocalStorage = true;
        document.getElementById('stringInput')?.classList.add('hide');
        pushStackPaintTextData(game.UI.stackTextsData, `Multiplayer Connected`, game.state.time);

        game.multiplayer.connectMenuOpen = false;
        game.multiplayer.lastSendTime = [];

        game.multiplayer.websocket = socket;
        game.multiplayer.awaitingGameState.waiting = true;
    };

    socket.onmessage = async function (message: any) {
        let messageObj: any;
        try {
            messageObj = JSON.parse(message.data);
        } catch (e) {
            const jsonString = await decompressString(message.data);
            messageObj = JSON.parse(jsonString);
        }
        determineDelay(messageObj, game);
        executeCommand(game, messageObj);
    };

    socket.onclose = function () {
        console.log("onclose");
        const textPosition1 = getCameraPosition(game);
        if (game.multiplayer.intentionalDisconnect) {
            pushStackPaintTextData(game.UI.stackTextsData, `Multiplayer Disconnected`, game.state.time);

            game.multiplayer.awaitingGameState.waiting = false;
            game.multiplayer.websocket = null;

            const myClientId = game.multiplayer.myClientId;
            for (let i = game.state.clientInfos.length - 1; i >= 0; i--) {
                if (game.state.clientInfos[i].id !== myClientId) {
                    game.state.clientInfos.splice(i, 1);
                }
            }
            game.multiplayer.intentionalDisconnect = false;
        } else {
            //reconenct
            setTimeout(() => {
                pushStackPaintTextData(game.UI.stackTextsData, `Disconnected, reconnecting...`, game.state.time);
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

function getMyClientIdentifier(game: Game): string | null {
    if (game.multiplayer.multiplayerIdentifier !== undefined) {
        return game.multiplayer.multiplayerIdentifier;
    } else {
        return localStorage.getItem('multiplayerIdentifier')
    }
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
