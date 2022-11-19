var gameData: Game;

function start() {
    websocketConnect();
    document.addEventListener('keydown', keyDown, false);
    document.addEventListener('keyup', keyUp, false);
    let c: HTMLCanvasElement | null = document.getElementById("myCanvas") as HTMLCanvasElement;
    if (c == null) throw new DOMException("canvas element not found");
    let ctx: CanvasRenderingContext2D | null = c.getContext("2d");
    if (ctx == null) throw new DOMException("CanvasRenderingContext2D element not found");

    gameData = createDefaultGameData(c, ctx);
    gameInit(gameData);
    gameData.state.time = gameData.maxTime + 1;
    runner();
}

function runner() {
    const tickInterval = 16;

    if(gameData.multiplayer.websocket === null){
        const timeNow = performance.now();
        while (!gameData.state.ended && timeNow > gameData.realStartTime + gameData.state.time) {
            tick(tickInterval);
        }    
    }else{
        while (!gameData.state.ended && gameData.multiplayer.serverGameTime >= gameData.state.time + tickInterval) {
            tick(tickInterval);
        }    
    }
    paintAll(gameData.ctx);
    setTimeout(runner, tickInterval);
}

function tick(gameTimePassed: number) {
    if (!gameData.state.ended) {
        gameData.state.time += gameTimePassed;
        tickPlayerInputs(gameData.state.playerInputs, gameData.state.time);
        if(gameData.state.characters.length < 100){
            gameData.state.characters.push(createRandomEnemy());
        }
        tickCharacters(gameData.state.characters);
        tickProjectiles(gameData.state.projectiles);
        detectProjectileToCharacterHit(gameData);
        if (gameEndedCheck(gameData)) endGame(gameData);
    }
}

function tickPlayerInputs(playerInputs: PlayerInput[], currentTime: number) {
    for (let i = playerInputs.length - 1; i >= 0; i--) {
        if (playerInputs[i].executeTime <= currentTime) {
            if (playerInputs[i].command === "playerInput") {
                if (playerInputs[i].executeTime <= currentTime - 16) {
                    console.log("playerAction to late", currentTime - playerInputs[i].executeTime, playerInputs[i]);
                }
                playerAction(playerInputs[i].data.playerIndex, playerInputs[i].data.action, playerInputs[i].data.isKeydown);
                playerInputs.splice(i,1);
            }
        }
    }
}

function endGame(game: Game) {
    game.state.ended = true;
    game.state.highscore.scores.push(game.state.killCounter);
    game.state.highscore.scores.sort((a, b) => b - a);
    if (game.state.highscore.scores.length > game.state.highscore.maxLength) {
        game.state.highscore.scores.pop();
    }
}

function gameEndedCheck(game: Game) {
    return game.state.time > game.maxTime;
}

function detectProjectileToCharacterHit(gameData: Game) {
    let characters: Character[] = gameData.state.characters;

    for (let projIt = 0; projIt < gameData.state.projectiles.length; projIt++) {
        let projectile = gameData.state.projectiles[projIt];
        for (let charIt = characters.length - 1; charIt >= 0; charIt--) {
            let c = characters[charIt];
            if (c.faction === projectile.faction) continue;
            let xDiff = c.x - projectile.x;
            let yDiff = c.y - projectile.y;
            let distance = Math.sqrt(xDiff * xDiff + yDiff * yDiff);
            if (distance < projectile.size + c.size) {
                c.hp -= projectile.damage;
                if (c.hp < 0) {
                    gameData.state.characters.splice(charIt, 1);
                    gameData.state.killCounter++;
                }
            }
        }
    }
}
