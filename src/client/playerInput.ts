type MoveActions = {
    left: boolean,
    down: boolean,
    right: boolean,
    up: boolean
}

type UpgradeActions = {
    upgrade1: boolean,
    upgrade2: boolean,
    upgrade3: boolean,
}

type ActionsPressed = {
    moveActions:MoveActions,
    upgradeActions:UpgradeActions,
}

type PlayerInput = {
    executeTime: number,
    command: string,
    data: any
}

function createActionsPressed() {
    return {
        moveActions:{
            left: false,
            down: false,
            right: false,
            up: false,
        },
        upgradeActions:{
            upgrade1: false,
            upgrade2: false,
            upgrade3: false,
        }
    }
}

function determinePlayerMoveDirection(player: Character, actionsPressed: ActionsPressed) {
    player.isMoving = true;
    if (actionsPressed.moveActions.left && !actionsPressed.moveActions.up) {
        if (!actionsPressed.moveActions.down) {
            player.moveDirection = Math.PI;
        } else {
            player.moveDirection = Math.PI * 0.75;
        }
    } else if (actionsPressed.moveActions.down) {
        if (!actionsPressed.moveActions.right) {
            player.moveDirection = Math.PI * 0.5;
        } else {
            player.moveDirection = Math.PI * 0.25;
        }
    } else if (actionsPressed.moveActions.right) {
        if (!actionsPressed.moveActions.up) {
            player.moveDirection = 0;
        } else {
            player.moveDirection = Math.PI * 1.75;
        }
    } else if (actionsPressed.moveActions.up) {
        if (!actionsPressed.moveActions.left) {
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
                playerAction(playerIndex, action, isKeydown, game);
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

function playerAction(playerIndex: number, action: keyof MoveActions | keyof UpgradeActions, isKeydown: boolean, game: Game) {
    const player = game.state.players[playerIndex];
    if (action !== undefined) {
        if(Object.keys({left:1, right:1, up:1, down:1}).indexOf(action) !== -1){
            player.actionsPressed.moveActions[action] = isKeydown;
            determinePlayerMoveDirection(game.state.characters[player.playerCharacterIndex], player.actionsPressed);
        }else if(isKeydown){
            upgradeLevelingCharacter(game.state.characters[player.playerCharacterIndex], action, game.avaialbleUpgrades, game.state);
        }
    }
}

function upgradeLevelingCharacter(character: LevelingCharacter, action: keyof UpgradeActions, upgradeOptions: Map<string, UpgradeOption>, state: GameState){
    if(character.availableSkillPoints > 0){
        switch(action){
            case "upgrade1":
                upgradeOptions.get(character.upgradeOptions[0].name)?.upgrade(character);
                break;
            case "upgrade2":
                upgradeOptions.get(character.upgradeOptions[1].name)?.upgrade(character);
                break;
            case "upgrade3":
                upgradeOptions.get(character.upgradeOptions[2].name)?.upgrade(character);
                break;
        }
        character.availableSkillPoints--;
        character.upgradeOptions = [];
        if(character.availableSkillPoints > 0){
            fillRandomUpgradeOptions(character, state, upgradeOptions);
        }
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