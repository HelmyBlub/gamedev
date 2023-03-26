#!/usr/bin/env node
const express = require('express');
const app = express();
const expressWs = require('express-ws')(app);
const port = 8080;
const connections: { clientId: number, con: any, randomIdentifier: string }[] = [];
const lostConnections: { clientId: number, randomIdentifier: string }[] = [];
const updateInterval: number = 100;
let clientIdCounter = 0;
let startTime = process.hrtime.bigint();

app.use(express.static('public'));

app.ws('/ws', function (ws: any, req: any) {
    let myIdentifier = req.query.myId;
    let clientName = req.query.clientName;
    let clientGameTime = req.query.myGameTime;
    let randomIdentifier = clientIdCounter + "_" + Math.random().toString();
    let connection = { clientId: clientIdCounter, con: ws, randomIdentifier: randomIdentifier };

    if (myIdentifier) {
        let lostConIndex = lostConnections.findIndex((con) => con.randomIdentifier === myIdentifier);
        if (lostConIndex !== -1) {
            let lostCon = lostConnections[lostConIndex];
            connection = { clientId: lostCon.clientId, con: ws, randomIdentifier: lostCon.randomIdentifier };
            lostConnections.splice(lostConIndex, 1);
            console.log("client reconnected " + lostCon.clientId);
        } else {
            console.log("unknown lastIdentifier " + myIdentifier);
        }
    }
    console.log(clientIdCounter + "#Con" + connections.length + " ClientName:" + clientName);

    ws.send(JSON.stringify({ command: "connectInfo", clientId: connection.clientId, clientName: clientName, updateInterval: updateInterval, randomIdentifier: connection.randomIdentifier, numberConnections: connections.length }));
    if(connections.length > 0){
        for(let i = 0; i < connections.length; i++){
            if(i === 0){
                connections[i].con.send(JSON.stringify({ command: "sendGameState", clientId: connection.clientId, clientName: clientName }));
            }else{
                connections[i].con.send(JSON.stringify({ command: "playerJoined", clientId: connection.clientId, clientName: clientName }));
            }
        }
    }else{
        setCurrentMsBasedOnClientGameTime(clientGameTime);
    }

    connections.push(connection);
    clientIdCounter++;

    ws.on('close', () => onConnectionClose(connection));
    ws.on('message', onMessage);
});

app.listen(port, () => {
    console.log(`GameDev started ${port}`);
});

function onConnectionClose(connection: { clientId: number, con: any, randomIdentifier: string }) {
    console.log(connection.clientId + " disconnected", connection.randomIdentifier);
    lostConnections.push({ clientId: connection.clientId, randomIdentifier: connection.randomIdentifier });
    let clientId = -1;

    for (let i = 0; i < connections.length; i++) {
        if (connections[i].con === connection.con) {
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
        const data = JSON.parse(message);
        if (data.command === "playerInput" || data.command === "restart") {
            const currentMs = getCurrentMS();
            if (data.executeTime === undefined || data.executeTime < currentMs) {
                data.executeTime = currentMs;
            }
            message = JSON.stringify(data);
        }
        if(data.command === "gameState" && data.toId !== undefined){
            connections.find((e) => e.clientId === data.toId)?.con.send(message);
        }else{
            connections.forEach(function (destination: any) {
                destination.con.send(message);
            });            
        }
        if (data.command === "restart") {
            startTime = process.hrtime.bigint();
        }
    }
    catch (e) {
        console.log("message send error: " + e);
    }
}

function getCurrentMS() {
    return Number(process.hrtime.bigint() - startTime) / 1000000;
}

function setCurrentMsBasedOnClientGameTime(clientGameTime: number){
    startTime = process.hrtime.bigint() - BigInt(clientGameTime) * BigInt(1000000);
}

function gameTimeTicker() {
    const currentTime = getCurrentMS();
    connections.forEach(function (destination: any) {
        destination.con.send(JSON.stringify({ command: "timeUpdate", time: currentTime }));
    });
    setTimeout(gameTimeTicker, updateInterval);
}
gameTimeTicker();
