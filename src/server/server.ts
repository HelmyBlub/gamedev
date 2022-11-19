#!/usr/bin/env node
var WebSocketServer = require('websocket').server;
var http = require('http');

var server = http.createServer(function (request: any, response: any) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});

server.listen(8080, function () {
    console.log((new Date()) + ' Server is listening on port 8080');
});

var wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

var connections: any = [];

wsServer.on('request', function (request: any) {
    var connection = request.accept('gamedev', request.origin);

    for (let i = 0; i < connections.length; i++) {
        if(i === 0){
            connections[i].sendUTF(JSON.stringify({ command: "sendGameState" }));
        }else{
            connections[i].sendUTF(JSON.stringify({ command: "playerJoined" }));
        }
    }

    connections.push(connection);

    console.log(connection.remoteAddress + "#Con" + connections.length);

    // Handle closed connections
    connection.on('close', function () {
        console.log(connection.remoteAddress + " disconnected");

        var index = connections.indexOf(connection);
        if (index !== -1) {
            // remove the connection from the pool
            connections.splice(index, 1);
        }
        for (let i = 0; i < connections.length; i++) {
            connections[i].sendUTF(JSON.stringify({ command: "playerLeft" }));
        }
    });

    // Handle incoming messages
    connection.on('message', function (message: any) {
        if (message.type === 'utf8') {
            try {
                connections.forEach(function (destination: any) {
                    destination.sendUTF(message.utf8Data);
                });
            }
            catch (e) {
                console.log("message send error" + e);
            }
        } else {
            console.log("wrong type:" + message.type);
        }
    });
});


console.log("Whiteboard test app ready");
