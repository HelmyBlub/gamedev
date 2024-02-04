import { Ability, paintAbilityObjects, paintUiForAbilities } from "./ability/ability.js";
import { canCharacterTradeAbilityOrPets } from "./character/character.js";
import { Character } from "./character/characterModel.js";
import { paintPlayerCharacters } from "./character/characterPaint.js";
import { paintBossCharacters, paintBossCrown } from "./character/enemy/bossEnemy.js";
import { CharacterClass, hasPlayerChoosenStartClassUpgrade, shareCharactersTradeablePreventedMultipleClass } from "./character/playerCharacters/playerCharacters.js";
import { TamerPetCharacter } from "./character/playerCharacters/tamer/tamerPetCharacter.js";
import { calculateDistance, getCameraPosition, getTimeSinceFirstKill } from "./game.js";
import { Game, Position, Debugging, PaintTextData } from "./gameModel.js";
import { Highscores, paintHighscoreEndScreenStuff } from "./highscores.js";
import { GAME_IMAGES, loadImage } from "./imageLoad.js";
import { getMapMidlePosition } from "./map/map.js";
import { MAP_OBJECTS_FUNCTIONS, findNearesInteractableMapChunkObject } from "./map/mapObjects.js";
import { paintMap, paintMapCharacters } from "./map/mapPaint.js";
import { Player, findNearesPastPlayerCharacter, findPlayerById, isAutoSkillActive } from "./player.js";
import { playerInputBindingToDisplayValue } from "./playerInput.js";
import { paintStatsUis } from "./statsUI.js";

GAME_IMAGES["blankKey"] = {
    imagePath: "/images/singleBlankKey.png",
    spriteRowHeights: [],
    spriteRowWidths: [],
};

export function paintAll(ctx: CanvasRenderingContext2D | undefined, game: Game) {
    if (!ctx) return;
    if (game.performance.mapChunkPaintCache === undefined) game.performance.mapChunkPaintCache = {};
    const cameraPosition: Position = getCameraPosition(game);
    paintMap("Layer1", ctx, cameraPosition, game.state.map, game.performance.mapChunkPaintCache, game.debug, game);
    paintAbilityObjects(ctx, game.state.abilityObjects, game, "beforeCharacterPaint");
    paintMap("Layer2", ctx, cameraPosition, game.state.map, game.performance.mapChunkPaintCache, game.debug, game);
    paintMapCharacters(ctx, cameraPosition, game.state.map, game);
    paintBossCharacters(ctx, cameraPosition, game);
    paintPlayerCharacters(ctx, cameraPosition, game);
    paintBossCrown(ctx, cameraPosition, game);
    paintAbilityObjects(ctx, game.state.abilityObjects, game, "afterCharacterPaint");
    paintDamageNumbers(ctx, game.UI.displayTextData, cameraPosition, game.state.time);
    paintKillCounter(ctx, game.state.killCounter, game);
    paintClosestInteractable(ctx, cameraPosition, game);
    paintKeyInfo(ctx, game);
    paintEndScreen(ctx, game.state.highscores, game);
    paintMyCharacterStats(ctx, game);
    paintStatsUis(ctx, game.UI.statsUIs, game);
    paintMultiplayerPing(ctx, game);
    paintTimeMeasures(ctx, game.debug);
    paintPausedText(ctx, game);
    paintUiForAbilities(ctx, game);
}

export function paintTextWithOutline(ctx: CanvasRenderingContext2D, outlineColor: string, textColor: string, text: string, x: number, y: number, centered: boolean = false, lineWidth: number = 1, withBackgroundColor: string | undefined = undefined) {
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = lineWidth;
    const width = ctx.measureText(text).width;
    if (centered) {
        x -= width / 2;
    }
    if (withBackgroundColor) {
        const fontSize = 20;
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = withBackgroundColor;
        ctx.fillRect(x, y - fontSize, width, fontSize + 2);
        ctx.globalAlpha = 1;
    } else {
        ctx.strokeText(text, x, y);
    }
    ctx.fillStyle = textColor;
    ctx.fillText(text, x, y);
}

export function getPointPaintPosition(ctx: CanvasRenderingContext2D, point: Position, cameraPosition: Position): Position {
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    return {
        x: Math.floor(point.x - cameraPosition.x + centerX),
        y: Math.floor(point.y - cameraPosition.y + centerY),
    }
}

/**
 * @param textWithKeys add character "<" + key + ">" like "Press buton <A>" to print a key visualization
 */
export function paintTextLinesWithKeys(ctx: CanvasRenderingContext2D, textWithKeys: string[], paintPosition: Position, fontSize: number = 20, centered: boolean = false, bottomUp: boolean = false) {
    let textMaxWidth = 0;
    const tempPaintPos = { x: paintPosition.x, y: paintPosition.y };
    const verticalSpacing = 10;
    const rectHeight = (fontSize + verticalSpacing) * textWithKeys.length + 2;
    if (bottomUp) tempPaintPos.y -= rectHeight;
    ctx.font = `${fontSize}px Arial`;

    for (let text of textWithKeys) {
        const textWidth = ctx.measureText(text).width;
        if (textWidth > textMaxWidth) textMaxWidth = textWidth;
    }
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = "white";
    ctx.fillRect(tempPaintPos.x - Math.floor(textMaxWidth / 2) - 1, tempPaintPos.y - 1, textMaxWidth + 2, rectHeight)
    ctx.globalAlpha = 1;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "black";
    let offsetY = 0;
    for (let text of textWithKeys) {
        offsetY += fontSize;
        paintTextWithKeys(ctx, text, { x: tempPaintPos.x, y: tempPaintPos.y + offsetY }, fontSize, true);
        offsetY += verticalSpacing;
    }
}


/**
 * @param textWithKeys add character "<" + key + ">" like "Press buton <A>" to print a key visualization
 */
export function paintTextWithKeys(ctx: CanvasRenderingContext2D, textWithKeys: string, paintPosition: Position, fontSize: number = 20, centered: boolean = false) {
    const splittedText = textWithKeys.split(/[<>]/);
    let totalWidth = 0;
    let width: number[] = [];
    let even = true;
    ctx.font = fontSize + "px Arial";
    for (let i = 0; i < splittedText.length; i++) {
        if (even) {
            width[i] = ctx.measureText(splittedText[i]).width;
        } else {
            width[i] = 38;
        }
        totalWidth += width[i];
        even = !even;
    }
    even = true;
    let x = paintPosition.x;
    let y = paintPosition.y;
    if (centered) {
        x -= totalWidth / 2;
    }
    for (let i = 0; i < splittedText.length; i++) {
        const textPart = splittedText[i];
        if (even) {
            ctx.font = fontSize + "px Arial";
            paintTextWithOutline(ctx, "white", "black", textPart, x, y);
        } else {
            paintKey(ctx, textPart, { x: x - 1, y: y - 20 });
        }
        x += width[i];
        even = !even;
    }
}

export function paintKey(ctx: CanvasRenderingContext2D, key: string, paintPosition: Position) {
    const blankKeyImageString = "blankKey";
    const blankKeyImage = GAME_IMAGES[blankKeyImageString];
    let fontSize = 16;
    loadImage(blankKeyImage);
    if (blankKeyImage.imageRef?.complete) {
        ctx.fillStyle = "black";
        ctx.font = fontSize + "px Arial";
        let width = ctx.measureText(key).width;
        const maxWidth = 28;
        if (width > maxWidth) {
            fontSize = 14;
            ctx.font = fontSize + "px Arial";
            width = ctx.measureText(key).width;
        }
        ctx.drawImage(blankKeyImage.imageRef, paintPosition.x, paintPosition.y);
        ctx.fillText(key, paintPosition.x + 20 - width / 2, paintPosition.y + 20);
    }
}

function paintMultiplayerPing(ctx: CanvasRenderingContext2D, game: Game) {
    if (game.multiplayer.websocket !== null) {
        ctx.font = "16px Arial";
        ctx.fillText("Ping: " + Math.round(game.multiplayer.delay), 10, 60);
    }
}

function paintClosestInteractable(ctx: CanvasRenderingContext2D, cameraPosition: Position, game: Game) {
    game.UI.paintClosesInteractableStatsUi = false;
    if (game.state.ended) return;
    const player = findPlayerById(game.state.players, game.multiplayer.myClientId);
    if (player === null) return;
    const character = player.character;
    const pastCharacter = findNearesPastPlayerCharacter(character, game);
    const interactableMapObject = findNearesInteractableMapChunkObject(character, game);
    if (pastCharacter) {
        paintPastPlayerTakeoverInfo(ctx, pastCharacter, character, cameraPosition, game);
    } else if (interactableMapObject) {
        const mapObejctFunctions = MAP_OBJECTS_FUNCTIONS[interactableMapObject.type];
        if (mapObejctFunctions && mapObejctFunctions.paintInteract) {
            mapObejctFunctions.paintInteract(ctx, interactableMapObject, character, game);
        }
    }
}

function paintPastPlayerTakeoverInfo(ctx: CanvasRenderingContext2D, pastCharacter: Character, playerCharacter: Character, cameraPosition: Position, game: Game) {
    const canTrade = canCharacterTradeAbilityOrPets(pastCharacter);
    const classAlreadyTaken = shareCharactersTradeablePreventedMultipleClass(pastCharacter, playerCharacter);
    let paintPos: Position = getPointPaintPosition(ctx, pastCharacter, cameraPosition);
    paintPos.y -= 40;
    let textsWithKeys: string[] = [];
    textsWithKeys.push(`Past Character:`);
    if (canTrade) {
        if (!classAlreadyTaken) {
            const interactKey = playerInputBindingToDisplayValue("interact1", game);
            const infoKey = playerInputBindingToDisplayValue("Info", game);
            textsWithKeys.push(`Takeover abilities with <${interactKey}>,`);
            textsWithKeys.push(`One time only.`);
            textsWithKeys.push(`<${infoKey}> for more details.`);
            game.UI.paintClosesInteractableStatsUi = true;
        } else {
            const infoKey = playerInputBindingToDisplayValue("Info", game);
            textsWithKeys.push(`<${infoKey}> for more details.`);
            textsWithKeys.push(`Can not trade because this`);
            textsWithKeys.push(`Class can only be owned once!`);
            paintPos.y -= 20;
            game.UI.paintClosesInteractableStatsUi = true;
        }

        let pets: TamerPetCharacter[] = [];
        let abilities: Ability[] = [];
        let charClasses: CharacterClass[] = [];
        if (pastCharacter.pets) {
            for (let pet of pastCharacter.pets) {
                if (pet.tradable) pets.push(pet);
            }
        }
        for (let ability of pastCharacter.abilities) {
            if (ability.tradable) abilities.push(ability);
        }
        if (pastCharacter.characterClasses) {
            for (let charClass of pastCharacter.characterClasses) {
                if (!charClass.gifted) charClasses.push(charClass);
            }
        }
    } else {
        const interactKey = playerInputBindingToDisplayValue("interact1", game);
        textsWithKeys.push(`Nothing to take.`);
        textsWithKeys.push(`Kick Out with <${interactKey}>.`);
        paintPos.y -= 20;
    }
    ctx.fillStyle = "black";
    ctx.font = "20px Arial";
    paintTextLinesWithKeys(ctx, textsWithKeys, paintPos, 20, true, true);
}

function paintPausedText(ctx: CanvasRenderingContext2D, game: Game) {
    if (!game.state.paused || game.state.ended) return;

    const middleX = ctx.canvas.width / 2;
    ctx.font = "bold 60px Arial";
    paintTextWithOutline(ctx, "white", "black", "PAUSED", middleX, 60, true, 3);
}

function paintKeyInfo(ctx: CanvasRenderingContext2D, game: Game) {
    if (game.UI.displayMovementKeyHint) paintMoveKeysHint(ctx);
    if (!game.clientKeyBindings) return;
    const fontSize = 16;
    const paintX = ctx.canvas.width - 150;
    let paintY = ctx.canvas.height - 5;

    ctx.fillStyle = "black";
    game.clientKeyBindings.keyCodeToUiAction.forEach((e) => {
        paintKey(ctx, e.uiDisplayInputValue, { x: paintX, y: paintY - 30 });
        ctx.font = fontSize + "px Arial";
        let text = e.action;
        if (e.activated !== undefined) {
            text += e.activated ? "(On)" : "(Off)";
        }
        ctx.fillText(text, paintX + 40, paintY - 10);
        paintY -= 30;
    });
}

function paintMoveKeysHint(ctx: CanvasRenderingContext2D) {
    const middleX = ctx.canvas.width / 2;
    const middleY = ctx.canvas.height / 2;
    const paintX = middleX - 60;
    const paintY = middleY - 100;

    ctx.fillStyle = "white";
    ctx.lineWidth = 1;
    ctx.fillRect(paintX, paintY, 120, 20);

    ctx.fillStyle = "black";
    ctx.font = "16px Arial";
    ctx.fillText("Movement Keys", paintX, paintY + 18);

    paintWasdKeys(ctx, paintX, paintY + 20);
}

function paintWasdKeys(ctx: CanvasRenderingContext2D, paintX: number, paintY: number) {
    paintKey(ctx, "W", { x: paintX + 40, y: paintY });
    paintKey(ctx, "A", { x: paintX, y: paintY + 30 });
    paintKey(ctx, "S", { x: paintX + 40, y: paintY + 30 });
    paintKey(ctx, "D", { x: paintX + 80, y: paintY + 30 });
}

function paintDamageNumbers(ctx: CanvasRenderingContext2D, damageNumbersData: PaintTextData[] | undefined, cameraPosition: Position, time: number) {
    if (damageNumbersData === undefined) return;
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    for (let i = damageNumbersData.length - 1; i >= 0; i--) {
        const data = damageNumbersData[i];
        if (data.removeTime <= time) {
            damageNumbersData.splice(i, 1)
        } else {
            const paintX = data.paintPosition.x - cameraPosition.x + centerX;
            const paintY = data.paintPosition.y - cameraPosition.y + centerY;
            const timeLeft = Math.floor((data.removeTime - time) / 100);

            ctx.fillStyle = data.color;
            ctx.font = data.fontSize + "px Arial";
            ctx.fillText(data.text, paintX, paintY + timeLeft);
        }
    }
}

function paintTimeMeasures(ctx: CanvasRenderingContext2D, debug: Debugging | undefined) {
    if (debug === undefined || debug.takeTimeMeasures !== true) return;
    const fontSize = 12;
    const startX = 0;
    const startY = 80;
    ctx.fillStyle = "white";
    ctx.fillRect(startX, startY - fontSize, 120, (debug.timeMeasuresData!.length + 1) * fontSize + 1);

    ctx.fillStyle = "black";
    ctx.font = fontSize + "px Arial";
    for (let i = 0; i < debug.timeMeasuresData!.length; i++) {
        const data = debug.timeMeasuresData![i];
        const sum = data.timeMeasures.reduce((a, b) => a + b, 0);
        const avg = (sum / data.timeMeasures.length) || 0;
        if (i === 0) {
            ctx.fillText((1000 / avg).toFixed(1) + " FPS", startX, startY + i * fontSize);
        }
        ctx.fillText(avg.toFixed(2) + " " + data.name, startX, startY + (i + 1) * fontSize);
    }
}

function paintEndScreen(ctx: CanvasRenderingContext2D, highscores: Highscores, game: Game) {
    if (!game.state.ended) return;

    paintGameTitle(ctx);
    let restartKey = "";
    game.clientKeyBindings?.keyCodeToUiAction.forEach((e) => {
        if (e.action === "Restart") {
            restartKey = e.uiDisplayInputValue;
        }
    });
    paintHighscoreEndScreenStuff(ctx, highscores, restartKey);
}

function paintGameTitle(ctx: CanvasRenderingContext2D) {
    const middleX = ctx.canvas.width / 2;

    ctx.font = "bold 60px Arial";
    paintTextWithOutline(ctx, "white", "black", "Helmys Game", middleX, 80, true, 3);
    ctx.font = "bold 24px Arial";
    paintTextWithOutline(ctx, "white", "black", "(Earliest Early Access)", middleX, 105, true, 2);
}

function paintKillCounter(ctx: CanvasRenderingContext2D, killCounter: number, game: Game) {
    if (game.state.ended && killCounter === 0) return;
    ctx.font = "18px Arial";
    paintTextWithOutline(ctx, "white", "black", "Kills: " + killCounter, 10, 20);
}

function paintMyCharacterStats(ctx: CanvasRenderingContext2D, game: Game) {
    const player = findPlayerById(game.state.players, game.multiplayer.myClientId);
    if (player === null) return;
    paintPlayerStats(ctx, player, getTimeSinceFirstKill(game.state), game);
}

function paintPlayerStats(ctx: CanvasRenderingContext2D, player: Player, gameTime: number, game: Game) {
    const character = player.character;
    const distance = Math.round(calculateDistance(character, getMapMidlePosition(game.state.map)));
    ctx.fillStyle = "black";
    ctx.font = "18px Arial";

    if (character.level?.leveling) {
        ctx.fillText("Level: " + character.level.level
            + "  SkillPoints:" + character.availableSkillPoints,
            200, 20
        );
    }
    paintTextWithOutline(ctx, "white", "black", "HP: " + Math.ceil(character.hp), 100, 20);
    if (player.permanentData.money > 0) paintTextWithOutline(ctx, "white", "black", "$ " + Math.ceil(player.permanentData.money), 300, 20);
    paintTextWithOutline(ctx, "white", "black", "Time: " + Math.round(gameTime / 1000), 400, 20);
    paintTextWithOutline(ctx, "white", "black", "Distance: " + distance, 10, 40);

    if (!game.state.ended && game.multiplayer.websocket && game.multiplayer.timePassedWithoutSeverUpdate + 2000 < performance.now()) {
        const text = "Bad Connection...";
        ctx.font = "bold 34px Arial";
        ctx.fillText(text, ctx.canvas.width / 2 - 100, ctx.canvas.height / 2 - 100);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        ctx.strokeText(text, ctx.canvas.width / 2 - 100, ctx.canvas.height / 2 - 100);
    }

    paintUpgradeOptionsUI(ctx, character, game);
}

function paintUpgradeOptionsUI(ctx: CanvasRenderingContext2D, character: Character, game: Game) {
    if (game.state.ended) return;
    if (isAutoSkillActive(game) && hasPlayerChoosenStartClassUpgrade(character)) return;
    const firstFontSize = 20;
    const addFontSize = 14;
    const startY = (ctx.canvas.height * 0.75);
    const optionSpacer = 50;
    if (character.upgradeChoices.length > 0) {
        const maxWidthes: number[] = [];
        let totalWidthEsitmate = 0;
        let displayKeyHint = false;
        const keyDisplayWidth = 40;
        for (let choice of character.upgradeChoices) {
            ctx.font = firstFontSize + "px Arial";
            let maxWidth = ctx.measureText(choice.displayText).width + keyDisplayWidth;

            if (!game.UI.displayLongInfos && choice.displayLongText) displayKeyHint = true;
            if (game.UI.displayLongInfos && choice.displayLongText) {
                for (let textIt = 0; textIt < choice.displayLongText.length; textIt++) {
                    let text = choice.displayLongText[textIt];
                    ctx.font = addFontSize + "px Arial";

                    let width = ctx.measureText(text).width;
                    if (width > maxWidth) maxWidth = width;
                }
            }
            maxWidthes.push(maxWidth);
            totalWidthEsitmate += maxWidth;
        }

        let currentX = Math.max(5, ctx.canvas.width / 2 - totalWidthEsitmate / 2);
        if (displayKeyHint) {
            const hintX = ctx.canvas.width / 2;
            const hintY = startY;
            paintKey(ctx, "TAB", { x: hintX - 70, y: hintY - 60 });
            ctx.font = firstFontSize + "px Arial";
            ctx.fillText("More Info", hintX - 30, hintY - 40);
        }
        for (let i = 0; i < character.upgradeChoices.length; i++) {
            const choice = character.upgradeChoices[i];
            const upgradeText: string[] = [choice.displayText];
            if (game.UI.displayLongInfos && choice.displayLongText) upgradeText.push(...choice.displayLongText);
            ctx.globalAlpha = game.UI.displayLongInfos ? 0.75 : 0.4;
            ctx.fillStyle = "white";
            const textWidthEstimate = maxWidthes[i];
            const rectHeight = firstFontSize + addFontSize * (upgradeText.length - 1) + 6;
            ctx.fillRect(currentX, startY - firstFontSize - 2, textWidthEstimate, rectHeight);
            ctx.globalAlpha = 1;

            paintKey(ctx, (i + 1).toString(), { x: currentX, y: startY - 26 });

            ctx.fillStyle = "black";
            for (let j = 0; j < upgradeText.length; j++) {
                const fontSize = j === 0 ? firstFontSize : addFontSize;
                ctx.font = fontSize + "px Arial";
                const text = upgradeText[j];
                let textY = startY - 3;
                textY += j > 0 ? (firstFontSize + addFontSize * (j - 1)) : 0;
                const textX = currentX + (j === 0 ? 40 : 0);
                paintTextWithOutline(ctx, "white", "black", text, textX, textY);
            }
            currentX += textWidthEstimate + optionSpacer;
        }
    }
}
