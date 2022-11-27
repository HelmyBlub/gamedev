var gameDatas: Game[] = [];

function start() {
    createGame("myCanvas");
}

function startMore(){
    let nextCssId = "myCanvas_" + gameDatas.length.toString();
    let canvasHTML = `<canvas id="${nextCssId}" width="400" height="300" style="border:1px solid #000000;"></canvas>`;
    document.body.insertAdjacentHTML("beforeend", canvasHTML);
    createGame(nextCssId);
}

function createGame(canvasElementId: string){
    let c: HTMLCanvasElement | null = document.getElementById(canvasElementId) as HTMLCanvasElement;
    if (c == null) throw new DOMException("canvas element not found");
    let ctx: CanvasRenderingContext2D | null = c.getContext("2d");
    if (ctx == null) throw new DOMException("CanvasRenderingContext2D element not found");

    const game = createDefaultGameData(c, ctx);
    gameDatas.push(game);
    document.addEventListener('keydown', (e) => keyDown(e, game), false);
    document.addEventListener('keyup', (e) => keyUp(e, game), false);

    gameInit(game);
    game.state.characters[0].hp = 0;
    runner(game);

    websocketConnect(game);
}
