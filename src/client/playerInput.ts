const MOVE_ACTIONS = ["left", "down", "right", "up"];
const UPGRADE_ACTIONS = ["upgrade1", "upgrade2", "upgrade3"];

type ActionsPressed = {
    [key: string]: boolean;
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
        up: false,
        upgrade1: false,
        upgrade2: false,
        upgrade3: false,
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
            handleCommand(game, {
                command: "playerInput",
                data: {playerIndex: playerIndex, action: action, isKeydown: isKeydown },
            });
        }
    }
}

function playerAction(playerIndex: number, action: string, isKeydown: boolean, game: Game) {
    const player = game.state.players[playerIndex];
    if (action !== undefined) {
        if(MOVE_ACTIONS.indexOf(action) !== -1){
            player.actionsPressed[action] = isKeydown;
            determinePlayerMoveDirection(game.state.characters[player.playerCharacterIndex], player.actionsPressed);
        }else if(UPGRADE_ACTIONS.indexOf(action) !== -1){
            if(isKeydown){
                upgradeLevelingCharacter(game.state.characters[player.playerCharacterIndex] as LevelingCharacter, action, game.avaialbleUpgrades, game.state);
            }
        }
    }
}

function upgradeLevelingCharacter(character: LevelingCharacter, action: string, upgradeOptions: Map<string, UpgradeOption>, state: GameState){
    if(character.availableSkillPoints > 0){
        let index = UPGRADE_ACTIONS.indexOf(action);
        upgradeOptions.get(character.upgradeOptions[index].name)?.upgrade(character);
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
            handleCommand(game, { command: "restart" });
            break;
        default:
            break;
    }
}

function keyUp(event: KeyboardEvent, game: Game) {
    playerInputChangeEvent(event, game);
}

function tickPlayerInputs(playerInputs: PlayerInput[], currentTime: number, game: Game) {
    for (let i = playerInputs.length - 1; i >= 0; i--) {
        if (playerInputs[i].executeTime <= currentTime) {
            if (playerInputs[i].command === "playerInput") {
                if (playerInputs[i].executeTime <= currentTime - 16) {
                    console.log("playerAction to late", currentTime - playerInputs[i].executeTime, playerInputs[i]);
                }
                playerAction(playerInputs[i].data.playerIndex, playerInputs[i].data.action, playerInputs[i].data.isKeydown, game);
                playerInputs.splice(i,1);
            }
        }
    }
}