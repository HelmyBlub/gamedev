type Game = {
    canvasElement: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    characters: Character[],
    players: Player[],
    projectiles: Projectile[],
    killCounter: number,
    startTime: number,
    maxTime: number,
    ended: boolean,
    highscore: {
        scores: number[],
        maxLength: 10,
    },
}

function gameRestart(game: Game) {
    gameInit(game);
}

function gameInit(game: Game) {
    game.projectiles = [];
    game.characters = [];
    game.players = [];
    game.killCounter = 0;
    game.startTime = performance.now();
    game.ended = false;

    addPlayer(game, 100, 100, createDefaultKeyBindings1());
    addPlayer(game, 200, 100, createDefaultKeyBindings2());
}

function addPlayer(game: Game, x: number, y: number, keyCodeToActionPressed: Map<string, keyof ActionsPressed>) {
    game.characters.push(createPlayerCharacter(x, y));
    game.players.push(createPlayer(game.characters.length - 1, keyCodeToActionPressed));
}

function createDefaultGameData(c: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Game {
    return {
        canvasElement: c,
        ctx: ctx,
        projectiles: [],
        characters: [],
        players: [],
        killCounter: 0,
        startTime: 0,
        ended: false,
        maxTime: 5000,
        highscore: {
            scores: [],
            maxLength: 10,
        }
    }
}