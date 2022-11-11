type KeysPressed = {
    a: boolean,
    s: boolean,
    d: boolean,
    w: boolean
}

function keyDown(event: KeyboardEvent){
    var name = event.key;
    switch(name){
        case "a":
            gameData.keysPressed.a = true;
            break;
        case "s":
            gameData.keysPressed.s = true;
            break;
        case "d":
            gameData.keysPressed.d = true;
            break;
        case "w":
            gameData.keysPressed.w = true;
            break;
        case "r":
            gameRestart();
            break;
        default:
            console.log(`Key pressed ${name}`, event);            
    }
}

function keyUp(event: KeyboardEvent){
    var name = event.key;
    switch(name){
        case "a":
            gameData.keysPressed.a = false;
            break;
        case "s":
            gameData.keysPressed.s = false;
            break;
        case "d":
            gameData.keysPressed.d = false;
            break;
        case "w":
            gameData.keysPressed.w = false;
            break;
    }
}