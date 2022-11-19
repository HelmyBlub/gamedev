type GameState = {
    characters: Character[],
    projectiles: Projectile[],
    killCounter: number,
    time: number;        
    ended: boolean,
    randumNumberGenerator: {
        seed: number
    }
    playerInputs: PlayerInput[],
    highscore: {
        scores: number[],
        maxLength: 10,
    },
}

type Game = {
    canvasElement: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    state: GameState,
    players: Player[],
    maxTime: number,
    realStartTime: number;
    multiplayer: {
        websocket: WebSocket | null,
    },
}

function gameRestart(game: Game) {
    gameInit(game);
}

function gameInit(game: Game) {
    game.state.projectiles = [];
    game.state.characters = [];
    game.players = [];
    game.state.killCounter = 0;
    game.state.ended = false;
    game.state.time = 0;
    game.realStartTime = performance.now();
    game.state.playerInputs = [];

    addPlayer(game, 100, 100, createDefaultKeyBindings1());
    addPlayer(game, 200, 100, createDefaultKeyBindings2());
}

function addPlayer(game: Game, x: number, y: number, keyCodeToActionPressed: Map<string, keyof ActionsPressed>) {
    game.state.characters.push(createPlayerCharacter(x, y));
    game.players.push(createPlayer(game.state.characters.length - 1, keyCodeToActionPressed));
}

function createDefaultGameData(c: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Game {
    return {
        canvasElement: c,
        ctx: ctx,
        state:{
            projectiles: [],
            characters: [],
            killCounter: 0,
            ended: false,
            time: 0,
            playerInputs: [],
            highscore: {
                scores: [],
                maxLength: 10,
            },
            randumNumberGenerator: {
                seed: 0
            }
        },
        players: [],
        maxTime: 30000,
        realStartTime: 0,
        multiplayer: {
            websocket: null
        },
    }
}