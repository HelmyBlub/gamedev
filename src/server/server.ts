#!/usr/bin/env node
const express = require('express');
const app = express();
const expressWs = require('express-ws')(app);
const port = 8080;
const connections: { clientId: number, con: any }[] = [];
const updateInterval: number = 80;
let clientIdCounter = 0;
let startTime = process.hrtime.bigint();

app.use(express.static('public'));

app.ws('/ws', function(ws:any, req:any) {
    ws.send(JSON.stringify({ command: "connectInfo", clientId: clientIdCounter, updateInterval: updateInterval}));

    if (connections.length > 0) {
        connections[0].con.send(JSON.stringify({ command: "sendGameState", clientId: clientIdCounter}));
    }

    connections.push({ clientId: clientIdCounter, con: ws });
    clientIdCounter++;
    console.log(clientIdCounter + "#Con" + connections.length);

    ws.on('close', () => onConnectionClose(ws));
    ws.on('message', onMessage);
});

app.listen(port, () => {
    console.log(`GameDev started ${port}`);
});

function onConnectionClose(connection: any) {
    console.log(connection.remoteAddress + " disconnected");
    let clientId = -1;

    for (let i = 0; i < connections.length; i++) {
        if (connections[i].con === connection) {
            clientId = connections[i].clientId;
            connections.splice(i, 1);
            break;
        }
    }
    for (let i = 0; i < connections.length; i++) {
        connections[i].con.send(JSON.stringify({ command: "playerLeft", clientId: clientId }));
    }
}

function onMessage(message: any) {
    try {
        const command = JSON.parse(message).command;
        if (command === "restart") {
            startTime = process.hrtime.bigint();
        } else if (command === "playerInput") {
            const data = JSON.parse(message);
            data.executeTime = getCurrentMS();
            message = JSON.stringify(data);
        }
        connections.forEach(function (destination: any) {
            destination.con.send(message);
        });
    }
    catch (e) {
        console.log("message send error: " + e);
    }
}

function getCurrentMS() {
    return Number(process.hrtime.bigint() - startTime) / 1000000;
}

function gameTimeTicker() {
    const currentTime = getCurrentMS();
    connections.forEach(function (destination: any) {
        destination.con.send(JSON.stringify({ command: "timeUpdate", time: currentTime }));
    });
    setTimeout(gameTimeTicker, updateInterval);
}
gameTimeTicker();
