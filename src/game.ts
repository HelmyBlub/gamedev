type Game = {
    canvasElement: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    characters: Character[],
    playerCharacterIndex: number,
    projectiles: Projectile[],
    actionsPressed: ActionsPressed,
    killCounter: number,
    startTime: number,
    maxTime: number,
    ended: boolean,
    highscore: {
        scores:number[],
        maxLength: 10,
    },
}

function gameRestart(game: Game) {
    gameInit(game);
}

function gameInit(game: Game){
    game.projectiles = [];
    game.characters = [createPlayer()];
    game.playerCharacterIndex = 0;
    game.killCounter = 0;
    game.startTime = performance.now();
    game.ended = false;
}

function createDefaultGameData(c: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Game {
    return {
        canvasElement: c,
        ctx: ctx,
        projectiles: [],
        characters: [],
        playerCharacterIndex: -1,
        actionsPressed: {
            left: false,
            down: false,
            right: false,
            up: false
        },
        killCounter: 0,
        startTime: 0,
        ended: false,
        maxTime: 5000,
        highscore: {
            scores:[],
            maxLength: 10,
        }
    }
}