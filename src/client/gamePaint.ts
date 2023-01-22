import { getPlayerCharacters } from "./character/character.js";
import { paintCharacters } from "./character/characterPaint.js";
import { LevelingCharacter } from "./character/levelingCharacters/levelingCharacterModel.js";
import { calculateDistance, getCameraPosition } from "./game.js";
import { Game, Position, Highscores, TestingStuff } from "./gameModel.js";
import { paintMap } from "./map/mapPaint.js";
import { findPlayerById } from "./player.js";
import { paintProjectiles } from "./projectile.js";

export function paintAll(ctx: CanvasRenderingContext2D | undefined, game: Game) {
    if (!ctx) return;
    if (game.performance.mapChunkPaintCache === undefined) game.performance.mapChunkPaintCache = {};
    let cameraPosition: Position = getCameraPosition(game);
    paintMap(ctx, cameraPosition, game.state.map, game.performance.mapChunkPaintCache, game.debug);
    paintCharacters(ctx, getPlayerCharacters(game.state.players), cameraPosition);
    paintProjectiles(ctx, game.state.projectiles, cameraPosition);
    paintKillCounter(ctx, game.state.killCounter);

    if (game.state.ended) {
        paintHighscoreBoard(ctx, game.state.highscores);
    } else {
        if (game.multiplayer.myClientId !== -1) {
            let player = findPlayerById(game.state.players, game.multiplayer.myClientId);
            if (player === null) return;
            let character = player.character;
            if (character !== null) paintPlayerStats(ctx, character as LevelingCharacter, game.state.time);
            ctx.fillText("Ping: " + Math.round(game.multiplayer.delay), 10, 60);

        } else {
            paintPlayerStats(ctx, game.state.players[0].character as LevelingCharacter, game.state.time);
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

function paintPlayerStats(ctx: CanvasRenderingContext2D, character: LevelingCharacter, gameTime: number) {
    let distance = Math.round(calculateDistance(character, { x: 0, y: 0 }));
    ctx.fillStyle = "black";
    ctx.font = "18px Arial";

    ctx.fillText("Level: " + character.level
        + "  SkillPoints:" + character.availableSkillPoints,
        200, 20);
    ctx.fillText("HP: " + character.hp, 100, 20);
    ctx.fillText("Time: " + Math.round(gameTime / 1000), 400, 20);
    ctx.fillText("Distance: " + distance, 10, 40);

    if (character.availableSkillPoints > 0) {
        ctx.fillText(`1=${character.upgradeOptions[0].name} Up, 2=${character.upgradeOptions[1].name}, 3=${character.upgradeOptions[2].name}`, 10, 300);
    }
}
