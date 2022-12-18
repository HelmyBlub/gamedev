import { executeCommand } from "./commands.js";
import { Game } from "./gameModel.js";

export function websocketConnect(game: Game) {
    const protocol = window.location.protocol === "http:" ? "ws" : "wss";

    const url = `${protocol}://${window.location.host}/ws`;
    const socket = new WebSocket(url, 'gamedev');

    socket.onopen = function (e) {
        console.log("websocket open");
        game.multiplayer.websocket = socket;
    };

    socket.onmessage = function (message: any) {
        const messageObj = JSON.parse(message.data);
        determineDelay(messageObj, game);
        executeCommand(game, messageObj);
    };

    socket.onclose = function () {
        console.log("onclose");
        game.multiplayer.websocket = null;
    };

    socket.onerror = function (error) {
        console.log("weboscket error", error);
    };
}

export function sendMultiplayer(data: any, game: Game) {
    if (data.command === "playerInput" && data.clientId === game.multiplayer.myClientId) {
        game.multiplayer.lastSendTime.push(performance.now());
    }
    game.multiplayer.websocket!.send(JSON.stringify(data));
}

function determineDelay(messageObj: any, game: Game) {
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
        let delayDiff = game.multiplayer.delay - game.multiplayer.minDelay!;
    }
}
