import { handleCommand } from "../commands.js";
import { calculateDirection, calculateDistance, getCameraPosition } from "../game.js";
import { Game, Position } from "../gameModel.js";
import { mousePositionToMapPosition } from "../map/map.js";
import { findPlayerByCliendId } from "../player.js";
import { executeUiAction, MOVE_ACTION, MoveData, zoomCanvas } from "./playerInput.js";

export type TouchUiInfo = {
    touchMoveCornerSize: number,
    touchMoveCornerBottomLeft?: Position,
    touchStartMove?: Position,
    touchIdMove?: number,
    touchIdAbility?: number,
    touchStartPinch?: {
        idRef: number,
        startPosition: Position,
    }[],
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
            cacheTouchStarts(touch, game);
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
    touchPinchZoom(event, game);
}

export function touchEnd(event: TouchEvent, game: Game) {
    event.preventDefault();
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        touchMoveEnd(touch, game);
        touchEndActionAbility(touch, game);
    }
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
            const clientId = game.multiplayer.myClientId;
            const player = findPlayerByCliendId(clientId, game.state.players);
            const abilityId = abilityUi.rectangles[i].abilityRefId;

            if (player) {
                const ability = player.character.abilities.find((a) => a.id === abilityId);
                if (ability && rectangle.positionNotRequired) {
                    handleCommand(game, {
                        command: "playerInput",
                        clientId: clientId,
                        data: { action: ability.playerInputBinding, isKeydown: true },
                    });
                    return true;
                }
            }

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
    game.UI.touchInfo.touchStartMove = relativPosition;
    game.UI.touchInfo.touchIdMove = touch.identifier;
    return true;
}

/**
 * @returns true if upgrade action executed
 */
function touchUpgrade(touch: Touch, touchStart: boolean, game: Game): boolean {
    if (!game.clientKeyBindings || !game.canvasElement) return false;
    const upgradePaintData = game.UI.rectangles.upgradePaintRectangle;
    if (upgradePaintData === undefined || upgradePaintData.length === 0) return false;
    const target = game.canvasElement;
    const clientId = game.multiplayer.myClientId;
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

function touchPinchZoom(event: TouchEvent, game: Game) {
    const pinchTouches: Touch[] = [];
    const touchLastPositions = game.UI.touchInfo.touchStartPinch;
    if (touchLastPositions === undefined) return;
    for (let i = 0; i < event.touches.length; i++) {
        const touch = event.touches[i];
        if (touchLastPositions.find((t) => t.idRef === touch.identifier)) {
            pinchTouches.push(touch);
        }
    }
    if (pinchTouches.length < 2 || touchLastPositions.length < 2) return;
    const originalDistance = calculateDistance(touchLastPositions[0].startPosition, touchLastPositions[1].startPosition);
    touchLastPositions[0].startPosition = { x: pinchTouches[0].clientX, y: pinchTouches[0].clientY };
    touchLastPositions[1].startPosition = { x: pinchTouches[1].clientX, y: pinchTouches[1].clientY };
    const newDistance = calculateDistance(touchLastPositions[0].startPosition, touchLastPositions[1].startPosition)
    zoomCanvas(newDistance < originalDistance, game, 0.025);
}

function touchMoveEnd(touch: Touch, game: Game) {
    if (game.UI.touchInfo.touchIdMove === touch.identifier) {
        const clientId = game.multiplayer.myClientId;
        game.UI.touchInfo.touchIdMove = undefined;
        game.UI.touchInfo.touchStartMove = undefined;

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
    if (!game.UI.touchInfo.touchMoveCornerBottomLeft || !game.UI.touchInfo.touchStartMove) return false;
    if (game.UI.touchInfo.touchIdMove !== touch.identifier) return false;
    const clientId = game.multiplayer.myClientId;

    const target = game.canvasElement;
    const relativPosition = { x: touch.clientX - target.offsetLeft, y: touch.clientY - target.offsetTop };
    const moveMiddlePosition = game.UI.touchInfo.touchStartMove;

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

function cacheTouchStarts(touch: Touch, game: Game) {
    if (game.UI.touchInfo.touchIdMove === touch.identifier) return;
    if (game.UI.touchInfo.touchStartPinch === undefined) game.UI.touchInfo.touchStartPinch = [];
    game.UI.touchInfo.touchStartPinch.push({
        idRef: touch.identifier,
        startPosition: {
            x: touch.clientX,
            y: touch.clientY,
        }
    });
    if (game.UI.touchInfo.touchStartPinch.length > 2) game.UI.touchInfo.touchStartPinch.shift();
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
    const player = findPlayerByCliendId(clientId, game.state.players);
    if (!player) return;
    const abilityUi = game.UI.playerCharacterAbilityUI;
    if (!abilityUi || abilityUi.rectangles === undefined) return;
    if (abilityUi.selectedRectangleIndex === undefined) return;
    const abilityId = abilityUi.rectangles[abilityUi.selectedRectangleIndex].abilityRefId;
    const ability = player.character.abilities.find((a) => a.id === abilityId);
    if (!ability) return;
    const cameraPosition = getCameraPosition(game);
    const castPosition = mousePositionToMapPosition(game, cameraPosition);
    const castPositionRelativeToCharacter: Position = {
        x: castPosition.x - player.character.x,
        y: castPosition.y - player.character.y,
    };
    game.UI.touchInfo.touchIdAbility = undefined;
    handleCommand(game, {
        command: "playerInput",
        clientId: clientId,
        data: { action: ability.playerInputBinding, isKeydown: false, castPosition: castPosition, castPositionRelativeToCharacter: castPositionRelativeToCharacter },
    });
}

function touchAbilityAction(touch: Touch, game: Game) {
    if (!game.clientKeyBindings || !game.canvasElement) return;
    const abilityUi = game.UI.playerCharacterAbilityUI;
    if (!abilityUi || abilityUi.rectangles === undefined || abilityUi.rectangles.length === 0) return;
    if (abilityUi.selectedRectangleIndex === undefined) abilityUi.selectedRectangleIndex = 0;
    const clientId = game.multiplayer.myClientId;
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
