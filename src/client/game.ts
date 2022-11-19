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
    highscore: {
        scores: number[],
        maxLength: 10,
    },
    clientIds: number[],
}

type Game = {
    canvasElement: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    state: GameState,
    maxTime: number,
    realStartTime: number,
    clientKeyBindings: {
        playerIndex: number,
        keyCodeToActionPressed: Map<string, keyof ActionsPressed>,
    }[],
    multiplayer: {
        myClientId: number,
        websocket: WebSocket | null,
        serverGameTime: number,
    },
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

    if (gameData.multiplayer.websocket !== null) {
        game.multiplayer.serverGameTime = 0;
        for (let i = 0; i < gameData.state.clientIds.length; i++) {
            addPlayer(game, 100, 100 + i * 50);
            if (gameData.multiplayer.myClientId === gameData.state.clientIds[i]) {
                game.clientKeyBindings.push({
                    playerIndex: i,
                    keyCodeToActionPressed: createDefaultKeyBindings1()
                });
            }
        }
    } else {
        addPlayer(game, 100, 100);
        game.clientKeyBindings.push({
            playerIndex: 0,
            keyCodeToActionPressed: createDefaultKeyBindings1()
        });
    }
}

function addPlayer(game: Game, x: number, y: number) {
    game.state.characters.push(createPlayerCharacter(x, y));
    game.state.players.push(createPlayer(game.state.characters.length - 1));
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
            highscore: {
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
        maxTime: 30000,
        realStartTime: 0,
        multiplayer: {
            myClientId: -1,
            websocket: null,
            serverGameTime: 0,
        },
    }
}