import { handleCommand } from "../commands.js";
import { getCameraPosition } from "../game.js";
import { Game, Position } from "../gameModel.js";
import { ABILITY_ACTIONS, MOVE_ACTION, MoveData } from "../playerInput.js";

export function autoPlay(game: Game) {
    if (!game.testing || !game.testing.autoPlay || !game.testing.autoPlay.autoPlaying) return;
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
