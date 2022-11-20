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

var connections: {clientId: number, con: any}[] = [];
var clientIdCounter = 0;
var startTime = process.hrtime.bigint();

wsServer.on('request', function (request: any) {
    var connection = request.accept('gamedev', request.origin);
    connection.sendUTF(JSON.stringify({ command: "connectInfo", clientId: clientIdCounter}));

    if(connections.length > 0){
        connections[0].con.sendUTF(JSON.stringify({ command: "sendGameState", clientId: clientIdCounter}));
    }

    connections.push({clientId: clientIdCounter, con:connection});
    clientIdCounter++;

    console.log(connection.remoteAddress + "#Con" + connections.length);

    // Handle closed connections
    connection.on('close', function () {
        console.log(connection.remoteAddress + " disconnected");


        for(let i = 0; i< connections.length; i++){
            if(connections[i].con === connection){
                connections.splice(i, 1);
                break;
            }
        }
        for (let i = 0; i < connections.length; i++) {
            connections[i].con.sendUTF(JSON.stringify({ command: "playerLeft", clientId: connection.clientId}));
        }
    });

    // Handle incoming messages
    connection.on('message', function (message: any) {
        if (message.type === 'utf8') {
            try {
                const command = JSON.parse(message.utf8Data).command;
                if(command === "restart"){
                    startTime = process.hrtime.bigint();
                }else if(command === "playerInput"){
                    const data = JSON.parse(message.utf8Data);
                    data.executeTime = getCurrentMS();
                    message.utf8Data = JSON.stringify(data);
                }
                connections.forEach(function (destination: any) {
                    destination.con.sendUTF(message.utf8Data);
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

function getCurrentMS(){
    return Number(process.hrtime.bigint() - startTime) / 1000000;
}

function gameTimeTicker(){
    const currentTime = getCurrentMS();
    connections.forEach(function (destination: any) {
        destination.con.sendUTF(JSON.stringify({command:"timeUpdate", time: currentTime}));
    });
    setTimeout(gameTimeTicker,16);
}
gameTimeTicker();

//asd
console.log("gamedev backend ready");
