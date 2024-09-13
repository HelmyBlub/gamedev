import { handleCommand } from "../commands.js";
import { getCameraPosition } from "../game.js";
import { Game, Position } from "../gameModel.js";
import { ABILITY_ACTIONS, MOVE_ACTION, MoveData } from "../input/playerInput.js";
import { touchMove, touchStart } from "../input/touchInput.js";

export function autoPlay(game: Game) {
    //autoTouch(game);
    if (!game.testing || !game.testing.autoPlay || !game.testing.autoPlay.autoPlaying) return;
    autoMove(game);
}

function autoTouch(game: Game) {
    if (!game.canvasElement) return;
    let touchMoveSize = game.UI.touchInfo.touchMoveCornerSize;
    if (game.UI.touchInfo.touchStartPinch === undefined || game.UI.touchInfo.touchStartPinch.length < 2) {
        let touchMoveLeft = game.canvasElement.width / 2 - touchMoveSize + Math.random() * touchMoveSize;
        let touchMoveTop = game.canvasElement.height / 2 - touchMoveSize + Math.random() * touchMoveSize;
        const identifier = Math.floor(Math.random() * 10000);
        const event: any = {
            preventDefault: () => { },
            changedTouches: [{
                identifier: identifier,
                clientX: touchMoveLeft,
                clientY: touchMoveTop,
            }]
        }
        touchStart(event, game);
    } else {
        const event: any = {
            preventDefault: () => { },
            changedTouches: [],
            touches: [],
        }
        for (let i = 0; i < 2; i++) {
            const identifier = game.UI.touchInfo.touchStartPinch[i].idRef;
            let touchMoveLeft = game.canvasElement.width / 2 - touchMoveSize + Math.random() * touchMoveSize;
            let touchMoveTop = game.canvasElement.height / 2 - touchMoveSize + Math.random() * touchMoveSize;
            event.touches.push({
                identifier: identifier,
                clientX: touchMoveLeft,
                clientY: touchMoveTop,
            });
        }
        touchMove(event, game);
    }
}

function autoMove(game: Game) {
    if (game.testing.autoPlay.nextAutoButtonPressTime <= performance.now()) {
        game.testing.autoPlay.nextAutoButtonPressTime = performance.now() + 100 + Math.random() * 100;

        let random = Math.random();
        if (random > 0.75) {
            let cameraPosition = getCameraPosition(game);
            let castPosition: Position = {
                x: Math.random() * 200 - 100 + cameraPosition.x,
                y: Math.random() * 200 - 100 + cameraPosition.y
            }
            handleCommand(game, {
                command: "playerInput",
                clientId: game.multiplayer.myClientId,
                data: { action: ABILITY_ACTIONS[0], isKeydown: true, castPosition: castPosition },
            });

        } else {
            const moveData: MoveData = {
                direction: Math.floor(Math.random() * 4) * Math.PI * 2,
                faktor: 1,
            }
            handleCommand(game, {
                command: "playerInput",
                clientId: game.multiplayer.myClientId,
                data: { ...moveData, action: MOVE_ACTION, isKeydown: Math.random() > 0.5 },
            });
        }
    }
}
