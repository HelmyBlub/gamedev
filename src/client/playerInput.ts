type ActionsPressed = {
    left: boolean,
    down: boolean,
    right: boolean,
    up: boolean
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

function playerInputChange(event: KeyboardEvent) {
    const keycode = event.code;
    const isKeydown = event.type === "keydown" ? true : false;

    let players = gameData.players;
    for (let i = 0; i < players.length; i++) {
        let action = players[i].keyCodeToActionPressed.get(keycode);
        if (action !== undefined) {
            players[i].actionsPressed[action] = isKeydown;
            determinePlayerMoveDirection(gameData.characters[players[i].playerCharacterIndex], players[i].actionsPressed);
        }
    }
}

function keyDown(event: KeyboardEvent) {
    playerInputChange(event);

    switch (event.code) {
        case "KeyR":
            gameRestart(gameData);
            break;
        default:
            break;
    }
}

function keyUp(event: KeyboardEvent) {
    playerInputChange(event);
}