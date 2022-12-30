import { gameInit, runner } from "./game.js";
import { createDefaultGameData, Game } from "./gameModel.js";
import { keyDown, keyUp } from "./playerInput.js";

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
    if(!forTesting && canvasElementId){
        let c: HTMLCanvasElement | null = document.getElementById(canvasElementId) as HTMLCanvasElement;
        if (c == null) throw new DOMException("canvas element not found");
        let ctx: CanvasRenderingContext2D | null = c.getContext("2d");
        if (ctx == null) throw new DOMException("CanvasRenderingContext2D element not found");
        game = createDefaultGameData(c, ctx);
        document.addEventListener('keydown', (e) => keyDown(e, game), false);
        document.addEventListener('keyup', (e) => keyUp(e, game), false);
        addEventListener("resize", (event) => {
            c!.height = window.innerHeight - 2;
            c!.width = window.innerWidth - 2;
        });
        c.height = window.innerHeight - 2;
        c.width = window.innerWidth - 2;
    }else{
        game = createDefaultGameData(undefined, undefined);
    }

    gameInit(game);
    game.state.players[0].character.isDead = true;
    runner(game);
    return game;
}

start();
