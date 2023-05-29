import { onDomLoadSetAbilitiesFunctions } from "./ability/ability.js";
import { onDomLoadSetCharacterClasses } from "./character/playerCharacters/playerCharacters.js";
import { addSniperClass } from "./character/playerCharacters/sniperCharacter.js";
import { addSwordClass } from "./character/playerCharacters/swordCharacterClass.js";
import { addTowerClass } from "./character/playerCharacters/towerCharacterClass.js";
import { handleCommand } from "./commands.js";
import { onDomLoadSetDebuffsFunctions } from "./debuff/debuff.js";
import { gameRestart, runner, setRelativeMousePosition } from "./game.js";
import { createDefaultGameData, Game } from "./gameModel.js";
import { keyDown, keyUp, mouseDown, mouseUp } from "./playerInput.js";
import { addHTMLDebugCheckboxesToSettings } from "./settingsHtmlMenu.js";

var gameCount: number = 0;

export function start() {
    createGame("myCanvas");
}

export function startMore() {
    let nextCssId = "myCanvas_" + gameCount;
    gameCount++;
    let canvasHTML = `<canvas id="${nextCssId}" width="400" height="300" style="border:1px solid #000000;"></canvas>`;
    document.body.insertAdjacentHTML("beforeend", canvasHTML);
    createGame(nextCssId);
}

export function createGame(canvasElementId: string | undefined, forTesting: boolean = false): Game {
    let game: Game;
    if (!forTesting && canvasElementId) {
        let c: HTMLCanvasElement | null = document.getElementById(canvasElementId) as HTMLCanvasElement;
        if (c == null) throw new DOMException("canvas element not found");
        let ctx: CanvasRenderingContext2D | null = c.getContext("2d");
        if (ctx == null) throw new DOMException("CanvasRenderingContext2D element not found");
        game = createDefaultGameData(c, ctx);
        document.addEventListener('keydown', (e) => keyDown(e, game), false);
        document.addEventListener('keyup', (e) => keyUp(e, game), false);
        c.addEventListener('mousedown', (e) => mouseDown(e, game));
        c.addEventListener('mousemove', (e) => setRelativeMousePosition(e, game));
        c.addEventListener('mouseup', (e) => mouseUp(e, game));
        addEventListener("resize", (event) => {
            c!.height = window.innerHeight - 2;
            c!.width = window.innerWidth - 2;
        });
        c.height = window.innerHeight - 2;
        c.width = window.innerWidth - 2;
        addHTMLDebugCheckboxesToSettings(game);
        const commandRestart = {
            command: "restart",
            clientId: game.multiplayer.myClientId,
            recordInputs: true,
            replay: false,
            testMapSeed: game.state.map.seed,
            testRandomStartSeed: game.state.randomSeed.seed
        };
        handleCommand(game, commandRestart);
    } else {
        game = createDefaultGameData(undefined, undefined);
    }
    runner(game);
    return game;
}

document.addEventListener("DOMContentLoaded", function () {
    onDomLoadSetCharacterClasses();
    onDomLoadSetAbilitiesFunctions();
    onDomLoadSetDebuffsFunctions();

    start();
});
