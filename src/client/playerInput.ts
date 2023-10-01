import { CommandRestart, handleCommand } from "./commands.js";
import { findNearesPastPlayerCharacter, findPlayerById } from "./player.js";
import { Character } from "./character/characterModel.js";
import { Game, Position } from "./gameModel.js";
import { testGame } from "./test/gameTest.js";
import { websocketConnect } from "./multiplayerConenction.js";
import { ABILITIES_FUNCTIONS } from "./ability/ability.js";
import { calculateDirection, calculateDistance, getCameraPosition, getClientInfo, loadFromLocalStorage, takeTimeMeasure } from "./game.js";
import { executeUpgradeOptionChoice } from "./character/upgrade.js";
import { tradePets } from "./character/playerCharacters/tamer/tamerPetCharacter.js";
import { canCharacterTradeAbilityOrPets, characterTradeAbilityAndPets } from "./character/character.js";

export const MOVE_ACTIONS = ["left", "down", "right", "up"];
export const UPGRADE_ACTIONS = ["upgrade1", "upgrade2", "upgrade3"];
export const ABILITY_ACTIONS = ["ability1", "ability2", "ability3"];
export const SPECIAL_ACTIONS = ["interact"];
export const MOUSE_ACTION = "mousePositionUpdate";

export type ActionsPressed = {
    [key: string]: boolean;
}

export type PlayerInput = {
    executeTime: number,
    command: string,
    clientId: number,
    data?: any
}

export function createActionsPressed(): ActionsPressed {
    return {
        left: false,
        down: false,
        right: false,
        up: false,
        upgrade1: false,
        upgrade2: false,
        upgrade3: false,
        ability1: false,
        ability2: false,
        ability3: false,
        interact: false,
    }
}

export function mouseDown(event: MouseEvent, game: Game) {
    playerInputChangeEvent(game, "Mouse" + event.button, true);
}

export function mouseUp(event: MouseEvent, game: Game) {
    playerInputChangeEvent(game, "Mouse" + event.button, false);
}

export function keyDown(event: { code: string, preventDefault?: Function, stopPropagation?: Function }, game: Game) {
    if (event.code !== "F12" && !game.multiplayer.connectMenuOpen) {
        if (event.preventDefault) event.preventDefault();
        if (event.stopPropagation) event.stopPropagation();
    }
    if (game.multiplayer.connectMenuOpen) return;

    playerInputChangeEvent(game, event.code, true);
    let commandRestart: Omit<CommandRestart, "executeTime">;

    switch (event.code) {
        case "KeyR":
        //            commandRestart = { command: "restart", clientId: game.multiplayer.myClientId };
        //            handleCommand(game, commandRestart);
        //            break;
        case "KeyZ":
            game.state.paused = false;
            commandRestart = {
                command: "restart",
                clientId: game.multiplayer.myClientId,
                recordInputs: true,
                replay: false,
                testMapSeed: game.state.map.seed,
                testRandomStartSeed: game.state.randomSeed.seed
            };
            handleCommand(game, commandRestart);
            break;
        case "KeyT":
            testGame(game);
            break;
        case "KeyO":
            multiplayerConnectMenu(game);
            break;
        case "KeyP":
            if (!game.multiplayer.websocket) {
                game.state.paused = !game.state.paused;
            }
            break;
        case "Tab":
            game.UI.displayLongInfos = true;
            if (!game.multiplayer.websocket) {
                game.state.paused = true;
            }
            break;
        case "KeyG":
            game.settings.autoSkillEnabled = !game.settings.autoSkillEnabled;
            break;
        case "KeyH":
            if (game.testing.autoPlay.hotkeyEnabled) {
                if (game.testing.autoPlay?.autoPlaying) {
                    game.testing.autoPlay.autoPlaying = false;
                } else {
                    game.testing.autoPlay.autoPlaying = true;
                    game.testing.autoPlay.nextAutoButtonPressTime = 0;
                }
            }
            break;
        default:
            break;
    }
}

export function playerInputBindingToDisplayValue(playerInputBinding: string, game: Game): string {
    let displayValue = "";
    game.clientKeyBindings[0].keyCodeToActionPressed.forEach((value, key) => {
        if (value.action === playerInputBinding) {
            displayValue = value.uiDisplayInputValue;
        }
    });

    return displayValue;
}

function multiplayerConnectMenu(game: Game) {
    let multiplayer = game.multiplayer;
    if (multiplayer.websocket === null) {
        (document.getElementById('multiplayerConnect') as HTMLButtonElement).disabled = false;
        document.getElementById('stringInput')?.classList.toggle('hide');
        multiplayer.connectMenuOpen = true;
        if (!multiplayer.connectMenuListenerSet) {
            multiplayer.connectMenuListenerSet = true;
            const connectButton = document.getElementById('multiplayerConnect');
            connectButton?.addEventListener("click", (e) => {
                const nameInput = document.getElementById('nameInput') as HTMLInputElement;
                const clientName = nameInput.value;
                const lobbyCodeElement = document.getElementById('lobbyCode') as HTMLInputElement;
                const lobbyCode = lobbyCodeElement.value;
                try {
                    websocketConnect(game, clientName, lobbyCode);
                } catch (e) {
                    document.getElementById('stringInput')?.classList.toggle('hide');
                }
            });
            const cancelButton = document.getElementById('multiplayerCancel');
            cancelButton?.addEventListener("click", (e) => {
                multiplayer.connectMenuOpen = false;
            });
        }
    } else {
        game.multiplayer.intentionalDisconnect = true;
        multiplayer.websocket?.close();
    }
}

export function keyUp(event: KeyboardEvent, game: Game) {
    playerInputChangeEvent(game, event.code, false);

    switch (event.code) {
        case "Tab":
            game.UI.displayLongInfos = false;
            if (!game.multiplayer.websocket) {
                game.state.paused = false;
            }
            break;
    }

}

export function tickPlayerInputs(playerInputs: PlayerInput[], currentTime: number, game: Game) {
    takeTimeMeasure(game.debug, "", "tickPlayerInputs");
    while (playerInputs.length > 0 && playerInputs[0].executeTime <= currentTime) {
        if (playerInputs[0].command === "playerInput") {
            if (playerInputs[0].executeTime <= currentTime - 16) {
                console.log("playerAction to late", currentTime - playerInputs[0].executeTime, playerInputs[0]);
            }
            playerAction(playerInputs[0].clientId, playerInputs[0].data, game);
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
    takeTimeMeasure(game.debug, "tickPlayerInputs", "");
}

function determinePlayerMoveDirection(player: Character, actionsPressed: ActionsPressed) {
    let newDirection = 0;
    let left = 0;
    if (actionsPressed.right) left++;
    if (actionsPressed.left) left--;
    let down = 0;
    if (actionsPressed.down) down++;
    if (actionsPressed.up) down--;
    newDirection = calculateDirection({ x: 0, y: 0 }, { x: left, y: down });
    if (left === 0 && down === 0) {
        player.isMoving = false;
    } else {
        player.moveDirection = newDirection;
        player.isMoving = true;
    }
}

function playerInputChangeEvent(game: Game, inputCode: string, isInputDown: boolean) {
    for (let i = 0; i < game.clientKeyBindings.length; i++) {
        let action = game.clientKeyBindings[i].keyCodeToActionPressed.get(inputCode);
        if (action !== undefined) {
            if (game.testing.replay) {
                //end replay and let player play
                game.testing.replay = undefined;
                loadFromLocalStorage(game);
            }
            const clientId = game.clientKeyBindings[i].clientIdRef;
            if (isInputDown && action.isInputAlreadyDown) {
                return;
            }
            action.isInputAlreadyDown = isInputDown;
            if (action.action.indexOf("ability") > -1) {
                let cameraPosition = getCameraPosition(game);
                let castPosition: Position = {
                    x: game.mouseRelativeCanvasPosition.x - game.canvasElement!.width / 2 + cameraPosition.x,
                    y: game.mouseRelativeCanvasPosition.y - game.canvasElement!.height / 2 + cameraPosition.y
                }
                handleCommand(game, {
                    command: "playerInput",
                    clientId: clientId,
                    data: { action: action.action, isKeydown: isInputDown, castPosition: castPosition },
                });
            } else {
                if (action.action.indexOf("upgrade") > -1) {
                    let character = findPlayerById(game.state.players, clientId)?.character;
                    if (!character || character.upgradeChoices.length === 0) {
                        return;
                    }
                    if (game.state.paused) {
                        game.state.tickOnceInPaused = true;
                    }
                }
                handleCommand(game, {
                    command: "playerInput",
                    clientId: clientId,
                    data: { action: action.action, isKeydown: isInputDown },
                });
            }
        }
    }
}

function playerAction(clientId: number, data: any, game: Game) {
    const action: string = data.action;
    const isKeydown: boolean = data.isKeydown;
    const player = findPlayerById(game.state.players, clientId);
    if (player === null) return;
    let character = player.character;

    if (action !== undefined) {
        if (MOVE_ACTIONS.indexOf(action) !== -1) {
            player.actionsPressed[action] = isKeydown;
            if (character !== null) {
                game.UI.movementKeyPressed = true;
                game.UI.displayMovementKeyHint = false;
                determinePlayerMoveDirection(character, player.actionsPressed);
            }
        } else if (UPGRADE_ACTIONS.indexOf(action) !== -1) {
            if (isKeydown) {
                let option = character.upgradeChoices[UPGRADE_ACTIONS.indexOf(action)];
                if (option) {
                    executeUpgradeOptionChoice(character, option, game);
                }
            }
        } else if (ABILITY_ACTIONS.indexOf(action) !== -1) {
            for(let ability of character.abilities){
                if(ability.playerInputBinding && ability.playerInputBinding === action ){
                    let functions = ABILITIES_FUNCTIONS[ability.name];
                    if (functions.activeAbilityCast !== undefined) {
                        functions.activeAbilityCast(character, ability, data.castPosition, isKeydown, game);
                    } else {
                        console.log("missing activeAbilityCast function for", action, ability);
                    }
                }
            }
        } else if (SPECIAL_ACTIONS.indexOf(action) !== -1) {
            if (isKeydown) {
                let special = SPECIAL_ACTIONS[SPECIAL_ACTIONS.indexOf(action)];
                if (special === "interact") {
                    const closestPast = findNearesPastPlayerCharacter(character, game);
                    if (closestPast) {
                        if(canCharacterTradeAbilityOrPets(closestPast)){
                            characterTradeAbilityAndPets(closestPast, character, game);
                        }else{
                            const pastCharactes = game.state.pastPlayerCharacters.characters;
                            for(let i = pastCharactes.length - 1; i>= 0; i--){
                                if(pastCharactes[i] === closestPast){
                                    pastCharactes[i] = undefined;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        } else if (MOUSE_ACTION === action) {
            const client = getClientInfo(clientId, game);
            if (client) {
                client.lastMousePosition = data.mousePosition;
            }
        }
    }
}
