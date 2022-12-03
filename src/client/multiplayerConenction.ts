
function websocketConnect(game: Game) {
    const protocol = window.location.protocol === "http:"? "ws" : "wss";
    
    const url = `${protocol}://${window.location.host}/ws`;
    const socket = new WebSocket(url, 'gamedev');

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
