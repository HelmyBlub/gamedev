import { ABILITIES_FUNCTIONS, paintAbilityObjects, paintUiForAbilities } from "./ability/ability.js";
import { getPlayerCharacters } from "./character/character.js";
import { paintCharacters } from "./character/characterPaint.js";
import { paintBossCharacters } from "./character/enemy/bossEnemy.js";
import { paintLevelingCharacterStatsUI } from "./character/levelingCharacters/levelingCharacter.js";
import { LevelingCharacter } from "./character/levelingCharacters/levelingCharacterModel.js";
import { calculateDistance, getCameraPosition } from "./game.js";
import { Game, Position, Highscores, TestingStuff, Debugging, PaintDamageNumberData } from "./gameModel.js";
import { GAME_IMAGES, loadImage } from "./imageLoad.js";
import { getMapMidlePosition } from "./map/map.js";
import { paintMap, paintMapCharacters } from "./map/mapPaint.js";
import { findPlayerById } from "./player.js";

GAME_IMAGES["blankKey"] = {
    imagePath: "/images/singleBlankKey.png",
    spriteRowHeights: [],
    spriteRowWidths: [],
};

export function paintAll(ctx: CanvasRenderingContext2D | undefined, game: Game) {
    if (!ctx) return;
    if (game.performance.mapChunkPaintCache === undefined) game.performance.mapChunkPaintCache = {};
    let cameraPosition: Position = getCameraPosition(game);
    paintMap("Layer1", ctx, cameraPosition, game.state.map, game.performance.mapChunkPaintCache, game.debug, game.state.time);
    paintAbilityObjects(ctx, game.state.abilityObjects, game, "beforeCharacterPaint");
    paintMap("Layer2", ctx, cameraPosition, game.state.map, game.performance.mapChunkPaintCache, game.debug, game.state.time);
    paintMapCharacters(ctx, cameraPosition, game.state.map, game);
    paintBossCharacters(ctx, cameraPosition, game);
    paintCharacters(ctx, getPlayerCharacters(game.state.players), cameraPosition, game);
    paintAbilityObjects(ctx, game.state.abilityObjects, game, "afterCharacterPaint");
    paintDamageNumbers(ctx, game.UI.displayDamageNumbersData, cameraPosition, game.state.time);
    paintKillCounter(ctx, game.state.killCounter, game);
    paintKeyInfo(ctx, game);

    if (game.state.ended) {
        let player = findPlayerById(game.state.players, game.multiplayer.myClientId);
        if (player === null) return;
        let character = player.character;
        if (character !== null) paintPlayerStats(ctx, character as LevelingCharacter, game.state.time, game);
        paintHighscoreBoard(ctx, game.state.highscores);
        if (game.multiplayer.websocket !== null) {
            ctx.fillText("Ping: " + Math.round(game.multiplayer.delay), 10, 60);
        }
    } else {
        if (game.multiplayer.myClientId !== -1) {
            let player = findPlayerById(game.state.players, game.multiplayer.myClientId);
            if (player === null) return;
            let character = player.character;
            if (character !== null) paintPlayerStats(ctx, character as LevelingCharacter, game.state.time, game);
            if (game.multiplayer.websocket !== null) {
                ctx.fillText("Ping: " + Math.round(game.multiplayer.delay), 10, 60);
            }
        } else {
            paintPlayerStats(ctx, game.state.players[0].character as LevelingCharacter, game.state.time, game);
        }
    }
    paintTimeMeasures(ctx, game.debug);
    paintUiForAbilities(ctx, game);
}

function paintKeyInfo(ctx: CanvasRenderingContext2D, game: Game) {
    let fontSize = 16;
    let paintX = ctx.canvas.width - 20;
    let paintY = ctx.canvas.height - 5;
    let infoCounter = 0;
    let texts = [
        "R = Restart",
        "TAB = Character Info",
    ]
    if(game.UI.displayMovementKeyHint) paintMoveKeysHint(ctx);
    ctx.fillStyle = "black";
    ctx.font = fontSize + "px Arial";
    for (let i = 0; i < texts.length; i++) {
        ctx.fillText(texts[i], paintX - texts[i].length * fontSize / 2, paintY + infoCounter-- * (fontSize + 2));
    }
}

function paintMoveKeysHint(ctx: CanvasRenderingContext2D){
    let middleX = ctx.canvas.width / 2;
    let middleY = ctx.canvas.height / 2;
    let paintX = middleX - 60;
    let paintY = middleY - 100;

    ctx.fillStyle = "white";
    ctx.lineWidth = 1;
    ctx.fillRect(paintX, paintY, 120, 20);

    ctx.fillStyle = "black";
    ctx.font = "16px Arial";
    ctx.fillText("Movement Keys", paintX, paintY + 18);

    paintWasdKeys(ctx,paintX,paintY+20);
}

function paintWasdKeys(ctx: CanvasRenderingContext2D, paintX: number, paintY: number) {
    paintKey(ctx, "W", { x: paintX + 40, y: paintY }, -2);
    paintKey(ctx, "A", { x: paintX, y: paintY + 30 });
    paintKey(ctx, "S", { x: paintX + 40, y: paintY + 30 });
    paintKey(ctx, "D", { x: paintX + 80, y: paintY + 30 });
}

function paintKey(ctx: CanvasRenderingContext2D, key: string, paintPosition: Position, offsetX: number = 0) {
    let wasdKeyImageString = "blankKey";
    let wasdKeyImage = GAME_IMAGES[wasdKeyImageString];
    loadImage(wasdKeyImage);
    if (wasdKeyImage.imageRef?.complete) {
        ctx.fillStyle = "black";
        ctx.font = "16px Arial";
        ctx.drawImage(wasdKeyImage.imageRef, paintPosition.x, paintPosition.y);
        ctx.fillText(key, paintPosition.x + 15 + offsetX, paintPosition.y + 20);
    }
}

function paintDamageNumbers(ctx: CanvasRenderingContext2D, damageNumbersData: PaintDamageNumberData[] | undefined, cameraPosition: Position, time: number) {
    if (damageNumbersData === undefined) return;
    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;
    for (let i = damageNumbersData.length - 1; i >= 0; i--) {
        let data = damageNumbersData[i];
        if (data.removeTime <= time) {
            damageNumbersData.splice(i, 1)
        } else {
            let paintX = data.paintPosition.x - cameraPosition.x + centerX;
            let paintY = data.paintPosition.y - cameraPosition.y + centerY;
            let timeLeft = Math.floor((data.removeTime - time) / 100);

            ctx.fillStyle = data.color;
            ctx.font = data.fontSize + "px Arial";
            ctx.fillText(data.damage.toFixed(0), paintX, paintY + timeLeft);
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
    if (highscores.scores.length === 0) return;
    let paintX = ctx.canvas.width / 2 - 50;
    let paintY = ctx.canvas.height / 2 - 20 - highscores.scores.length * 10;


    ctx.font = "18px Arial";

    ctx.fillStyle = "white";
    ctx.fillRect(paintX - 30, paintY - 60, 170, 20 + 4);
    ctx.fillStyle = "black";
    ctx.fillText("Restart with Key \"R\" ", paintX - 30, paintY - 40);

    ctx.fillStyle = "white";
    ctx.fillRect(paintX - 100, paintY - 140, 340, 40 + 4);
    ctx.fillStyle = "black";
    ctx.fillText("Highscore number based on how far away", paintX - 100, paintY - 120);
    ctx.fillText("from starting point the player died", paintX - 100, paintY - 100);


    ctx.fillStyle = "white";
    ctx.fillRect(paintX, paintY - 20, 100, (highscores.scores.length + 1) * 20 + 4);
    ctx.fillStyle = "black";
    ctx.fillText("Highscores: ", paintX, paintY - 5);
    for (let i = 0; i < highscores.scores.length; i++) {
        if (i === highscores.lastHighscorePosition) {
            ctx.fillStyle = "lightblue";
            ctx.fillRect(paintX, paintY + 20 + 20 * i - 20, 100, 22);
            ctx.fillStyle = "black";
        }
        ctx.fillText((i + 1) + ": " + highscores.scores[i], paintX, paintY + 20 + 20 * i);
    }
}

function paintKillCounter(ctx: CanvasRenderingContext2D, killCounter: number, game: Game) {
    if (game.state.ended && killCounter === 0) return;
    ctx.fillStyle = "black";
    ctx.font = "18px Arial";
    ctx.fillText("Kills: " + killCounter, 10, 20);
}

function paintPlayerStats(ctx: CanvasRenderingContext2D, character: LevelingCharacter, gameTime: number, game: Game) {
    let distance = Math.round(calculateDistance(character, getMapMidlePosition(game.state.map)));
    ctx.fillStyle = "black";
    ctx.font = "18px Arial";

    ctx.fillText("Level: " + character.level
        + "  SkillPoints:" + character.availableSkillPoints,
        200, 20);
    ctx.fillText("HP: " + Math.ceil(character.hp), 100, 20);
    ctx.fillText("Time: " + Math.round(gameTime / 1000), 400, 20);
    ctx.fillText("Distance: " + distance, 10, 40);

    if (!game.state.ended) paintUpgradeOptionsUI(ctx, character);
    paintPlayerStatsUI(ctx, character, game);
}

function paintPlayerStatsUI(ctx: CanvasRenderingContext2D, character: LevelingCharacter, game: Game) {
    if (!game.UI.displayStats) return;
    const spacing = 5;
    let paintX = 20;
    let paintY = 60;

    let area = paintLevelingCharacterStatsUI(ctx, character, paintX, paintY, game);
    paintX += area.width + spacing;

    for (let ability of character.abilities) {
        let abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions.paintAbilityStatsUI) {
            area = abilityFunctions.paintAbilityStatsUI(ctx, ability, paintX, paintY, game);
            paintX += area.width + spacing;
        }
    }
}

function paintUpgradeOptionsUI(ctx: CanvasRenderingContext2D, character: LevelingCharacter) {
    let fontSize = 20;
    ctx.font = fontSize + "px Arial";
    let startY = (ctx.canvas.height * 0.75);
    let optionSpacer = 50;
    if (character.availableSkillPoints > 0) {
        let totalWidthEsitmate = 0;
        let texts = [];
        for (let i = 0; i < 3; i++) {
            texts.push(`Key ${i + 1}=${character.upgradeOptions[i].name}`);
            totalWidthEsitmate += texts[i].length * fontSize * 0.63;
        }

        let currentX = Math.max(5, ctx.canvas.width / 2 - totalWidthEsitmate / 2);
        for (let i = 0; i < 3; i++) {
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = "white";
            let textWidthEstimate = texts[i].length * fontSize * 0.63;
            ctx.fillRect(currentX, startY - fontSize - 2, textWidthEstimate, fontSize + 4);
            ctx.globalAlpha = 1;

            ctx.fillStyle = "black";
            ctx.fillText(texts[i], currentX, startY);
            currentX += textWidthEstimate + optionSpacer;
        }
    }
}
