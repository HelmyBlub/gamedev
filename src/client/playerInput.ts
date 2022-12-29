import { handleCommand } from "./commands.js";
import { fillRandomUpgradeOptions } from "./character/levelingCharacter.js";
import { findPlayerById } from "./player.js";
import { Character } from "./character/characterModel.js";
import { LevelingCharacter, UpgradeOption } from "./character/levelingCharacterModel.js";
import { Game } from "./gameModel.js";
import { RandomSeed } from "./randomNumberGenerator.js";
import { testGame } from "./gameTest.js";
import { websocketConnect } from "./multiplayerConenction.js";

export const MOVE_ACTIONS = ["left", "down", "right", "up"];
export const UPGRADE_ACTIONS = ["upgrade1", "upgrade2", "upgrade3"];

export type ActionsPressed = {
    [key: string]: boolean;
}

export type PlayerInput = {
    executeTime: number,
    command: string,
    clientId: number,
    data?: any
}

export function createActionsPressed() {
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

export function keyDown(event: KeyboardEvent, game: Game) {
    playerInputChangeEvent(event, game);

    switch (event.code) {
        case "KeyR":
            handleCommand(game, { command: "restart", clientId: game.multiplayer.myClientId });
            break;
        case "KeyZ":
            handleCommand(game, { command: "restart", clientId: game.multiplayer.myClientId, testing: true });
            break;
        case "KeyT":
            testGame(game);
            break;
        case "KeyP":
            if (game.multiplayer.websocket === null) {
                if (game.state.ended) websocketConnect(game);
            } else {
                game.multiplayer.websocket?.close();
            }
            break;
        default:
            break;
    }
}

export function keyUp(event: KeyboardEvent, game: Game) {
    playerInputChangeEvent(event, game);
}

export function tickPlayerInputs(playerInputs: PlayerInput[], currentTime: number, game: Game) {
    while (playerInputs.length > 0 && playerInputs[0].executeTime <= currentTime) {
        if (playerInputs[0].command === "playerInput") {
            if (playerInputs[0].executeTime <= currentTime - 16) {
                console.log("playerAction to late", currentTime - playerInputs[0].executeTime, playerInputs[0]);
            }
            playerAction(playerInputs[0].clientId, playerInputs[0].data.action, playerInputs[0].data.isKeydown, game);
            playerInputs.shift();
        } else if (playerInputs[0].command === "restart") {
            playerInputs.shift();
            game.state.restartAfterTick = true;
            break;
        } else {
            console.log(playerInputs[0]);
            throw new Error("invalid command in inputs");
        }
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

function playerInputChangeEvent(event: KeyboardEvent, game: Game) {
    const keycode = event.code;
    const isKeydown = event.type === "keydown" ? true : false;

    for (let i = 0; i < game.clientKeyBindings.length; i++) {
        let action = game.clientKeyBindings[i].keyCodeToActionPressed.get(keycode);
        if (action !== undefined) {
            const clientId = game.clientKeyBindings[i].clientIdRef;
            handleCommand(game, {
                command: "playerInput",
                clientId: clientId,
                data: { action: action, isKeydown: isKeydown },
            });
        }
    }
}

function playerAction(clientId: number, action: string, isKeydown: boolean, game: Game) {
    const player = findPlayerById(game.state.players, clientId);
    if (player === null) return;
    let character = player.character;

    if (action !== undefined) {
        if (MOVE_ACTIONS.indexOf(action) !== -1) {
            player.actionsPressed[action] = isKeydown;
            if (character !== null) {
                determinePlayerMoveDirection(character, player.actionsPressed);
            }
        } else if (UPGRADE_ACTIONS.indexOf(action) !== -1) {
            if (isKeydown) {
                upgradeLevelingCharacter(character as LevelingCharacter, action, game.avaialbleUpgrades, game.state.randomSeed);
            }
        }
    }
}

function upgradeLevelingCharacter(character: LevelingCharacter, action: string, upgradeOptions: Map<string, UpgradeOption>, randomSeed: RandomSeed) {
    if (character.availableSkillPoints > 0) {
        let index = UPGRADE_ACTIONS.indexOf(action);
        upgradeOptions.get(character.upgradeOptions[index].name)?.upgrade(character);
        character.availableSkillPoints--;
        character.upgradeOptions = [];
        if (character.availableSkillPoints > 0) {
            fillRandomUpgradeOptions(character, randomSeed, upgradeOptions);
        }
    }
}
