import { paintAbilityObjects, paintUiForAbilities } from "./ability/ability.js";
import { getPlayerCharacters } from "./character/character.js";
import { paintCharacters } from "./character/characterPaint.js";
import { LevelingCharacter } from "./character/levelingCharacters/levelingCharacterModel.js";
import { calculateDistance, getCameraPosition } from "./game.js";
import { Game, Position, Highscores, TestingStuff, Debugging } from "./gameModel.js";
import { paintMap, paintMapCharacters } from "./map/mapPaint.js";
import { findPlayerById } from "./player.js";

export function paintAll(ctx: CanvasRenderingContext2D | undefined, game: Game) {
    if (!ctx) return;
    if (game.performance.mapChunkPaintCache === undefined) game.performance.mapChunkPaintCache = {};
    let cameraPosition: Position = getCameraPosition(game);
    paintMap(ctx, cameraPosition, game.state.map, game.performance.mapChunkPaintCache, game.debug, game.state.time);
    paintAbilityObjects(ctx, game.state.abilityObjects, cameraPosition, "beforeCharacterPaint");
    paintMapCharacters(ctx, cameraPosition, game.state.map);
    paintCharacters(ctx, getPlayerCharacters(game.state.players), cameraPosition);
    paintAbilityObjects(ctx, game.state.abilityObjects, cameraPosition, "afterCharacterPaint");
    paintKillCounter(ctx, game.state.killCounter);

    if (game.state.ended) {
        paintHighscoreBoard(ctx, game.state.highscores);
        if (game.multiplayer.websocket !== null) {
            ctx.fillText("Ping: " + Math.round(game.multiplayer.delay), 10, 60);
        }
    } else {
        if (game.multiplayer.myClientId !== -1) {
            let player = findPlayerById(game.state.players, game.multiplayer.myClientId);
            if (player === null) return;
            let character = player.character;
            if (character !== null) paintPlayerStats(ctx, character as LevelingCharacter, game.state.time);
            if (game.multiplayer.websocket !== null) {
                ctx.fillText("Ping: " + Math.round(game.multiplayer.delay), 10, 60);
            }

        } else {
            paintPlayerStats(ctx, game.state.players[0].character as LevelingCharacter, game.state.time);
        }
    }
    paintTimeMeasures(ctx, game.debug);
    paintUiForAbilities(ctx, game);
}

function paintTimeMeasures(ctx: CanvasRenderingContext2D, debug: Debugging | undefined) {
    if (debug === undefined || debug.takeTimeMeasures !== true) return;
    let fontSize = 12;
    let startX = 0;
    let startY = 80;
    ctx.fillStyle = "white";
    ctx.fillRect(startX, startY - fontSize, 120, debug.timeMeasuresData!.length * fontSize + 1);

    ctx.fillStyle = "black";
    ctx.font = fontSize + "px Arial";
    for (let i = 0; i < debug.timeMeasuresData!.length; i++) {
        const data = debug.timeMeasuresData![i];
        const sum = data.timeMeasures.reduce((a, b) => a + b, 0);
        const avg = (sum / data.timeMeasures.length) || 0;
        ctx.fillText(avg.toFixed(2) + " " + data.name, startX, startY + i * fontSize);
    }
}

function paintHighscoreBoard(ctx: CanvasRenderingContext2D, highscores: Highscores) {
    ctx.fillStyle = "white";
    ctx.fillRect(150, 60 - 20, 100, (highscores.scores.length + 1) * 20 + 4);

    ctx.fillStyle = "black";
    ctx.font = "18px Arial";

    ctx.fillText("Restart with Key \"R\" ", 150, 20);

    ctx.fillText("Scores: ", 150, 60);
    for (let i = 0; i < highscores.scores.length; i++) {
        if(i === highscores.lastHighscorePosition){
            ctx.fillStyle = "lightblue";
            ctx.fillRect(150, 80 + 20 * i - 20, 100, 22);
            ctx.fillStyle = "black";        
        } 
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

    paintUpgradeOptionsUI(ctx, character);
}

function paintUpgradeOptionsUI(ctx: CanvasRenderingContext2D, character: LevelingCharacter){
    let fontSize = 20;
    ctx.font = fontSize + "px Arial";
    let startY = (ctx.canvas.height * 0.75);
    let optionSpacer = 50;
    let currentX = Math.max(5, ctx.canvas.width / 2 - 200);
    if (character.availableSkillPoints > 0) {
        for(let i = 0; i<3; i++){
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = "white";
            let text = `${i+1}=${character.upgradeOptions[i].name}`;
            let textWidthEstimate = text.length * fontSize * 0.63;
            ctx.fillRect(currentX, startY - fontSize - 2, textWidthEstimate, fontSize + 4);
            ctx.globalAlpha = 1;
        
            ctx.fillStyle = "black";
            ctx.fillText(text, currentX, startY);
            currentX += textWidthEstimate + optionSpacer;
        }
    }
}
