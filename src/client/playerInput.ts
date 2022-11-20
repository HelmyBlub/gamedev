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

function playerInputChangeEvent(event: KeyboardEvent, game:Game) {
    const keycode = event.code;
    const isKeydown = event.type === "keydown" ? true : false;

    for (let i = 0; i < game.clientKeyBindings.length; i++) {
        let action = game.clientKeyBindings[i].keyCodeToActionPressed.get(keycode);
        if (action !== undefined && game.clientKeyBindings[i].playerIndex < game.state.players.length) {
            const playerIndex = game.clientKeyBindings[i].playerIndex;
            if (game.multiplayer.websocket === null) {
                playerAction(playerIndex, action, isKeydown, game.state);
            } else {
                game.multiplayer.websocket.send(JSON.stringify(
                    {
                        command: "playerInput",
                        data: {playerIndex: playerIndex, action: action, isKeydown: isKeydown },
                    }
                ));
            }
        }
    }
}

function playerAction(playerIndex: number, action: keyof ActionsPressed, isKeydown: boolean, state: GameState) {
    const player = state.players[playerIndex];
    if (action !== undefined) {
        player.actionsPressed[action] = isKeydown;
        determinePlayerMoveDirection(state.characters[player.playerCharacterIndex], player.actionsPressed);
    }
}

function keyDown(event: KeyboardEvent, game: Game) {
    playerInputChangeEvent(event, game);

    switch (event.code) {
        case "KeyR":
            if (game.multiplayer.websocket === null) {
                gameRestart(game);
            } else {
                game.multiplayer.websocket.send(JSON.stringify({ command: "restart" }));
            }
            break;
        default:
            break;
    }
}

function keyUp(event: KeyboardEvent, game: Game) {
    playerInputChangeEvent(event, game);
}