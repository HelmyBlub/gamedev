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
    game.state.time = game.maxTime + 1;
    runner(game);

    websocketConnect(game);
}

function runner(game: Game) {
    const tickInterval = 16;

    if(game.multiplayer.websocket === null){
        const timeNow = performance.now();
        while (!game.state.ended && timeNow > game.realStartTime + game.state.time) {
            tick(tickInterval, game);
        }    
    }else{
        while (!game.state.ended && game.multiplayer.serverGameTime >= game.state.time + tickInterval) {
            tick(tickInterval, game);
        }    
    }
    paintAll(game.ctx, game);
    setTimeout(() => runner(game), tickInterval);
}

function tick(gameTimePassed: number, game: Game) {
    if (!game.state.ended) {
        game.state.time += gameTimePassed;
        tickPlayerInputs(game.state.playerInputs, game.state.time, game.state);
        if(game.state.characters.length < 100){
            game.state.characters.push(createRandomEnemy(game));
        }
        tickCharacters(game.state.characters, game.state.projectiles);
        tickProjectiles(game.state.projectiles);
        detectProjectileToCharacterHit(game.state);
        if (gameEndedCheck(game)) endGame(game.state);
    }
}

function tickPlayerInputs(playerInputs: PlayerInput[], currentTime: number, state: GameState) {
    for (let i = playerInputs.length - 1; i >= 0; i--) {
        if (playerInputs[i].executeTime <= currentTime) {
            if (playerInputs[i].command === "playerInput") {
                if (playerInputs[i].executeTime <= currentTime - 16) {
                    console.log("playerAction to late", currentTime - playerInputs[i].executeTime, playerInputs[i]);
                }
                playerAction(playerInputs[i].data.playerIndex, playerInputs[i].data.action, playerInputs[i].data.isKeydown, state);
                playerInputs.splice(i,1);
            }
        }
    }
}

function endGame(state: GameState) {
    state.ended = true;
    state.highscores.scores.push(state.killCounter);
    state.highscores.scores.sort((a, b) => b - a);
    if (state.highscores.scores.length > state.highscores.maxLength) {
        state.highscores.scores.pop();
    }
}

function gameEndedCheck(game: Game) {
    return game.state.time > game.maxTime;
}

function detectProjectileToCharacterHit(state: GameState) {
    let characters: Character[] = state.characters;

    for (let projIt = 0; projIt < state.projectiles.length; projIt++) {
        let projectile = state.projectiles[projIt];
        for (let charIt = characters.length - 1; charIt >= 0; charIt--) {
            let c = characters[charIt];
            if (c.faction === projectile.faction) continue;
            let xDiff = c.x - projectile.x;
            let yDiff = c.y - projectile.y;
            let distance = Math.sqrt(xDiff * xDiff + yDiff * yDiff);
            if (distance < projectile.size + c.size) {
                c.hp -= projectile.damage;
                if (c.hp < 0) {
                    state.characters.splice(charIt, 1);
                    state.killCounter++;
                }
            }
        }
    }
}
