import { CommandRestart, handleCommand } from "../commands.js";
import { findPlayerByCliendId, findPlayerById } from "../player.js";
import { Character } from "../character/characterModel.js";
import { ClientKeyBindings, Game, Position, RecordExtendendInformation } from "../gameModel.js";
import { websocketConnect } from "../multiplayerConenction.js";
import { ABILITIES_FUNCTIONS } from "../ability/ability.js";
import { calculateDirection, getCameraPosition, findClientInfo, resetGameNonStateData, takeTimeMeasure, findClosestInteractable, concedePlayerFightRetries, retryFight, calculateFightRetryCounter, getRelativeMousePoistion, calculateDistance, getTickInterval } from "../game.js";
import { executeUpgradeOptionChoice } from "../character/upgrade.js";
import { canCharacterTradeAbilityOrPets, characterTradeAbilityAndPets } from "../character/character.js";
import { shareCharactersTradeablePreventedMultipleClass } from "../character/playerCharacters/playerCharacters.js";
import { findNearesInteractableMapChunkObject, interactWithMapObject } from "../map/mapObjects.js";
import { localStorageLoad } from "../permanentData.js";
import { createRequiredMoreInfos, moreInfosHandleMouseClick } from "../moreInfo.js";
import { mousePositionToMapPosition } from "../map/map.js";
import { CHEAT_ACTIONS, executeCheatAction } from "../cheat.js";
import { pushStackPaintTextData } from "../floatingText.js";

export const MOVE_ACTION = "moveAction";
export const UPGRADE_ACTIONS = ["upgrade1", "upgrade2", "upgrade3", "upgrade4", "upgrade5"];
export const ABILITY_ACTIONS = ["ability1", "ability2", "ability3"];
export const SPECIAL_ACTIONS = ["interact1", "interact2"];
export const MOUSE_ACTION = "mousePositionUpdate";

export type ActionsPressed = {
    [key: string]: boolean;
}

export type MoveData = {
    direction: number,
    faktor: number
}

export type PlayerInput = {
    executeTime: number,
    command: string,
    clientId: number,
    data?: any,
    replayExtended?: RecordExtendendInformation,
}

export function createActionsPressed(): ActionsPressed {
    return {
        upgrade1: false,
        upgrade2: false,
        upgrade3: false,
        upgrade4: false,
        upgrade5: false,
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

export function mouseWheel(event: WheelEvent, game: Game) {
    event.preventDefault();
    zoomCanvas(event.deltaY < 0, game);
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
            if (playerInputs[0].executeTime <= currentTime - getTickInterval(game)) {
                console.log("playerAction to late", currentTime - playerInputs[0].executeTime, playerInputs[0]);
            }

            if (game.testing.record && playerInputs[0].replayExtended) {
                const extendendData = playerInputs[0].replayExtended;
                if (extendendData.randomSeedOnInputExecute !== game.state.randomSeed.seed) {
                    console.log("random seed is off");
                    debugger;
                }
            }
            if (game.testing.record !== undefined && game.testing.record.data.extendendInputData) {
                game.testing.record.data.extendendInputData.push({
                    randomSeedOnInputExecute: game.state.randomSeed.seed,
                });
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

export function executeUiAction(action: string, isInputDown: boolean, game: Game,) {
    switch (action) {
        case "Restart":
            if (!isInputDown) return;
            if (game.state.bossStuff.fightWipe) {
                const retries = calculateFightRetryCounter(game);
                if (retries > 0) return;
            }
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
            if (isInputDown && game.UI.displayMorePressTimer === undefined) {
                game.UI.displayMoreInfos = true;
                game.UI.moreInfos = createRequiredMoreInfos(game);
                game.UI.displayMorePressTimer = performance.now();
            } else if (!isInputDown) {
                if (game.UI.displayMorePressTimer === undefined || game.UI.displayMorePressTimer + 500 < performance.now()) {
                    game.UI.displayMoreInfos = false;
                    game.UI.displayMorePressTimer = undefined;
                }
            }
            if (!game.multiplayer.websocket) {
                game.state.paused = game.UI.displayMoreInfos;
            }
            break;
        case "AutoUpgrade":
            if (!isInputDown) return;
            if (!game.clientKeyBindings) return;
            const keys = game.clientKeyBindings.keyCodeToUiAction.keys();
            console.log("does this happen?");
            for (let key of keys) {
                const uiAction = game.clientKeyBindings.keyCodeToUiAction.get(key);
                if (uiAction && uiAction.action === "AutoUpgrade") {
                    uiAction.activated = !uiAction.activated;
                }
            }
            break;
    }
}

export function zoomCanvas(zoomIn: boolean, game: Game, zoomStep = 0.1) {
    const zoom = game.UI.zoom;
    zoom.factor *= zoomIn ? 1 + zoomStep : 1 - zoomStep;
    zoom.factor = Math.min(Math.max(zoom.min, zoom.factor), zoom.max);
    if (Math.abs(zoom.factor - 1) < zoomStep / 2) zoom.factor = 1;
    const zoomIdRef = 0.1234;
    pushStackPaintTextData(game.UI.stackTextsData, `Zoom: ${zoom.factor.toFixed(2)}`, game.state.time, undefined, undefined, zoomIdRef);
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
        const nameInput = document.getElementById('nameInput') as HTMLInputElement;
        nameInput.focus();
        if (!multiplayer.connectMenuListenerSet) {
            multiplayer.connectMenuListenerSet = true;
            const connectButton = document.getElementById('multiplayerConnect');
            connectButton?.addEventListener("click", () => connectMultiplayer(game));
            nameInput?.addEventListener("keypress", (e) => {
                if (e.code === "Enter") connectMultiplayer(game);
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

function connectMultiplayer(game: Game) {
    const nameInput = document.getElementById('nameInput') as HTMLInputElement;
    const clientName = nameInput.value ? nameInput.value : "Unknown";
    const lobbyCodeElement = document.getElementById('lobbyCode') as HTMLInputElement;
    const lobbyCode = lobbyCodeElement.value;
    try {
        websocketConnect(game, clientName, lobbyCode);
    } catch (e) {
        document.getElementById('stringInput')?.classList.toggle('hide');
    }
}

function determinePlayerMoveDirectionKeyboard(clientKeyBindings: ClientKeyBindings): MoveData {
    let leftPressed = false;
    let rightPressed = false;
    let upPressed = false;
    let downPressed = false;
    for (let moveKey of clientKeyBindings.moveKeys) {
        const action = clientKeyBindings.keyCodeToActionPressed.get(moveKey);
        if (action === undefined) continue;
        if (action.isInputAlreadyDown) {
            if (action.action === "left") leftPressed = true;
            if (action.action === "right") rightPressed = true;
            if (action.action === "up") upPressed = true;
            if (action.action === "down") downPressed = true;
        }
    }
    let newDirection = 0;
    let left = 0;
    if (rightPressed) left++;
    if (leftPressed) left--;
    let down = 0;
    if (downPressed) down++;
    if (upPressed) down--;
    newDirection = calculateDirection({ x: 0, y: 0 }, { x: left, y: down });
    if (left === 0 && down === 0) {
        return { direction: newDirection, faktor: 0 };
    } else {
        return { direction: newDirection, faktor: 1 };
    }
}

function uiAction(game: Game, inputCode: string, isInputDown: boolean) {
    if (!game.clientKeyBindings) return;
    const action = game.clientKeyBindings.keyCodeToUiAction.get(inputCode);
    if (action === undefined) return;
    if (isInputDown && action.isInputAlreadyDown) return;
    action.isInputAlreadyDown = isInputDown;
    executeUiAction(action.action, isInputDown, game);
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
    const clientId = game.multiplayer.myClientId;
    if (isInputDown && action.isInputAlreadyDown) {
        return;
    }
    game.UI.inputType = "keyboard";
    action.isInputAlreadyDown = isInputDown;
    if (action.action.indexOf("ability") > -1) {
        const cameraPosition = getCameraPosition(game);
        const castPosition = mousePositionToMapPosition(game, cameraPosition);
        const player = findPlayerByCliendId(clientId, game.state.players);
        if (!player) return;
        const castPositionRelativeToCharacter: Position = {
            x: castPosition.x - player.character.x,
            y: castPosition.y - player.character.y,
        };

        handleCommand(game, {
            command: "playerInput",
            clientId: clientId,
            data: { action: action.action, isKeydown: isInputDown, castPosition: castPosition, castPositionRelativeToCharacter: castPositionRelativeToCharacter },
        });
    } else if (action.action.indexOf("upgrade") > -1) {
        const character = findPlayerById(game.state.players, clientId)?.character;
        if (!character || character.upgradeChoices.choices.length === 0) {
            return;
        }
        if (game.state.paused) {
            game.state.tickOnceInPaused = true;
        }

        handleCommand(game, {
            command: "playerInput",
            clientId: clientId,
            data: { action: action.action, isKeydown: isInputDown },
        });
    } else if (game.clientKeyBindings.moveKeys.indexOf(inputCode) > -1) {
        const moveData = determinePlayerMoveDirectionKeyboard(game.clientKeyBindings);

        handleCommand(game, {
            command: "playerInput",
            clientId: clientId,
            data: { ...moveData, action: MOVE_ACTION },
        });
    } else {
        handleCommand(game, {
            command: "playerInput",
            clientId: clientId,
            data: { action: action.action, isKeydown: isInputDown },
        });
    }
}

export function playerAction(clientId: number, data: any, game: Game) {
    const action: string = data.action;
    const isKeydown: boolean = data.isKeydown;
    const player = findPlayerById(game.state.players, clientId);
    if (player === null) return;
    const character = player.character;

    if (action !== undefined) {
        if (MOVE_ACTION === action) {
            if (character !== null) {
                game.UI.movementKeyPressed = true;
                game.UI.displayMovementKeyHint = false;
                const moveData: MoveData = data;
                character.moveDirection = moveData.direction;
                if (moveData.faktor > 0) character.isMoving = true; else character.isMoving = false;
            }
        } else if (UPGRADE_ACTIONS.indexOf(action) !== -1) {
            if (isKeydown) {
                const option = character.upgradeChoices.choices[UPGRADE_ACTIONS.indexOf(action)];
                if (option) {
                    executeUpgradeOptionChoice(character, option, game);
                }
                game.UI.moreInfos = createRequiredMoreInfos(game);
            }
        } else if (ABILITY_ACTIONS.indexOf(action) !== -1) {
            if (character.state === "dying" || character.state === "dead") return;
            for (let ability of character.abilities) {
                if (ability.playerInputBinding && ability.playerInputBinding === action) {
                    const functions = ABILITIES_FUNCTIONS[ability.name];
                    if (functions.activeAbilityCast !== undefined) {
                        if (functions.positionNotRquired || (data.castPosition && data.castPositionRelativeToCharacter)) {
                            functions.activeAbilityCast(character, ability, data.castPosition, data.castPositionRelativeToCharacter, isKeydown, game);
                        }
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
        } else if (CHEAT_ACTIONS.indexOf(action) !== -1) {
            executeCheatAction(action, isKeydown, clientId, game);
        }
    }
}

function interactKeys(character: Character, specialAction: string, game: Game) {
    if (specialAction === "interact1") {
        if (game.state.bossStuff.areaSpawnFightStartedTime !== undefined || game.state.bossStuff.kingFightStartedTime !== undefined) {
            retryFight(game);
            return;
        }
        const closestInteractable = findClosestInteractable(character, game);
        if (closestInteractable) {
            if (closestInteractable.mapObject) {
                interactWithMapObject(character, closestInteractable.mapObject, specialAction, game);
            } else if (closestInteractable.pastCharacter) {
                const classChoosen = character.characterClasses !== undefined && character.characterClasses.length > 0;
                if (!classChoosen) return;
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
        if (game.state.bossStuff.areaSpawnFightStartedTime !== undefined || game.state.bossStuff.kingFightStartedTime !== undefined) {
            concedePlayerFightRetries(game);
            return;
        }
        const interactableMapObject = findNearesInteractableMapChunkObject(character, game);
        if (interactableMapObject) {
            interactWithMapObject(character, interactableMapObject, specialAction, game);
        }
    }
}

