type GameState = {
    idCounter: number,
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
        clientIdRef: number,
        keyCodeToActionPressed: Map<string, string>,
    }[],
    multiplayer: {
        myClientId: number,
        websocket: WebSocket | null,
        maxServerGameTime: number,
        smoothedGameTime: number,
        delay: number,
        maxDelay: number,
        minDelay: number,
        lastSendTime: number[],
        updateInterval: number,
    },
    avaialbleUpgrades: Map<string, UpgradeOption>,
}

function getNextId(state: GameState){
    return state.idCounter++;
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
    if (game.multiplayer.websocket !== null) {
        game.multiplayer.maxServerGameTime = 0;
        game.multiplayer.smoothedGameTime = 0;
    }
}

function createDefaultGameData(c: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Game {
    return {
        canvasElement: c,
        ctx: ctx,
        state: {
            idCounter: 0,
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
            maxServerGameTime: 0,
            smoothedGameTime: 0,
            delay: 0,
            maxDelay: 0,
            minDelay: 0,
            lastSendTime: [],
            updateInterval: -1,
        },
        avaialbleUpgrades: createDefaultUpgradeOptions(),
    }
}

function detectProjectileToCharacterHit(state: GameState) {
    let characters: Character[] = state.characters;

    for (let projIt = 0; projIt < state.projectiles.length; projIt++) {
        let projectile = state.projectiles[projIt];
        for (let charIt = characters.length - 1; charIt >= 0; charIt--) {
            let c = characters[charIt];
            if (c.faction === projectile.faction) continue;
            let distance = calculateDistance(c, projectile);
            if (distance < projectile.size + c.size) {
                c.hp -= projectile.damage;
            }
        }
    }
}

function calculateDistance(objectA: { x: number, y: number }, objectB: { x: number, y: number }) {
    let xDiff = objectA.x - objectB.x;
    let yDiff = objectA.y - objectB.y;
    return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
}

function gameEndedCheck(game: Game) {
    let alivePlayersCount = countAlivePlayers(game.state.characters)
    if (alivePlayersCount === 0) {
        return true;
    }
    return false;
}

function endGame(state: GameState) {
    state.ended = true;
    state.highscores.scores.push(state.killCounter);
    state.highscores.scores.sort((a, b) => b - a);
    if (state.highscores.scores.length > state.highscores.maxLength) {
        state.highscores.scores.pop();
    }
}

function runner(game: Game) {
    const tickInterval = 16;
    const timeNow = performance.now();

    if (game.multiplayer.websocket === null) {
        while (!game.state.ended && timeNow > game.realStartTime + game.state.time) {
            tick(tickInterval, game);
        }
    } else {
        while (!game.state.ended && game.multiplayer.maxServerGameTime >= game.state.time + tickInterval) {
            let delayDiff = game.multiplayer.delay - game.multiplayer.minDelay;
            if(timeNow < game.realStartTime + game.state.time + game.multiplayer.updateInterval + delayDiff){
                break;
            }
            tick(tickInterval, game);
        }
    }
    paintAll(game.ctx, game);
    setTimeout(() => runner(game), tickInterval);
}

function tick(gameTimePassed: number, game: Game) {
    if (!game.state.ended) {
        game.state.time += gameTimePassed;
        tickPlayerInputs(game.state.playerInputs, game.state.time, game);
        if (game.state.characters.length < 100) {
            game.state.characters.push(createRandomEnemy(game));
        }
        tickCharacters(game.state.characters, game.state.projectiles);
        tickProjectiles(game.state.projectiles);
        detectProjectileToCharacterHit(game.state);
        detectCharacterDeath(game.state.characters, game.state, game.avaialbleUpgrades);
        if (gameEndedCheck(game)) endGame(game.state);
    }
}