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
    gameData.time = gameData.maxTime + 1;
    runner();
}

function runner() {
    const tickInterval = 16;
    const timeNow = performance.now();
    while (!gameData.ended && timeNow > gameData.realStartTime + gameData.time) {
        tick(tickInterval);
    }
    paintAll(gameData.ctx);
    setTimeout(runner, tickInterval);
}

function tick(gameTimePassed: number) {
    if (!gameData.ended) {
        gameData.time += gameTimePassed;
        tickPlayerInputs(gameData.playerInputs, gameData.time);
        gameData.characters.push(createRandomEnemy());
        tickCharacters(gameData.characters);
        tickProjectiles(gameData.projectiles);
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
                playerInputChange(playerInputs[i].data.keycode, playerInputs[i].data.isKeydown);
                playerInputs.splice(i,1);
            }
        }
    }
}

function endGame(game: Game) {
    game.ended = true;
    game.highscore.scores.push(game.killCounter);
    game.highscore.scores.sort((a, b) => b - a);
    if (game.highscore.scores.length > game.highscore.maxLength) {
        game.highscore.scores.pop();
    }
}

function gameEndedCheck(game: Game) {
    return game.time > game.maxTime;
}

function detectProjectileToCharacterHit(gameData: Game) {
    let characters: Character[] = gameData.characters;

    for (let projIt = 0; projIt < gameData.projectiles.length; projIt++) {
        let projectile = gameData.projectiles[projIt];
        for (let charIt = characters.length - 1; charIt >= 0; charIt--) {
            let c = characters[charIt];
            if (c.faction === projectile.faction) continue;
            let xDiff = c.x - projectile.x;
            let yDiff = c.y - projectile.y;
            let distance = Math.sqrt(xDiff * xDiff + yDiff * yDiff);
            if (distance < projectile.size + c.size) {
                c.hp -= projectile.damage;
                if (c.hp < 0) {
                    gameData.characters.splice(charIt, 1);
                    gameData.killCounter++;
                }
            }
        }
    }
}
