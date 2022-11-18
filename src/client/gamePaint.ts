function paintAll(ctx: CanvasRenderingContext2D) {
    paintBackground(ctx);
    paintCharacters(ctx, gameData.characters);
    paintProjectiles(ctx, gameData.projectiles);
    paintKillCounter(ctx);
    if (gameData.ended) {
        paintHighscoreBoard(gameData.ctx);
    } else {
        paintTimeLeft(ctx);
    }
}

function paintHighscoreBoard(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "white";
    ctx.font = "18px Arial";

    ctx.fillText("Restart with Key \"R\" ", 150, 20);
    ctx.fillText("Scores: ", 150, 60);
    for (let i = 0; i < gameData.highscore.scores.length; i++) {
        ctx.fillText((i + 1) + ": " + gameData.highscore.scores[i], 150, 80 + 20 * i);
    }
}

function paintTimeLeft(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "white";
    ctx.font = "18px Arial";
    let timeLeft = Math.round((gameData.startTime + gameData.maxTime - performance.now()) / 1000);
    ctx.fillText("Timer: " + timeLeft, 10, 40);
}

function paintKillCounter(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "white";
    ctx.font = "18px Arial";
    ctx.fillText("Kills: " + gameData.killCounter, 10, 20);
}

function paintBackground(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "green";
    ctx.fillRect(0, 0, 400, 300);
}

