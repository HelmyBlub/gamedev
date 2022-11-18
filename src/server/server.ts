#!/usr/bin/env node
 var WebSocketServer = require('websocket').server;
 var http = require('http');
 
 var server = http.createServer(function(request: any, response: any) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});

server.listen(8080, function() {
    console.log((new Date()) + ' Server is listening on port 8080');
});

 var wsServer = new WebSocketServer({
     httpServer: server,
     autoAcceptConnections: false
 });
 
 var connections: any = [];
 
 wsServer.on('request', function(request: any) {
    var connection = request.accept('gamedev', request.origin);
     connections.push(connection);
 
     console.log(connection.remoteAddress + "#Con" + connections.length);
     
     // Send all the existing canvas commands to the new client
     connection.sendUTF(JSON.stringify({
         msg: "initCommands",
         data: "hello world"
     }));
     
     // Handle closed connections
     connection.on('close', function() {
         console.log(connection.remoteAddress + " disconnected");
         
         var index = connections.indexOf(connection);
         if (index !== -1) {
             // remove the connection from the pool
             connections.splice(index, 1);
         }
     });
     
     // Handle incoming messages
     connection.on('message', function(message: any) {
         if (message.type === 'utf8') {
             try {
                 connections.forEach(function(destination: any) {
                    console.log("message send");
                    destination.sendUTF(message.utf8Data);
                 });
             }
             catch(e) {
                 // do nothing if there's an error.
                 console.log("message send error");
             }
         }else{
            console.log("wrong type:" + message.type);
         }
     });
 });
 

 console.log("Whiteboard test app ready");
 