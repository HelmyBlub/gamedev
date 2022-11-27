function paintAll(ctx: CanvasRenderingContext2D, game: Game) {
    paintBackground(ctx, game.canvasElement);
    paintCharacters(ctx, game.state.characters);
    paintProjectiles(ctx, game.state.projectiles);
    paintKillCounter(ctx, game.state.killCounter);
    if (game.state.ended) {
        paintHighscoreBoard(game.ctx, game.state.highscores);
    } else {
        if(game.multiplayer.myClientId !== -1){
            let playerIndex = game.state.clientIds.indexOf(game.multiplayer.myClientId);
            let characterIndex = game.state.players[playerIndex].playerCharacterIndex;
            paintPlayerStats(ctx, game.state.characters[characterIndex] as LevelingCharacter);
        }else{
            paintPlayerStats(ctx, game.state.characters[0] as LevelingCharacter);
        }
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

function paintPlayerStats(ctx: CanvasRenderingContext2D, character: LevelingCharacter) {
    ctx.fillStyle = "white";
    ctx.font = "18px Arial";
    ctx.fillText("Level: " + character.level
            + "  SkillPoints:" + character.availableSkillPoints,
        200, 20);
    ctx.fillText("HP: " + character.hp, 100, 20);

    if(character.availableSkillPoints > 0){
        ctx.fillText(`1=${character.upgradeOptions[0].name} Up, 2=${character.upgradeOptions[1].name}, 3=${character.upgradeOptions[2].name}`, 10, 300);
    }
}

function paintBackground(ctx: CanvasRenderingContext2D, canvasElement: HTMLCanvasElement) {
    ctx.fillStyle = "green";
    ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
}

