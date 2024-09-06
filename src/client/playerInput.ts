import { CommandRestart, handleCommand } from "./commands.js";
import { findPlayerByCliendId, findPlayerById } from "./player.js";
import { Character } from "./character/characterModel.js";
import { ClientKeyBindings, Game, Position } from "./gameModel.js";
import { websocketConnect } from "./multiplayerConenction.js";
import { ABILITIES_FUNCTIONS } from "./ability/ability.js";
import { calculateDirection, getCameraPosition, findClientInfo, resetGameNonStateData, takeTimeMeasure, findClosestInteractable, concedePlayerFightRetries, retryFight, calculateFightRetryCounter, getRelativeMousePoistion } from "./game.js";
import { executeUpgradeOptionChoice } from "./character/upgrade.js";
import { canCharacterTradeAbilityOrPets, characterTradeAbilityAndPets } from "./character/character.js";
import { shareCharactersTradeablePreventedMultipleClass } from "./character/playerCharacters/playerCharacters.js";
import { findNearesInteractableMapChunkObject, interactWithMapObject } from "./map/mapObjects.js";
import { localStorageLoad } from "./permanentData.js";
import { createRequiredMoreInfos, moreInfosHandleMouseClick } from "./moreInfo.js";
import { mousePositionToMapPosition } from "./map/map.js";
import { CHEAT_ACTIONS, executeCheatAction } from "./cheat.js";

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
    data?: any
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

export function touchStart(event: TouchEvent, game: Game) {
    event.preventDefault();
    game.UI.inputType = "touch";
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        if (touchUiRectangles(touch, game)) {
            return;
        } else if (touchStartMove(touch, game)) {
            continue;
        } else if (touchUpgrade(touch, true, game)) {
            continue;
        } else {
            touchAbilityAction(touch, game);
        }
    }
}

export function touchMove(event: TouchEvent, game: Game) {
    event.preventDefault();
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        touchMoveActionMove(touch, game);
        touchMoveActionAbility(touch, game);
    }
}

export function touchEnd(event: TouchEvent, game: Game) {
    event.preventDefault();
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        touchMoveEnd(touch, game);
        touchEndActionAbility(touch, game);
    }
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

function touchMoveActionAbility(touch: Touch, game: Game) {
    if (game.UI.touchInfo.touchIdAbility !== touch.identifier) return;
    if (!game.canvasElement) return;
    const target = game.canvasElement;
    const relativPosition = { x: touch.clientX - target.offsetLeft, y: touch.clientY - target.offsetTop };
    game.mouseRelativeCanvasPosition = relativPosition;
}

function touchEndActionAbility(touch: Touch, game: Game) {
    if (game.UI.touchInfo.touchIdAbility !== touch.identifier) return;
    const clientId = game.multiplayer.myClientId;
    handleCommand(game, {
        command: "playerInput",
        clientId: clientId,
        data: { action: "ability1", isKeydown: false },
    });
}

function touchAbilityAction(touch: Touch, game: Game) {
    if (!game.clientKeyBindings || !game.canvasElement) return;
    const abilityUi = game.UI.playerCharacterAbilityUI;
    if (!abilityUi || abilityUi.rectangles === undefined) return;
    if (abilityUi.selectedRectangleIndex === undefined) abilityUi.selectedRectangleIndex = 0;
    const clientId = game.clientKeyBindings.clientIdRef;
    const player = findPlayerByCliendId(clientId, game.state.players);
    if (!player) return;

    const abilityId = abilityUi.rectangles[abilityUi.selectedRectangleIndex].abilityRefId;
    const ability = player.character.abilities.find((a) => a.id === abilityId);
    if (!ability) return;

    const target = game.canvasElement;
    const relativPosition = { x: touch.clientX - target.offsetLeft, y: touch.clientY - target.offsetTop };
    game.mouseRelativeCanvasPosition = relativPosition;
    const cameraPosition = getCameraPosition(game);
    const castPosition = mousePositionToMapPosition(game, cameraPosition);
    const castPositionRelativeToCharacter: Position = {
        x: castPosition.x - player.character.x,
        y: castPosition.y - player.character.y,
    };
    game.UI.touchInfo.touchIdAbility = touch.identifier;
    handleCommand(game, {
        command: "playerInput",
        clientId: clientId,
        data: { action: ability.playerInputBinding, isKeydown: true, castPosition: castPosition, castPositionRelativeToCharacter: castPositionRelativeToCharacter },
    });
}

/**
 * @returns true if upgrade action executed
 */
function touchUpgrade(touch: Touch, touchStart: boolean, game: Game): boolean {
    if (!game.clientKeyBindings || !game.canvasElement) return false;
    const upgradePaintData = game.UI.rectangles.upgradePaintRectangle;
    if (upgradePaintData === undefined || upgradePaintData.length === 0) return false;
    const target = game.canvasElement;
    const clientId = game.clientKeyBindings.clientIdRef;
    const relativPosition = { x: touch.clientX - target.offsetLeft, y: touch.clientY - target.offsetTop };
    if (upgradePaintData[0].topLeft.y > relativPosition.y) return false;
    for (let i = 0; i < upgradePaintData.length; i++) {
        const data = upgradePaintData[i];
        if (data.topLeft.x <= relativPosition.x && data.topLeft.x + data.width >= relativPosition.x
            && data.topLeft.y <= relativPosition.y && data.topLeft.y + data.height >= relativPosition.y
        ) {
            handleCommand(game, {
                command: "playerInput",
                clientId: clientId,
                data: { action: "upgrade" + (i + 1), isKeydown: touchStart },
            });
            return true;
        }
    }
    return false;
}

function touchMoveEnd(touch: Touch, game: Game) {
    if (game.UI.touchInfo.touchIdMove === touch.identifier) {
        const clientId = game.multiplayer.myClientId;
        game.UI.touchInfo.touchIdMove = undefined;
        game.UI.touchInfo.touchStart = undefined;

        const moveData: MoveData = {
            direction: 0,
            faktor: 0,
        }
        handleCommand(game, {
            command: "playerInput",
            clientId: clientId,
            data: { ...moveData, action: MOVE_ACTION },
        });
    }
}

function touchMoveActionMove(touch: Touch, game: Game) {
    if (!game.clientKeyBindings || !game.canvasElement) return false;
    if (!game.UI.touchInfo.touchMoveCornerBottomLeft || !game.UI.touchInfo.touchStart) return false;
    if (game.UI.touchInfo.touchIdMove !== touch.identifier) return false;
    const clientId = game.multiplayer.myClientId;

    const target = game.canvasElement;
    const relativPosition = { x: touch.clientX - target.offsetLeft, y: touch.clientY - target.offsetTop };
    const moveMiddlePosition = game.UI.touchInfo.touchStart;

    const direction = calculateDirection(moveMiddlePosition, relativPosition);

    const moveData: MoveData = {
        direction: direction,
        faktor: 1,
    }
    handleCommand(game, {
        command: "playerInput",
        clientId: clientId,
        data: { ...moveData, action: MOVE_ACTION },
    });
}

/**
 * @returns true if something executed
 */
function touchUiRectangles(touch: Touch, game: Game): boolean {
    if (touchRestart(touch, game)) {
        return true;
    } else if (touchRetryConcede(touch, game)) {
        return true;
    } else if (touchInteract(touch, game)) {
        return true;
    } else if (touchAbilitySelect(touch, game)) {
        return true;
    }
    return false;
}

/**
 * @returns true if restart executed
 */
function touchRestart(touch: Touch, game: Game): boolean {
    const rectangle = game.UI.rectangles.restartTextRectangle;
    if (!rectangle || !game.canvasElement) return false;
    const target = game.canvasElement;
    const relativPosition = { x: touch.clientX - target.offsetLeft, y: touch.clientY - target.offsetTop };
    if (rectangle.topLeft.x <= relativPosition.x && rectangle.topLeft.x + rectangle.width >= relativPosition.x
        && rectangle.topLeft.y <= relativPosition.y && rectangle.topLeft.y + rectangle.height >= relativPosition.y
    ) {
        executeUiAction("Restart", true, game);
        return true;
    }
    return false;
}

function touchInteract(touch: Touch, game: Game): boolean {
    if (game.UI.rectangles.interactRectangle === undefined) return false;
    if (game.UI.rectangles.interactRectangle.length <= 0) return false;
    for (let rectangle of game.UI.rectangles.interactRectangle) {
        if (!rectangle || !game.canvasElement) return false;
        const target = game.canvasElement;
        const relativPosition = { x: touch.clientX - target.offsetLeft, y: touch.clientY - target.offsetTop };
        if (rectangle.topLeft.x <= relativPosition.x && rectangle.topLeft.x + rectangle.width >= relativPosition.x
            && rectangle.topLeft.y <= relativPosition.y && rectangle.topLeft.y + rectangle.height >= relativPosition.y
        ) {
            const clientId = game.multiplayer.myClientId;
            handleCommand(game, {
                command: "playerInput",
                clientId: clientId,
                data: { action: rectangle.interactAction, isKeydown: true },
            });
            return true;
        }
    }
    return false;
}

function touchAbilitySelect(touch: Touch, game: Game): boolean {
    const abilityUi = game.UI.playerCharacterAbilityUI;
    if (!abilityUi || abilityUi.rectangles === undefined) return false;
    for (let i = 0; i < abilityUi.rectangles.length; i++) {
        const rectangle = abilityUi.rectangles[i];
        if (!rectangle || !game.canvasElement) return false;
        const target = game.canvasElement;
        const relativPosition = { x: touch.clientX - target.offsetLeft, y: touch.clientY - target.offsetTop };
        if (rectangle.topLeft.x <= relativPosition.x && rectangle.topLeft.x + rectangle.width >= relativPosition.x
            && rectangle.topLeft.y <= relativPosition.y && rectangle.topLeft.y + rectangle.height >= relativPosition.y
        ) {
            abilityUi.selectedRectangleIndex = i;
            return true;
        }
    }
    return false;
}

/**
 * @returns true if retry or concede executed
 */
function touchRetryConcede(touch: Touch, game: Game): boolean {
    const rectangles = game.UI.rectangles.retryTextRectangles;
    if (rectangles === undefined || rectangles.length !== 2 || !game.canvasElement) return false;
    const target = game.canvasElement;
    const relativPosition = { x: touch.clientX - target.offsetLeft, y: touch.clientY - target.offsetTop };
    const rectangleRetry = rectangles[0];
    if (rectangleRetry.topLeft.x <= relativPosition.x && rectangleRetry.topLeft.x + rectangleRetry.width >= relativPosition.x
        && rectangleRetry.topLeft.y <= relativPosition.y && rectangleRetry.topLeft.y + rectangleRetry.height >= relativPosition.y
    ) {
        const clientId = game.multiplayer.myClientId;
        handleCommand(game, {
            command: "playerInput",
            clientId: clientId,
            data: { action: "interact1", isKeydown: true },
        });
        return true;
    }
    const rectangleConcede = rectangles[1];
    if (rectangleConcede.topLeft.x <= relativPosition.x && rectangleConcede.topLeft.x + rectangleConcede.width >= relativPosition.x
        && rectangleConcede.topLeft.y <= relativPosition.y && rectangleConcede.topLeft.y + rectangleConcede.height >= relativPosition.y
    ) {
        const clientId = game.multiplayer.myClientId;
        handleCommand(game, {
            command: "playerInput",
            clientId: clientId,
            data: { action: "interact2", isKeydown: true },
        });
        return true;
    }

    return false;
}

/**
 * @returns true if move action executed
 */
function touchStartMove(touch: Touch, game: Game): boolean {
    if (!game.clientKeyBindings || !game.canvasElement) return false;
    const touchMoveCornerSize = game.UI.touchInfo.touchMoveCornerSize;
    if (game.UI.touchInfo.touchMoveCornerBottomLeft === undefined) {
        game.UI.touchInfo.touchMoveCornerBottomLeft = {
            x: 0,
            y: touchMoveCornerSize,
        }
    }
    const touchMoveCornerTopLeft = {
        x: game.UI.touchInfo.touchMoveCornerBottomLeft.x,
        y: game.canvasElement.height - game.UI.touchInfo.touchMoveCornerBottomLeft.y,
    }

    const target = game.canvasElement;
    const relativPosition = { x: touch.clientX - target.offsetLeft, y: touch.clientY - target.offsetTop };
    if (relativPosition.x < touchMoveCornerTopLeft.x
        || relativPosition.x > touchMoveCornerTopLeft.x + touchMoveCornerSize
        || relativPosition.y < touchMoveCornerTopLeft.y
        || relativPosition.y > touchMoveCornerTopLeft.y + touchMoveCornerSize
    ) {
        return false;
    }
    if (relativPosition.x < touchMoveCornerSize / 4) {
        relativPosition.x = touchMoveCornerSize / 4;
    }
    if (relativPosition.y > game.canvasElement.height - touchMoveCornerSize / 4) {
        relativPosition.y = game.canvasElement.height - touchMoveCornerSize / 4;
    }
    game.UI.touchInfo.touchStart = relativPosition;
    game.UI.touchInfo.touchIdMove = touch.identifier;
    return true;
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

function executeUiAction(action: string, isInputDown: boolean, game: Game,) {
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
            const keys = Object.keys(game.clientKeyBindings.keyCodeToUiAction);
            for (let key of keys) {
                const uiAction = game.clientKeyBindings.keyCodeToUiAction.get(key);
                if (uiAction && uiAction.action === "AutoUpgrade") {
                    uiAction.activated = !uiAction.activated;
                }
            }
            break;
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
    const clientId = game.clientKeyBindings.clientIdRef;
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

function playerAction(clientId: number, data: any, game: Game) {
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
                        functions.activeAbilityCast(character, ability, data.castPosition, data.castPositionRelativeToCharacter, isKeydown, game);
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
        if (game.state.bossStuff.godFightStartedTime !== undefined || game.state.bossStuff.kingFightStartedTime !== undefined) {
            retryFight(game);
            return;
        }
        const closestInteractable = findClosestInteractable(character, game);
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
        if (game.state.bossStuff.godFightStartedTime !== undefined || game.state.bossStuff.kingFightStartedTime !== undefined) {
            concedePlayerFightRetries(game);
            return;
        }
        const interactableMapObject = findNearesInteractableMapChunkObject(character, game);
        if (interactableMapObject) {
            interactWithMapObject(character, interactableMapObject, specialAction, game);
        }
    }
}

