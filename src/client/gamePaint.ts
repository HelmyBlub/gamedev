import { paintAbilityObjects } from "./ability/ability.js";
import { AbilityFireCircle } from "./ability/abilityFireCircle.js";
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
    paintMap(ctx, cameraPosition, game.state.map, game.performance.mapChunkPaintCache, game.debug);
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
    paintUiForActiveAbilities(ctx, game);
}

function paintUiForActiveAbilities(ctx: CanvasRenderingContext2D, game: Game){
    let player = game.state.players[0];
    if(!player) return;
    if (game.multiplayer.myClientId !== -1) {
        let tempPlayer = findPlayerById(game.state.players, game.multiplayer.myClientId);
        if(tempPlayer) player = tempPlayer;
    }
    let fontSize = 40;
    let rectSize = 40;
    let startX = ctx.canvas.width / 2 - 20;
    let startY = ctx.canvas.height - rectSize - 2;
    for(let ability of player.character.abilities){
        if(!ability.passive){
            let fireCircle = ability as AbilityFireCircle;
            ctx.strokeStyle = "black";
            ctx.fillStyle = "white";
            ctx.fillRect(startX,startY,rectSize,rectSize);
            ctx.beginPath();
            ctx.rect(startX,startY,rectSize,rectSize);
            ctx.stroke();
            if(fireCircle.currentCharges < fireCircle.maxCharges){
                ctx.fillStyle = "gray";
                let heightFactor = (fireCircle.nextRechargeTime - game.state.time) / (fireCircle.baseRechargeTime / fireCircle.rechargeTimeDecreaseFaktor);
                ctx.fillRect(startX,startY,rectSize,rectSize * heightFactor);                
            }

            ctx.fillStyle = "black";
            ctx.font = fontSize + "px Arial";
            ctx.fillText("" + fireCircle.currentCharges, startX, startY + rectSize - (rectSize - fontSize * 0.9));

            if(fireCircle.playerInputBinding){
                let keyBind = "";
                game.clientKeyBindings[0].keyCodeToActionPressed.forEach((value, key) => {
                    if(value.action === fireCircle.playerInputBinding){
                        keyBind = value.uiDisplayInputValue;
                    }
                });
                ctx.fillStyle = "black";
                ctx.font = "10px Arial";
                ctx.fillText(keyBind, startX + 1, startY + 8);
            }
            startX += rectSize;
        }
    }
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
