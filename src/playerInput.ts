type ActionsPressed = {
    left: boolean,
    down: boolean,
    right: boolean,
    up: boolean
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

function keyDown(event: KeyboardEvent){
    var name = event.key;
    switch(name){
        case "a":
            gameData.actionsPressed.left = true;
            break;
        case "s":
            gameData.actionsPressed.down = true;
            break;
        case "d":
            gameData.actionsPressed.right = true;
            break;
        case "w":
            gameData.actionsPressed.up = true;
            break;
        case "r":
            gameRestart(gameData);
            break;
        default:
            console.log(`Key pressed ${name}`, event);            
    }
    determinePlayerMoveDirection(gameData.characters[gameData.playerCharacterIndex],gameData.actionsPressed);
}

function keyUp(event: KeyboardEvent){
    var name = event.key;
    switch(name){
        case "a":
            gameData.actionsPressed.left = false;
            break;
        case "s":
            gameData.actionsPressed.down = false;
            break;
        case "d":
            gameData.actionsPressed.right = false;
            break;
        case "w":
            gameData.actionsPressed.up = false;
            break;
    }
    determinePlayerMoveDirection(gameData.characters[gameData.playerCharacterIndex],gameData.actionsPressed);
}