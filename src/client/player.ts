type Player = {
    playerCharacterIndex: number,
    actionsPressed: ActionsPressed,
}

function createPlayer(characterIndex: number) {
    return {
        playerCharacterIndex: characterIndex,
        actionsPressed: createActionsPressed(),
    }
}

function createDefaultKeyBindings1() {
    let keyBindings = new Map<string, keyof ActionsPressed>();
    keyBindings.set("KeyA", "left");
    keyBindings.set("KeyS", "down");
    keyBindings.set("KeyD", "right");
    keyBindings.set("KeyW", "up");

    return keyBindings;
}

function createDefaultKeyBindings2() {
    let keyBindings = new Map<string, keyof ActionsPressed>();
    keyBindings.set("ArrowLeft", "left");
    keyBindings.set("ArrowDown", "down");
    keyBindings.set("ArrowRight", "right");
    keyBindings.set("ArrowUp", "up");

    return keyBindings;
}