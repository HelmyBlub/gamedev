type Game = {
    canvasElement: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    characters: Character[],
    players: Player[],
    projectiles: Projectile[],
    killCounter: number,
    maxTime: number,
    time: number;
    realStartTime: number;
    ended: boolean,
    multiplayer:{
        websocket: WebSocket | null
    },
    highscore: {
        scores: number[],
        maxLength: 10,
    },
    randumNumberGenerator: {
        seed: number
    }
}

function gameRestart(game: Game) {
    gameInit(game);
}

function gameInit(game: Game) {
    game.projectiles = [];
    game.characters = [];
    game.players = [];
    game.killCounter = 0;
    game.ended = false;
    game.time = 0;
    game.realStartTime = performance.now();

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
        ended: false,
        maxTime: 30000,
        time: 0,
        realStartTime: 0,
        highscore: {
            scores: [],
            maxLength: 10,
        },
        multiplayer:{
            websocket: null
        },
        randumNumberGenerator:{
            seed: 0
        }
    }
}