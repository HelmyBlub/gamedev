type ActionsPressed = {
    left: boolean,
    down: boolean,
    right: boolean,
    up: boolean
}


type PlayerInput = {
    executeTime: number,
    command: string,
    data: any
}

function createActionsPressed() {
    return {
        left: false,
        down: false,
        right: false,
        up: false
    }
}

function determinePlayerMoveDirection(player: Character, actionsPressed: ActionsPressed) {
    player.isMoving = true;
    if (actionsPressed.left && !actionsPressed.up) {
        if (!actionsPressed.down) {
            player.moveDirection = Math.PI;
        } else {
            player.moveDirection = Math.PI * 0.75;
        }
    } else if (actionsPressed.down) {
        if (!actionsPressed.right) {
            player.moveDirection = Math.PI * 0.5;
        } else {
            player.moveDirection = Math.PI * 0.25;
        }
    } else if (actionsPressed.right) {
        if (!actionsPressed.up) {
            player.moveDirection = 0;
        } else {
            player.moveDirection = Math.PI * 1.75;
        }
    } else if (actionsPressed.up) {
        if (!actionsPressed.left) {
            player.moveDirection = Math.PI * 1.5;
        } else {
            player.moveDirection = Math.PI * 1.25;
        }
    } else {
        player.isMoving = false;
    }
}

function websocketMessage(data: any) {
    const command = data.command;
    switch (command) {
        case "restart":
            gameRestart(gameData);
            break;
        case "playerInput":
            gameData.state.playerInputs.push(data);
            break;
        case "sendGameState":
            gameData.state.clientIds.push(data.clientId);
            gameData.multiplayer.websocket!.send(JSON.stringify({ command: "gameState", data: gameData.state }));
            break;
        case "gameState":
            gameData.state = data.data;
            gameData.realStartTime = performance.now() - gameData.state.time;
            for (let i = 0; i < gameData.state.clientIds.length; i++) {
                if (gameData.multiplayer.myClientId === gameData.state.clientIds[i]) {
                    gameData.clientKeyBindings = [{
                        playerIndex: i,
                        keyCodeToActionPressed: createDefaultKeyBindings1()
                    }];
                }
            }           
            break;
        case "connectInfo":
            gameData.multiplayer.myClientId = data.clientId;
            gameData.state.clientIds = [data.clientId];
            break;
        case "playerLeft":
            break;
        case "timeUpdate":
            gameData.multiplayer.serverGameTime = data.time;
            break;
        default:
            console.log("unkown command: " + command, data);
    }
}

function playerInputChangeEvent(event: KeyboardEvent) {
    const keycode = event.code;
    const isKeydown = event.type === "keydown" ? true : false;

    for (let i = 0; i < gameData.clientKeyBindings.length; i++) {
        let action = gameData.clientKeyBindings[i].keyCodeToActionPressed.get(keycode);
        if (action !== undefined && gameData.clientKeyBindings[i].playerIndex < gameData.state.players.length) {
            const playerIndex = gameData.clientKeyBindings[i].playerIndex;
            if (gameData.multiplayer.websocket === null) {
                playerAction(playerIndex, action, isKeydown);
            } else {
                gameData.multiplayer.websocket.send(JSON.stringify(
                    {
                        command: "playerInput",
                        data: {playerIndex: playerIndex, action: action, isKeydown: isKeydown },
                    }
                ));
            }
        }
    }
}

function playerAction(playerIndex: number, action: keyof ActionsPressed, isKeydown: boolean) {
    const player = gameData.state.players[playerIndex];
    if (action !== undefined) {
        player.actionsPressed[action] = isKeydown;
        determinePlayerMoveDirection(gameData.state.characters[player.playerCharacterIndex], player.actionsPressed);
    }
}

function keyDown(event: KeyboardEvent) {
    playerInputChangeEvent(event);

    switch (event.code) {
        case "KeyR":
            if (gameData.multiplayer.websocket === null) {
                gameRestart(gameData);
            } else {
                gameData.multiplayer.websocket.send(JSON.stringify({ command: "restart" }));
            }
            break;
        default:
            break;
    }
}

function keyUp(event: KeyboardEvent) {
    playerInputChangeEvent(event);
}