import { findMyCharacter } from "../character/character.js";
import { handleCommand } from "../commands.js";
import { calculateDirection } from "../game.js";
import { Game, Position } from "../gameModel.js";
import { executeUiAction, MOUSE_ACTION, MOVE_ACTION, MoveData } from "./playerInput.js";

export type ControllerButtonsPressed = boolean[];

export function controllerInput(game: Game) {
    for (const gamepad of navigator.getGamepads()) {
        if (!gamepad) continue;
        if (game.controllersButtons.length <= gamepad.index) {
            game.controllersButtons.push(createDefaultControllerButtonsPressed(gamepad));
        }
        autoSendAimStickPosition(gamepad, game);
        moveInput(gamepad, game);
        upgradeInput(gamepad, game);
        abilityInput(gamepad, game);
        restartInput(gamepad, game);
    }
}

function axesToOffsetPosition(gamepad: Gamepad): Position {
    let x = gamepad.axes[2];
    let y = gamepad.axes[3];

    return { x: x * 300, y: y * 300 };
}

function restartInput(gamepad: Gamepad, game: Game) {
    const restartButtonIndex = 8;
    const controllerButtonsDown = game.controllersButtons[gamepad.index];
    if (gamepad.buttons[restartButtonIndex].pressed) {
        if (!controllerButtonsDown[restartButtonIndex]) {
            controllerButtonsDown[restartButtonIndex] = true;
            executeUiAction("Restart", true, game);
        }
    } else if (controllerButtonsDown[restartButtonIndex]) {
        controllerButtonsDown[restartButtonIndex] = false;
    }
}

function abilityInput(gamepad: Gamepad, game: Game) {
    const character = findMyCharacter(game);
    if (!character) return;
    const abilityButtonsMapping = [
        { buttonIndex: 6, actionMapping: "ability1" },
        { buttonIndex: 7, actionMapping: "ability2" },
        { buttonIndex: 5, actionMapping: "ability3" },
    ];
    const controllerButtonsDown = game.controllersButtons[gamepad.index];
    const offset = axesToOffsetPosition(gamepad);
    const castPosition = { x: character.x + offset.x, y: character.y + offset.y };
    let action: string | undefined = undefined;
    for (let mapping of abilityButtonsMapping) {
        const button = gamepad.buttons[mapping.buttonIndex];
        if (button.pressed) {
            if (controllerButtonsDown[mapping.buttonIndex]) continue;
            controllerButtonsDown[mapping.buttonIndex] = true;
            action = mapping.actionMapping;
            handleCommand(game, {
                command: "playerInput",
                clientId: game.multiplayer.myClientId,
                data: { action: action, isKeydown: true, castPosition: castPosition, castPositionRelativeToCharacter: offset },
            });
        } else if (controllerButtonsDown[mapping.buttonIndex]) {
            controllerButtonsDown[mapping.buttonIndex] = false;
            action = mapping.actionMapping;
            handleCommand(game, {
                command: "playerInput",
                clientId: game.multiplayer.myClientId,
                data: { action: action, isKeydown: false, castPosition: castPosition, castPositionRelativeToCharacter: offset },
            });
        }
    }
}

function autoSendAimStickPosition(gamepad: Gamepad, game: Game) {
    if (game.testing.replay) return;
    if (game.UI.inputType !== "controller") return;
    if (game.multiplayer.autosendMousePosition.sendForOwners.length === 0) return;
    const character = findMyCharacter(game);
    if (!character) return;
    if (game.multiplayer.autosendMousePosition.nextTime <= game.state.time) {
        const offset = axesToOffsetPosition(gamepad);
        const castPosition = { x: character.x + offset.x, y: character.y + offset.y };

        handleCommand(game, {
            command: "playerInput",
            clientId: game.multiplayer.myClientId,
            data: { action: MOUSE_ACTION, mousePosition: castPosition },
        });
        game.multiplayer.autosendMousePosition.nextTime = game.state.time + game.multiplayer.autosendMousePosition.interval;
    }
}

function upgradeInput(gamepad: Gamepad, game: Game) {
    const character = findMyCharacter(game);
    if (!character || character.upgradeChoices.choices.length <= 0) return;
    const controllerButtonsDown = game.controllersButtons[gamepad.index];

    const upgradeButtonsMapping = [
        { buttonIndex: 0, actionMapping: "upgrade1" },
        { buttonIndex: 1, actionMapping: "upgrade2" },
        { buttonIndex: 2, actionMapping: "upgrade3" },
        { buttonIndex: 3, actionMapping: "upgrade4" },
        { buttonIndex: 4, actionMapping: "upgrade5" },
    ];
    let action: string | undefined = undefined;
    for (let mapping of upgradeButtonsMapping) {
        const button = gamepad.buttons[mapping.buttonIndex];
        if (button.pressed) {
            if (controllerButtonsDown[mapping.buttonIndex]) continue;
            action = mapping.actionMapping;
            controllerButtonsDown[mapping.buttonIndex] = true;
            break;
        } else if (controllerButtonsDown[mapping.buttonIndex]) {
            controllerButtonsDown[mapping.buttonIndex] = false;
        }
    }
    if (action === undefined) return;

    handleCommand(game, {
        command: "playerInput",
        clientId: game.multiplayer.myClientId,
        data: { action: action, isKeydown: true },
    });

}

function moveInput(gamepad: Gamepad, game: Game) {
    const x = gamepad.axes[0];
    const y = gamepad.axes[1];
    let moveFactor = 1;
    if (Math.abs(x) < 0.1 && Math.abs(y) < 0.1) {
        if (game.UI.inputType !== "controller") return;
        moveFactor = 0
    } else {
        game.UI.inputType = "controller";
    };
    const direction = calculateDirection({ x: 0, y: 0 }, { x, y });

    const moveData: MoveData = {
        direction: direction,
        faktor: moveFactor,
        action: MOVE_ACTION,
    }
    const clientId = game.multiplayer.myClientId;

    handleCommand(game, {
        command: "playerInput",
        clientId: clientId,
        data: moveData,
    });
}

function createDefaultControllerButtonsPressed(gamepad: Gamepad): ControllerButtonsPressed {
    const controllerButtonsPressed: boolean[] = [];
    for (let i = 0; i < gamepad.buttons.length; i++) {
        controllerButtonsPressed.push(false);
    }
    return controllerButtonsPressed;
}
