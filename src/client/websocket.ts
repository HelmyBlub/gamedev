
function websocketConnect() {
    //var url = "ws://" + document.URL.substr(7).split('/')[0];
    var url = "ws://localhost:8080/";
    let socket = new WebSocket(url, 'gamedev');

    socket.onopen = function (e) {
        console.log("websocket open");
        socket.send("My name is John");
    };

    socket.onmessage = function (message) {
        console.log("onmessage", message);
    };
    socket.onclose = function () {
        console.log("onclose");
    };
    socket.onerror = function (error) {
        console.log("weboscket error", error);
    };
}