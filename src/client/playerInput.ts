import { CommandRestart, handleCommand } from "./commands.js";
import { findPlayerById } from "./player.js";
import { Character } from "./character/characterModel.js";
import { Game, Position } from "./gameModel.js";
import { websocketConnect } from "./multiplayerConenction.js";
import { ABILITIES_FUNCTIONS } from "./ability/ability.js";
import { calculateDirection, getCameraPosition, findClientInfo, resetGameNonStateData, takeTimeMeasure, findClosestInteractable, concedePlayerFightRetries, retryFight } from "./game.js";
import { executeUpgradeOptionChoice } from "./character/upgrade.js";
import { canCharacterTradeAbilityOrPets, characterTradeAbilityAndPets } from "./character/character.js";
import { shareCharactersTradeablePreventedMultipleClass } from "./character/playerCharacters/playerCharacters.js";
import { findNearesInteractableMapChunkObject, interactWithMapObject } from "./map/mapObjects.js";
import { localStorageLoad } from "./permanentData.js";
import { createRequiredMoreInfos, moreInfosHandleMouseClick } from "./moreInfo.js";

export const MOVE_ACTIONS = ["left", "down", "right", "up"];
export const UPGRADE_ACTIONS = ["upgrade1", "upgrade2", "upgrade3", "upgrade4"];
export const ABILITY_ACTIONS = ["ability1", "ability2", "ability3"];
export const SPECIAL_ACTIONS = ["interact1", "interact2"];
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
        upgrade4: false,
        ability1: false,
        ability2: false,
        ability3: false,
        interact1: false,
        interact2: false,
    }
}

export function mouseDown(event: MouseEvent, game: Game) {
    game.UI.lastMouseDownWasUIClick = moreInfosHandleMouseClick(event, game);
    if (!game.UI.lastMouseDownWasUIClick) playerInputChangeEvent(game, "Mouse" + event.button, true);
}

export function mouseUp(event: MouseEvent, game: Game) {
    if (!game.UI.lastMouseDownWasUIClick) playerInputChangeEvent(game, "Mouse" + event.button, false);

}

export function keyDown(event: { code: string, preventDefault?: Function, stopPropagation?: Function, shiftKey?: boolean }, game: Game) {
    if (event.code !== "F12" && !game.multiplayer.connectMenuOpen) {
        if (event.preventDefault) event.preventDefault();
        if (event.stopPropagation) event.stopPropagation();
    }
    if (game.multiplayer.connectMenuOpen) return;

    playerInputChangeEvent(game, event.code, true);
    uiAction(game, event.code, true);
    switch (event.code) {
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
        case "F1":
            handleSaveStateAction(0, event.shiftKey!, game);
            break;
        case "F2":
            handleSaveStateAction(1, event.shiftKey!, game);
            break;
        case "F3":
            handleSaveStateAction(2, event.shiftKey!, game);
            break;
        case "F4":
            handleSaveStateAction(3, event.shiftKey!, game);
            break;
        case "F5":
            saveStateLoad(1, true, game);
            break;
        case "F6":
            saveStateLoad(0, true, game);
            break;
        default:
            break;
    }
}

export function playerInputBindingToDisplayValue(playerInputBinding: string, game: Game): string {
    let displayValue = "";
    if (game.clientKeyBindings) {
        game.clientKeyBindings.keyCodeToActionPressed.forEach((value, key) => {
            if (value.action === playerInputBinding) {
                displayValue = value.uiDisplayInputValue;
            }
        });

        if (displayValue === "") {
            game.clientKeyBindings.keyCodeToUiAction.forEach((value, key) => {
                if (value.action === playerInputBinding) {
                    displayValue = value.uiDisplayInputValue;
                }
            });
        }
    }

    return displayValue;
}

export function keyUp(event: KeyboardEvent, game: Game) {
    playerInputChangeEvent(game, event.code, false);
    uiAction(game, event.code, false);
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

function handleSaveStateAction(saveStateNumber: number, isSaveAction: boolean, game: Game) {
    if (isSaveAction) {
        saveStateSave(saveStateNumber, game);
    } else {
        saveStateLoad(saveStateNumber, false, game);
    }
}

function saveStateSave(saveStateNumber: number, game: Game) {
    if (game.debug.activateSaveStates && !game.multiplayer.websocket) {
        const manualSaves = game.testing.saveStates.manualSaves;
        manualSaves.states[saveStateNumber] = JSON.stringify(game.state);
        manualSaves.statesRecordData[saveStateNumber] = JSON.stringify(game.testing.record!.data);
    }
}

function saveStateLoad(saveStateNumber: number, isAutoSave: boolean, game: Game) {
    if (game.debug.activateSaveStates && !game.multiplayer.websocket) {
        const saveStates = game.testing.saveStates;
        if (isAutoSave) {
            const autoSaves = saveStates.autoSaves;
            if (!autoSaves.states[saveStateNumber]) return;
            game.state = JSON.parse(autoSaves.states[saveStateNumber]);
            game.testing.record!.data = JSON.parse(autoSaves.statesRecordData[saveStateNumber]);
        } else {
            const manualSaves = saveStates.manualSaves;
            if (!manualSaves.states[saveStateNumber]) return;
            game.state = JSON.parse(manualSaves.states[saveStateNumber]);
            game.testing.record!.data = JSON.parse(manualSaves.statesRecordData[saveStateNumber]);
        }
        resetGameNonStateData(game);
        saveStates.autoSaves.nextSaveStateTime = game.state.time + saveStates.autoSaves.saveInterval;
    }
}

function multiplayerConnectMenu(game: Game) {
    const multiplayer = game.multiplayer;
    if (multiplayer.websocket === null) {
        (document.getElementById('multiplayerConnect') as HTMLButtonElement).disabled = false;
        document.getElementById('stringInput')?.classList.toggle('hide');
        multiplayer.connectMenuOpen = true;
        if (!multiplayer.connectMenuListenerSet) {
            multiplayer.connectMenuListenerSet = true;
            const connectButton = document.getElementById('multiplayerConnect');
            connectButton?.addEventListener("click", (e) => {
                const nameInput = document.getElementById('nameInput') as HTMLInputElement;
                const clientName = nameInput.value ? nameInput.value : "Unknown";
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

function uiAction(game: Game, inputCode: string, isInputDown: boolean) {
    if (!game.clientKeyBindings) return;
    const action = game.clientKeyBindings.keyCodeToUiAction.get(inputCode);
    if (action === undefined) return;
    if (isInputDown && action.isInputAlreadyDown) return;
    action.isInputAlreadyDown = isInputDown;
    switch (action.action) {
        case "Restart":
            if (!isInputDown) return;
            if (game.testing.replay) {
                //end replay
                game.testing.replay = undefined;
                localStorageLoad(game);
            }
            game.state.paused = false;
            const commandRestart: Omit<CommandRestart, "executeTime"> = {
                command: "restart",
                clientId: game.multiplayer.myClientId,
                recordInputs: true,
                replay: false,
                testMapSeed: game.state.map.seed,
            };
            handleCommand(game, commandRestart);
            break;
        case "Multiplayer":
            if (!isInputDown) return;
            multiplayerConnectMenu(game);
            break;
        case "Pause":
            if (!isInputDown) return;
            if (!game.multiplayer.websocket) {
                game.state.paused = !game.state.paused;
            }
            break;
        case "More Info":
            game.UI.displayMoreInfos = isInputDown;
            if (isInputDown) {
                game.UI.moreInfos = createRequiredMoreInfos(game);
            }
            if (!game.multiplayer.websocket) {
                game.state.paused = isInputDown;
            }
            break;
        case "AutoSkill":
            if (!isInputDown) return;
            action.activated = !action.activated;
            break;
    }
}

function playerInputChangeEvent(game: Game, inputCode: string, isInputDown: boolean) {
    if (!game.clientKeyBindings) return;
    const action = game.clientKeyBindings.keyCodeToActionPressed.get(inputCode);
    if (action === undefined) return;
    if (game.testing.replay) {
        //end replay and let player play
        game.testing.replay = undefined;
        localStorageLoad(game);
    }
    const clientId = game.clientKeyBindings.clientIdRef;
    if (isInputDown && action.isInputAlreadyDown) {
        return;
    }
    action.isInputAlreadyDown = isInputDown;
    if (action.action.indexOf("ability") > -1) {
        const cameraPosition = getCameraPosition(game);
        const castPosition: Position = {
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
            const character = findPlayerById(game.state.players, clientId)?.character;
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

function playerAction(clientId: number, data: any, game: Game) {
    const action: string = data.action;
    const isKeydown: boolean = data.isKeydown;
    const player = findPlayerById(game.state.players, clientId);
    if (player === null) return;
    const character = player.character;

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
                const option = character.upgradeChoices[UPGRADE_ACTIONS.indexOf(action)];
                if (option) {
                    executeUpgradeOptionChoice(character, option, game);
                }
                game.UI.moreInfos = createRequiredMoreInfos(game);
            }
        } else if (ABILITY_ACTIONS.indexOf(action) !== -1) {
            for (let ability of character.abilities) {
                if (ability.playerInputBinding && ability.playerInputBinding === action) {
                    const functions = ABILITIES_FUNCTIONS[ability.name];
                    if (functions.activeAbilityCast !== undefined) {
                        functions.activeAbilityCast(character, ability, data.castPosition, isKeydown, game);
                    } else {
                        console.log("missing activeAbilityCast function for", action, ability);
                    }
                }
            }
        } else if (SPECIAL_ACTIONS.indexOf(action) !== -1) {
            if (isKeydown) {
                const special = SPECIAL_ACTIONS[SPECIAL_ACTIONS.indexOf(action)];
                interactKeys(character, special, game);
            }
        } else if (MOUSE_ACTION === action) {
            const client = findClientInfo(clientId, game);
            if (client) {
                client.lastMousePosition = data.mousePosition;
            }
        }
    }
}

function interactKeys(character: Character, specialAction: string, game: Game) {
    if (specialAction === "interact1") {
        if (game.state.bossStuff.godFightStarted || game.state.bossStuff.kingFightStarted) {
            retryFight(game);
            return;
        }
        const closestInteractable = findClosestInteractable(game);
        if (closestInteractable) {
            if (closestInteractable.mapObject) {
                interactWithMapObject(character, closestInteractable.mapObject, specialAction, game);
            } else if (closestInteractable.pastCharacter) {
                if (canCharacterTradeAbilityOrPets(closestInteractable.pastCharacter)) {
                    if (!shareCharactersTradeablePreventedMultipleClass(closestInteractable.pastCharacter, character)) {
                        characterTradeAbilityAndPets(closestInteractable.pastCharacter, character, game);
                    }
                } else {
                    const pastCharactes = game.state.pastPlayerCharacters.characters;
                    for (let i = pastCharactes.length - 1; i >= 0; i--) {
                        if (pastCharactes[i] === closestInteractable.pastCharacter) {
                            pastCharactes[i] = undefined;
                            break;
                        }
                    }
                }
            }
        }
    } else {
        if (game.state.bossStuff.godFightStarted || game.state.bossStuff.kingFightStarted) {
            concedePlayerFightRetries(game);
            return;
        }
        const interactableMapObject = findNearesInteractableMapChunkObject(character, game);
        if (interactableMapObject) {
            interactWithMapObject(character, interactableMapObject, specialAction, game);
        }
    }
}

