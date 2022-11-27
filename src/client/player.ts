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
    let keyBindings = new Map<string, string>();
    keyBindings.set("KeyA", "left");
    keyBindings.set("KeyS", "down");
    keyBindings.set("KeyD", "right");
    keyBindings.set("KeyW", "up");

    keyBindings.set("Digit1", "upgrade1");
    keyBindings.set("Digit2", "upgrade2");
    keyBindings.set("Digit3", "upgrade3");
    return keyBindings;
}

function createDefaultKeyBindings2() {
    let keyBindings = new Map<string, string>();
    keyBindings.set("ArrowLeft", "left");
    keyBindings.set("ArrowDown", "down");
    keyBindings.set("ArrowRight", "right");
    keyBindings.set("ArrowUp", "up");
    return keyBindings;
}

function addPlayer(characters: Character[], players: Player[], x: number, y: number) {
    characters.push(createPlayerCharacter(x, y));
    players.push(createPlayer(characters.length - 1));
}

function gameInitPlayers(game: Game){
    let numberPlayers = Math.max(game.state.clientIds.length, 1);
    for (let i = 0; i < numberPlayers; i++) {
        addPlayer(game.state.characters, game.state.players, 100, 100 + i * 50);
        if (game.multiplayer.myClientId === -1 || game.multiplayer.myClientId === game.state.clientIds[i]) {
            game.clientKeyBindings.push({
                playerIndex: i,
                keyCodeToActionPressed: createDefaultKeyBindings1()
            });
        }
    }
}
