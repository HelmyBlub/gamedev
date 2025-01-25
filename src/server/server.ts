#!/usr/bin/env node
type Connection = {
    clientId: number,
    con: any,
    randomIdentifier: string
}

type LostConnection = {
    clientId: number,
    randomIdentifier: string
}

type Lobby = {
    connections: Connection[],
    lostConnections: LostConnection[],
    startTime: bigint,
    nextGameStateTo: Connection[],
}

const express = require('express');
const app = express();
const expressWs = require('express-ws')(app);
const port = 3000;
const updateInterval: number = 75;
const lobbys: Map<string, Lobby> = new Map<string, Lobby>();

let clientIdCounter = 0;

app.use(express.static('public'));

app.ws('/ws', function (ws: any, req: any) {
    const lobbyCode: string = req.query.lobbyCode;
    const currentLobby: Lobby = getLobby(lobbyCode);

    let clientName = req.query.clientName;
    if (clientName.length > 20) clientName = clientName.substring(0, 20);

    const connection: Connection = createConnectionObject(req.query.myId, currentLobby, ws);
    console.log(clientIdCounter + "#Con" + currentLobby.connections.length + " ClientName:" + clientName);

    ws.send(JSON.stringify({
        command: "connectInfo",
        clientId: connection.clientId,
        clientName: clientName,
        updateInterval: updateInterval,
        randomIdentifier: connection.randomIdentifier,
        numberConnections: currentLobby.connections.length
    }));
    if (currentLobby.connections.length > 0) {
        for (let i = 0; i < currentLobby.connections.length; i++) {
            if (i === 0) {
                currentLobby.connections[i].con.send(JSON.stringify({ command: "sendGameState", clientId: connection.clientId, clientName: clientName }));
                currentLobby.nextGameStateTo.push(connection);
            } else {
                currentLobby.connections[i].con.send(JSON.stringify({ command: "playerJoined", clientId: connection.clientId, clientName: clientName }));
            }
        }
    } else {
        const clientGameTime = req.query.myGameTime;
        console.log("set time");
        setCurrentMsBasedOnClientGameTime(clientGameTime, currentLobby);
        console.log("time set");
    }

    currentLobby.connections.push(connection);
    clientIdCounter++;

    ws.on('close', () => onConnectionClose(connection, lobbyCode));
    ws.on('message', (message: any) => onMessage(message, lobbyCode));
});

app.listen(port, () => {
    console.log(`GameDev started ${port}`);
});

function createConnectionObject(myIdentifier: string, lobby: Lobby, ws: any): Connection {
    let connection: Connection;
    const lostCon = findLostConnection(myIdentifier, lobby);
    if (lostCon) {
        connection = { clientId: lostCon.clientId, con: ws, randomIdentifier: lostCon.randomIdentifier };
        console.log("client reconnected " + lostCon.clientId);
    } else {
        const randomIdentifier = clientIdCounter + "_" + Math.random().toString();
        connection = { clientId: clientIdCounter, con: ws, randomIdentifier: randomIdentifier };
    }
    return connection;
}

function findLostConnection(myIdentifier: string, currentLobby: Lobby): LostConnection | null {
    if (myIdentifier) {
        const lostConIndex = currentLobby.lostConnections.findIndex((con) => con.randomIdentifier === myIdentifier);
        if (lostConIndex !== -1) {
            let lostCon = currentLobby.lostConnections[lostConIndex];
            currentLobby.lostConnections.splice(lostConIndex, 1);
            return lostCon;
        }
    }
    return null;
}

function getLobby(lobbyCode: string): Lobby {
    let currentLobby;
    if (lobbys.has(lobbyCode)) {
        currentLobby = lobbys.get(lobbyCode)!;
    } else {
        currentLobby = {
            connections: [],
            lostConnections: [],
            startTime: process.hrtime.bigint(),
            nextGameStateTo: [],
        }
        lobbys.set(lobbyCode, currentLobby);
        console.log("new lobby created, lobbyCounter:" + lobbys.size);
    }
    return currentLobby;
}

function onConnectionClose(connection: { clientId: number, con: any, randomIdentifier: string }, lobbyCode: string) {
    console.log(connection.clientId + " disconnected");
    const currentLobby: Lobby = lobbys.get(lobbyCode)!;
    currentLobby.lostConnections.push({ clientId: connection.clientId, randomIdentifier: connection.randomIdentifier });
    let clientId = -1;

    for (let i = 0; i < currentLobby.connections.length; i++) {
        if (currentLobby.connections[i].con === connection.con) {
            clientId = currentLobby.connections[i].clientId;
            currentLobby.connections.splice(i, 1);
            break;
        }
    }
    for (let i = 0; i < currentLobby.connections.length; i++) {
        currentLobby.connections[i].con.send(JSON.stringify({ command: "playerLeft", clientId: clientId }));
    }
    if (currentLobby.connections.length === 0) {
        lobbys.delete(lobbyCode);
        console.log("empty lobby removed, lobbyCounter:" + lobbys.size);
    }
}

function onMessage(message: any, lobbyCode: string) {
    const currentLobby: Lobby = lobbys.get(lobbyCode)!;
    try {
        const data = JSON.parse(message);
        if (data.command === "playerInput" || data.command === "restart") {
            const currentMs = getCurrentMS(currentLobby);
            if (data.executeTime === undefined || data.executeTime < currentMs) {
                data.executeTime = currentMs;
            }
            message = JSON.stringify(data);
        }
        if (data.command === "gameState" && data.toId !== undefined) {
            currentLobby.connections.find((e) => e.clientId === data.toId)?.con.send(message);
        } else {
            currentLobby.connections.forEach(function (destination: any) {
                destination.con.send(message);
            });
        }
        if (data.command === "restart") {
            currentLobby.startTime = process.hrtime.bigint();
        }
    }
    catch (e) {
        //assume compressed
        let stateForCon = currentLobby.nextGameStateTo.shift();
        if (stateForCon) {
            stateForCon.con.send(message);
        }
    }
}

function getCurrentMS(lobby: Lobby) {
    return Number(process.hrtime.bigint() - lobby.startTime) / 1000000;
}

function setCurrentMsBasedOnClientGameTime(clientGameTime: number, lobby: Lobby) {
    lobby.startTime = process.hrtime.bigint() - BigInt(clientGameTime) * BigInt(1000000);
}

function gameTimeTicker() {
    lobbys.forEach((lobby) => {
        const currentTime = getCurrentMS(lobby);
        lobby.connections.forEach(function (destination: any) {
            destination.con.send(JSON.stringify({ command: "timeUpdate", time: currentTime }));
        });
    });
    setTimeout(gameTimeTicker, updateInterval);
}
gameTimeTicker();
