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
            gameData.multiplayer.websocket!.send(JSON.stringify({command: "gameState", data: gameData.state}));
            break;
        case "gameState":
            gameData.state = data.data;
            gameData.realStartTime = performance.now() - gameData.state.time;
            break;
        default:
            console.log("unkown command" + command, data);
    }
}

function playerInputChangeEvent(event: KeyboardEvent) {
    const keycode = event.code;
    const isKeydown = event.type === "keydown" ? true : false;
    if (gameData.multiplayer.websocket === null) {
        playerInputChange(keycode, isKeydown);
    } else {
        gameData.multiplayer.websocket.send(JSON.stringify(
            {
                command: "playerInput",
                data: { keycode: keycode, isKeydown: isKeydown },
                executeTime: gameData.state.time + 100
            }
        ));
    }
}

function playerInputChange(keycode: string, isKeydown: boolean) {
    let players = gameData.players;
    for (let i = 0; i < players.length; i++) {
        let action = players[i].keyCodeToActionPressed.get(keycode);
        if (action !== undefined) {
            players[i].actionsPressed[action] = isKeydown;
            determinePlayerMoveDirection(gameData.state.characters[players[i].playerCharacterIndex], players[i].actionsPressed);
        }
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