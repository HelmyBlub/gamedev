
function websocketConnect(game: Game) {
    //var url = "ws://" + document.URL.substr(7).split('/')[0];
    var url = "ws://localhost:8080/"; //TODO should not be static
    let socket = new WebSocket(url, 'gamedev');

    socket.onopen = function (e) {
        console.log("websocket open");
        game.multiplayer.websocket = socket;
    };

    socket.onmessage = function (message: any) {
        websocketMessage(game, JSON.parse(message.data));
    };
    socket.onclose = function () {
        console.log("onclose");
        game.multiplayer.websocket = null;
    };
    socket.onerror = function (error) {
        console.log("weboscket error", error);
    };
}

function websocketMessage(game: Game, data: any) {
    const command = data.command;
    switch (command) {
        case "restart":
            gameRestart(game);
            break;
        case "playerInput":
            game.state.playerInputs.push(data);
            break;
        case "sendGameState":
            game.state.clientIds.push(data.clientId);
            game.multiplayer.websocket!.send(JSON.stringify({ command: "gameState", data: game.state }));
            break;
        case "gameState":
            game.state = data.data;
            game.realStartTime = performance.now() - game.state.time;
            for (let i = 0; i < game.state.clientIds.length; i++) {
                if (game.multiplayer.myClientId === game.state.clientIds[i]) {
                    game.clientKeyBindings = [{
                        playerIndex: i,
                        keyCodeToActionPressed: createDefaultKeyBindings1()
                    }];
                }
            }
            break;
        case "connectInfo":
            game.multiplayer.myClientId = data.clientId;
            game.state.clientIds = [data.clientId];
            break;
        case "playerLeft":
            break;
        case "timeUpdate":
            game.multiplayer.serverGameTime = data.time;
            break;
        default:
            console.log("unkown command: " + command, data);
    }
}
