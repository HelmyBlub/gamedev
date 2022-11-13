type Player = {
    playerCharacterIndex: number,
    actionsPressed: ActionsPressed,
    keyCodeToActionPressed: Map<string, keyof ActionsPressed>,
}

function createPlayer(characterIndex: number, keyCodeToActionPressed: Map<string, keyof ActionsPressed>){
    return {
        playerCharacterIndex: characterIndex,
        actionsPressed: createActionsPressed(),
        keyCodeToActionPressed: keyCodeToActionPressed,
    }
}

function createDefaultKeyBindings1(){
    let keyBindings = new Map<string, keyof ActionsPressed>();
    keyBindings.set("KeyA", "left");
    keyBindings.set("KeyS", "down");
    keyBindings.set("KeyD", "right");
    keyBindings.set("KeyW", "up");

    return keyBindings;
}

function createDefaultKeyBindings2(){
    let keyBindings = new Map<string, keyof ActionsPressed>();
    keyBindings.set("ArrowLeft", "left");
    keyBindings.set("ArrowDown", "down");
    keyBindings.set("ArrowRight", "right");
    keyBindings.set("ArrowUp", "up");

    return keyBindings;
}