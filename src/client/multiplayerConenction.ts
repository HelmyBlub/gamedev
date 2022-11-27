
function websocketConnect(game: Game) {
    //var url = "ws://" + document.URL.substr(7).split('/')[0];
    var url = "ws://localhost:8080/"; //TODO should not be static
    let socket = new WebSocket(url, 'gamedev');

    socket.onopen = function (e) {
        console.log("websocket open");
        game.multiplayer.websocket = socket;
    };

    socket.onmessage = function (message: any) {
        executeCommand(game, JSON.parse(message.data));
    };
    socket.onclose = function () {
        console.log("onclose");
        game.multiplayer.websocket = null;
    };
    socket.onerror = function (error) {
        console.log("weboscket error", error);
    };
}
