
function websocketConnect() {
    //var url = "ws://" + document.URL.substr(7).split('/')[0];
    var url = "ws://localhost:8080/";
    let socket = new WebSocket(url, 'gamedev');

    socket.onopen = function (e) {
        console.log("websocket open");
        gameData.multiplayer.websocket = socket;
    };

    socket.onmessage = function (message: any) {
        websocketMessage(JSON.parse(message.data));
    };
    socket.onclose = function () {
        console.log("onclose");
        gameData.multiplayer.websocket = null;
    };
    socket.onerror = function (error) {
        console.log("weboscket error", error);
    };
}