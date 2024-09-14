import { findMyCharacter } from "../character/character.js";
import { handleCommand } from "../commands.js";
import { calculateDirection } from "../game.js";
import { Game, Position } from "../gameModel.js";
import { MOVE_ACTION, MoveData } from "./playerInput.js";

export function controllerInput(game: Game) {
    for (const gamepad of navigator.getGamepads()) {
        if (!gamepad) continue;
        moveInput(gamepad, game);
        upgradeInput(gamepad, game);
        abilityInput(gamepad, game);
        // testStuff(gamepad, game);
    }
}

function testStuff(gamepad: Gamepad, game: Game) {
    for (let i = 0; i < gamepad.buttons.length; i++) {
        let button = gamepad.buttons[i];
        if (button.pressed) console.log(i);
    }
}

function axesToOffsetPosition(gamepad: Gamepad): Position {
    let x = gamepad.axes[2];
    let y = gamepad.axes[3];

    return { x: x * 300, y: y * 300 };
}

function abilityInput(gamepad: Gamepad, game: Game) {
    const abilityButtonsMapping = [
        { buttonIndex: 6, actionMapping: "ability1" },
        { buttonIndex: 7, actionMapping: "ability2" },
        { buttonIndex: 5, actionMapping: "ability3" },
    ];
    const character = findMyCharacter(game);
    if (!character) return;
    const offset = axesToOffsetPosition(gamepad);
    const castPosition = { x: character.x + offset.x, y: character.y + offset.y };
    let action: string | undefined = undefined;
    for (let mapping of abilityButtonsMapping) {
        const button = gamepad.buttons[mapping.buttonIndex];
        if (button.pressed) {
            action = mapping.actionMapping;
            handleCommand(game, {
                command: "playerInput",
                clientId: game.multiplayer.myClientId,
                data: { action: action, isKeydown: true, castPosition: castPosition, castPositionRelativeToCharacter: offset },
            });
        }
    }
}

function upgradeInput(gamepad: Gamepad, game: Game) {
    const character = findMyCharacter(game);
    if (!character || character.upgradeChoices.choices.length <= 0) return;

    let currentButton: number | undefined = undefined;
    for (let i = 0; i < 5; i++) {
        const button = gamepad.buttons[i];
        if (button.pressed) {
            currentButton = i;
            break;
        }
    }
    if (currentButton === undefined || character.upgradeChoices.choices.length <= currentButton) return;

    handleCommand(game, {
        command: "playerInput",
        clientId: game.multiplayer.myClientId,
        data: { action: "upgrade" + (currentButton + 1), isKeydown: true },
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
    }
    const clientId = game.multiplayer.myClientId;

    handleCommand(game, {
        command: "playerInput",
        clientId: clientId,
        data: { ...moveData, action: MOVE_ACTION },
    });
}
