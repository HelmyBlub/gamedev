type GameState = {
    characters: Character[],
    projectiles: Projectile[],
    players: Player[],
    killCounter: number,
    time: number;
    ended: boolean,
    randumNumberGenerator: {
        seed: number
    }
    playerInputs: PlayerInput[],
    highscores: Highscores,
    clientIds: number[],
}

type Highscores = {
    scores: number[],
    maxLength: 10,
}

type Game = {
    canvasElement: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    state: GameState,
    realStartTime: number,
    clientKeyBindings: {
        playerIndex: number,
        keyCodeToActionPressed: Map<string, keyof MoveActions | keyof UpgradeActions>,
    }[],
    multiplayer: {
        myClientId: number,
        websocket: WebSocket | null,
        serverGameTime: number,
    },
    avaialbleUpgrades: Map<string, UpgradeOption>,
}

function gameRestart(game: Game) {
    gameInit(game);
}

function gameInit(game: Game) {
    game.state.projectiles = [];
    game.state.characters = [];
    game.state.players = [];
    game.state.killCounter = 0;
    game.state.ended = false;
    game.state.time = 0;
    game.realStartTime = performance.now();
    game.state.playerInputs = [];
    game.clientKeyBindings = [];
    gameInitPlayers(game);
}

function createDefaultGameData(c: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Game {
    return {
        canvasElement: c,
        ctx: ctx,
        state: {
            projectiles: [],
            characters: [],
            killCounter: 0,
            ended: false,
            time: 0,
            playerInputs: [],
            highscores: {
                scores: [],
                maxLength: 10,
            },
            randumNumberGenerator: {
                seed: 0
            },
            players: [],
            clientIds: [],
        },
        clientKeyBindings: [],
        realStartTime: 0,
        multiplayer: {
            myClientId: -1,
            websocket: null,
            serverGameTime: 0,
        },
        avaialbleUpgrades: createDefaultUpgradeOptions(),
    }
}