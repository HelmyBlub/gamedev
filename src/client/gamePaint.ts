function paintAll(ctx: CanvasRenderingContext2D, game: Game) {
    paintBackground(ctx, game.canvasElement);
    paintCharacters(ctx, game.state.characters);
    paintProjectiles(ctx, game.state.projectiles);
    paintKillCounter(ctx, game.state.killCounter);
    if (game.state.ended) {
        paintHighscoreBoard(game.ctx, game.state.highscores);
    } else {
        paintPlayerHp(ctx, game.state.characters[0]);
    }
}

function paintHighscoreBoard(ctx: CanvasRenderingContext2D, highscores: Highscores) {
    ctx.fillStyle = "white";
    ctx.font = "18px Arial";

    ctx.fillText("Restart with Key \"R\" ", 150, 20);
    ctx.fillText("Scores: ", 150, 60);
    for (let i = 0; i < highscores.scores.length; i++) {
        ctx.fillText((i + 1) + ": " + highscores.scores[i], 150, 80 + 20 * i);
    }
}

function paintKillCounter(ctx: CanvasRenderingContext2D, killCounter: number) {
    ctx.fillStyle = "white";
    ctx.font = "18px Arial";
    ctx.fillText("Kills: " + killCounter, 10, 20);
}

function paintPlayerHp(ctx: CanvasRenderingContext2D, character: Character) {
    ctx.fillStyle = "white";
    ctx.font = "18px Arial";
    ctx.fillText("HP: " + character.hp, 100, 20);
}

function paintBackground(ctx: CanvasRenderingContext2D, canvasElement: HTMLCanvasElement) {
    ctx.fillStyle = "green";
    ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
}

