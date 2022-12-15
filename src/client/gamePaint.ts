import { findCharacterById, paintCharacters } from "./character/character.js";
import { LevelingCharacter } from "./character/levelingCharacterModel.js";
import { getCameraPosition } from "./game.js";
import { Game, Position, Highscores } from "./gameModel.js";
import { paintMap } from "./map/mapPaint.js";
import { findPlayerById } from "./player.js";
import { paintProjectiles } from "./projectile.js";

export function paintAll(ctx: CanvasRenderingContext2D, game: Game) {
    let cameraPosition: Position = getCameraPosition(game);
    paintMap(ctx, cameraPosition, game.state.map, game.state.randomSeed);
    paintCharacters(ctx, game.state.characters, cameraPosition);
    paintProjectiles(ctx, game.state.projectiles, cameraPosition);
    paintKillCounter(ctx, game.state.killCounter);
    if (game.state.ended) {
        paintHighscoreBoard(game.ctx, game.state.highscores);
    } else {
        if (game.multiplayer.myClientId !== -1) {
            let player = findPlayerById(game.state.players, game.multiplayer.myClientId)
            if (player === null) return;
            let character = findCharacterById(game.state.characters, player.characterIdRef);
            if (character !== null) paintPlayerStats(ctx, character as LevelingCharacter);
            ctx.fillText("Ping: " + Math.round(game.multiplayer.delay), 10, 40);

        } else {
            paintPlayerStats(ctx, game.state.characters[0] as LevelingCharacter);
        }
    }
}

function paintHighscoreBoard(ctx: CanvasRenderingContext2D, highscores: Highscores) {
    ctx.fillStyle = "black";
    ctx.font = "18px Arial";

    ctx.fillText("Restart with Key \"R\" ", 150, 20);
    ctx.fillText("Scores: ", 150, 60);
    for (let i = 0; i < highscores.scores.length; i++) {
        ctx.fillText((i + 1) + ": " + highscores.scores[i], 150, 80 + 20 * i);
    }
}

function paintKillCounter(ctx: CanvasRenderingContext2D, killCounter: number) {
    ctx.fillStyle = "black";
    ctx.font = "18px Arial";
    ctx.fillText("Kills: " + killCounter, 10, 20);
}

function paintPlayerStats(ctx: CanvasRenderingContext2D, character: LevelingCharacter) {
    ctx.fillStyle = "black";
    ctx.font = "18px Arial";
    ctx.fillText("Level: " + character.level
        + "  SkillPoints:" + character.availableSkillPoints,
        200, 20);
    ctx.fillText("HP: " + character.hp, 100, 20);

    if (character.availableSkillPoints > 0) {
        ctx.fillText(`1=${character.upgradeOptions[0].name} Up, 2=${character.upgradeOptions[1].name}, 3=${character.upgradeOptions[2].name}`, 10, 300);
    }
}
