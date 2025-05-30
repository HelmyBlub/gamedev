import { paintAbilityObjects, paintUiForAbilities } from "./ability/ability.js";
import { canCharacterTradeAbilityOrPets, findMyCharacter } from "./character/character.js";
import { Character } from "./character/characterModel.js";
import { paintMyCharacterAbilitiesLate, paintPlayerCharacters } from "./character/characterPaint.js";
import { paintBossCharacters, paintBossCrown } from "./character/enemy/bossEnemy.js";
import { findMainCharacterClass, hasPlayerChoosenStartClassUpgrade, paintPlayerCharacterUI, playerCharacterGetLevelClassText, shareCharactersTradeablePreventedMultipleClass } from "./character/playerCharacters/playerCharacters.js";
import { calculateDirection, calculateDistance, calculateFightRetryCounter, findClientInfo, findClosestInteractable, getCameraPosition } from "./game.js";
import { Game, Position, Debugging, Rectangle, Zoom } from "./gameModel.js";
import { Highscores } from "./highscores.js";
import { GAME_IMAGES, loadImage } from "./imageLoad.js";
import { MAP_OBJECTS_FUNCTIONS } from "./map/mapObjects.js";
import { paintMap, paintMapCharacters } from "./map/mapPaint.js";
import { Player, findPlayerByCliendId, isAutoUpgradeActive } from "./player.js";
import { playerInputBindingToDisplayValue } from "./input/playerInput.js";
import { createEndScreenMoreInfos, paintMoreInfos, paintMoreInfosPart } from "./moreInfo.js";
import { paintTextData, paintStackTextData } from "./floatingText.js";
import { paintMapModifierLate } from "./map/modifiers/mapModifier.js";
import { moveByDirectionAndDistance } from "./map/map.js";
import { paintAdditionalPaints } from "./additionalPaint.js";

GAME_IMAGES["blankKey"] = {
    imagePath: "/images/singleBlankKey.png",
    spriteRowHeights: [],
    spriteRowWidths: [],
};

GAME_IMAGES["mouse0Key"] = {
    imagePath: "/images/leftMouse.png",
    spriteRowHeights: [],
    spriteRowWidths: [],
};


export function paintAll(ctx: CanvasRenderingContext2D | undefined, game: Game) {
    if (!ctx) return;
    if (game.performance.mapChunkPaintCache === undefined) game.performance.mapChunkPaintCache = {};
    ctx.scale(game.UI.zoom.factor, game.UI.zoom.factor);
    const cameraPosition: Position = getCameraPosition(game);
    paintMap("Layer1", ctx, cameraPosition, game.state.map, game.performance.mapChunkPaintCache, game.debug, game);
    paintAbilityObjects(ctx, game.state.abilityObjects, game, "beforeCharacterPaint");
    paintMap("Layer2", ctx, cameraPosition, game.state.map, game.performance.mapChunkPaintCache, game.debug, game);
    paintMapCharacters(ctx, cameraPosition, game.state.map, game);
    paintBossCharacters(ctx, cameraPosition, game);
    paintPlayerCharacters(ctx, cameraPosition, game);
    paintAdditionalPaints(ctx, cameraPosition, game);
    paintBossCrown(ctx, cameraPosition, game);
    paintAbilityObjects(ctx, game.state.abilityObjects, game, "afterCharacterPaint");
    paintTextData(ctx, game.UI.displayTextData, cameraPosition, game.state.time, game);
    paintMapModifierLate(ctx, cameraPosition, game);
    paintMyCharacterAbilitiesLate(ctx, cameraPosition, game);
    ctx.resetTransform();

    paintClosestInteractable(ctx, cameraPosition, game);
    paintStackTextData(ctx, game.UI.stackTextsData, game.state.time);
    paintInputTypeInfo(ctx, game);
    paintFightWipeUI(ctx, game);
    paintEndScreen(ctx, game.state.highscores, game);
    paintMyCharacterStats(ctx, game);
    paintTimeMeasures(ctx, game.debug, game);
    paintMoreInfos(ctx, game.UI.moreInfos, game);
    paintMultiplayer(ctx, game);
    paintPausedText(ctx, game);
    paintUiForAbilities(ctx, game);
    paintYouDied(ctx, game);
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

export function getPointPaintPosition(ctx: CanvasRenderingContext2D, point: Position, cameraPosition: Position, zoom: Zoom, zoomedCtx: boolean = true): Position {
    const width = ctx.canvas.width / zoom.factor;
    const height = ctx.canvas.height / zoom.factor;

    const centerX = width / 2;
    const centerY = height / 2;
    let position: Position = {
        x: Math.floor(point.x - cameraPosition.x + centerX),
        y: Math.floor(point.y - cameraPosition.y + centerY),
    }
    if (!zoomedCtx) {
        position.x *= zoom.factor;
        position.y *= zoom.factor;
    }
    return position;
}

/**
 * @param textWithKeys add character "<" + key + ">" like "Press buton <A>" to print a key visualization
 * @returns bounding box
 */
export function paintTextLinesWithKeys(ctx: CanvasRenderingContext2D, textWithKeys: string[], paintPosition: Position, fontSize: number = 20, centered: boolean = false, bottomUp: boolean = false, alpha: number = 0.6): Rectangle {
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
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "white";
    const boundingBox: Rectangle = {
        topLeft: {
            x: tempPaintPos.x - Math.floor(textMaxWidth / 2) - 1,
            y: tempPaintPos.y - 1,
        },
        height: rectHeight,
        width: textMaxWidth + 2,
    }
    ctx.fillRect(boundingBox.topLeft.x, boundingBox.topLeft.y, boundingBox.width, boundingBox.height);
    ctx.globalAlpha = 1;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "black";
    let offsetY = 0;
    if (!centered) tempPaintPos.x = boundingBox.topLeft.x + 2;
    for (let text of textWithKeys) {
        offsetY += fontSize;
        paintTextWithKeys(ctx, text, { x: tempPaintPos.x, y: tempPaintPos.y + offsetY }, fontSize, centered);
        offsetY += verticalSpacing;
    }
    return boundingBox;
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

function paintMultiplayer(ctx: CanvasRenderingContext2D, game: Game) {
    if (!game.multiplayer.websocket) return;
    ctx.font = "16px Arial";
    ctx.fillText("Ping: " + Math.round(game.multiplayer.delay), 10, 80);
    if (game.multiplayer.gameStateCompare?.stateTainted) {
        ctx.font = "64px Arial";
        ctx.fillStyle = "black";
        ctx.fillText("Multiplayer Synchronization Broken", 10, 80);
    }
    paintOtherPlayerIndicator(ctx, game);
}

function paintYouDied(ctx: CanvasRenderingContext2D, game: Game) {
    const myChar = findMyCharacter(game);
    if (myChar === undefined || myChar.state !== "dying") return;
    const dyingTimePerCent = Math.max((myChar.deathAnimationStartTimer! + myChar.deathAnimationDuration! - game.state.time) / myChar.deathAnimationDuration!, 0);
    const textSizeFactor = Math.min(((1 - dyingTimePerCent) * 2), 1);
    ctx.font = `${120 * textSizeFactor}px Arial`;
    paintTextWithOutline(ctx, "white", "black", "YOU DIED", Math.floor(ctx.canvas.width / 2), Math.floor((ctx.canvas.height - 20) / 2), true, 3);
}

function paintOtherPlayerIndicator(ctx: CanvasRenderingContext2D, game: Game) {
    const cameraPosition = getCameraPosition(game);
    const bufferSpace = 10;
    const alpha = 0.75;
    const displayWidth = ctx.canvas.width / game.UI.zoom.factor;
    const displayHeight = ctx.canvas.height / game.UI.zoom.factor;
    ctx.globalAlpha *= alpha;
    for (let player of game.state.players) {
        if (player.character.state === "dead") continue;
        const playerCharacter = player.character;
        if (playerCharacter.x < cameraPosition.x - displayWidth / 2 - bufferSpace
            || playerCharacter.y < cameraPosition.y - displayHeight / 2 - bufferSpace
            || playerCharacter.x > cameraPosition.x + displayWidth / 2 + bufferSpace
            || playerCharacter.y > cameraPosition.y + displayHeight / 2 + bufferSpace
        ) {
            const clientInfo = findClientInfo(player.clientId, game);
            if (!clientInfo) continue;
            const direction = calculateDirection(cameraPosition, playerCharacter);
            const circleRadius = 40;
            const paintPos = calculatePositionToSquareEdge(ctx.canvas.width / 2, ctx.canvas.height / 2, ctx.canvas.width, ctx.canvas.height, direction, circleRadius);
            const indicatorPosition = {
                x: cameraPosition.x + (paintPos.x - ctx.canvas.width / 2) / game.UI.zoom.factor,
                y: cameraPosition.y + (paintPos.y - ctx.canvas.height / 2) / game.UI.zoom.factor,
            };
            const playerName = clientInfo.name;
            const playerDistance = Math.floor(calculateDistance(indicatorPosition, playerCharacter));
            const fontSize = 18;
            ctx.font = `${fontSize}px Arial`;
            const playerNamePaintWidht = ctx.measureText(playerName).width;
            ctx.strokeStyle = "black";
            ctx.fillStyle = "white";
            ctx.globalAlpha *= alpha;
            ctx.beginPath();
            ctx.arc(paintPos.x, paintPos.y, circleRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fill();
            ctx.globalAlpha /= alpha;
            paintTextWithOutline(ctx, "white", "black", playerDistance.toFixed(0), paintPos.x, paintPos.y + fontSize, true);
            if (playerNamePaintWidht > circleRadius * 1.9) {
                const newFontSize = fontSize * (circleRadius / playerNamePaintWidht) * 1.9;
                ctx.font = `${newFontSize}px Arial`;
            }
            paintTextWithOutline(ctx, "white", "black", playerName, paintPos.x, paintPos.y, true);
        }
    }
    ctx.globalAlpha /= alpha;
}

function calculatePositionToSquareEdge(centerX: number, centerY: number, rectWidth: number, rectHeight: number, direction: number, centerRadius: number): Position {
    const directionX = Math.cos(direction);
    const directionY = Math.sin(direction);
    const horizontalStep = Math.floor(rectWidth / 2) - centerRadius;
    const verticalStep = Math.floor(rectHeight / 2) - centerRadius;
    let moveDistance = Infinity;

    if (directionX !== 0) moveDistance = Math.abs(horizontalStep / directionX);
    if (directionY !== 0) {
        const distanceToMoveY = Math.abs(verticalStep / directionY);
        moveDistance = Math.min(moveDistance, distanceToMoveY);
    }

    centerX += directionX * moveDistance;
    centerY += directionY * moveDistance;
    return { x: centerX, y: centerY };
}

function paintClosestInteractable(ctx: CanvasRenderingContext2D, cameraPosition: Position, game: Game) {
    game.UI.paintClosesInteractableMoreInfo = false;
    game.UI.rectangles.interactRectangle = undefined;
    if (game.state.ended) return;
    const player = findPlayerByCliendId(game.multiplayer.myClientId, game.state.players);
    if (!player) return;
    const character = player.character;
    const closestInteractable = findClosestInteractable(character, game);
    if (closestInteractable) {
        if (closestInteractable.mapObject) {
            const mapObejctFunctions = MAP_OBJECTS_FUNCTIONS[closestInteractable.mapObject.type];
            if (mapObejctFunctions && mapObejctFunctions.paintInteract) {
                mapObejctFunctions.paintInteract(ctx, closestInteractable.mapObject, character, game);
            }
        } else if (closestInteractable.pastCharacter) {
            paintPastPlayerGiftInfo(ctx, closestInteractable.pastCharacter, character, cameraPosition, game);
        }
    }
}

function paintPastPlayerGiftInfo(ctx: CanvasRenderingContext2D, pastCharacter: Character, playerCharacter: Character, cameraPosition: Position, game: Game) {
    const classChoosen = playerCharacter.characterClasses !== undefined && playerCharacter.characterClasses.length > 0;
    if (!classChoosen) return;
    const canTrade = canCharacterTradeAbilityOrPets(pastCharacter);
    const classAlreadyTaken = shareCharactersTradeablePreventedMultipleClass(pastCharacter, playerCharacter);

    const uiPosition = { x: pastCharacter.x, y: pastCharacter.y - 40 };
    const paintPos: Position = getPointPaintPosition(ctx, uiPosition, cameraPosition, game.UI.zoom, false);
    const textsWithKeys: string[] = [];
    textsWithKeys.push(`Past Character:`);
    let interactAction: string | undefined = undefined;
    if (canTrade) {
        if (!classAlreadyTaken) {
            const charClass = findMainCharacterClass(pastCharacter);
            const classLevelText = playerCharacterGetLevelClassText(pastCharacter, charClass!);
            if (game.UI.inputType === "keyboard") {
                const interactKey = playerInputBindingToDisplayValue("interact1", game);
                const infoKey = playerInputBindingToDisplayValue("More Info", game);
                textsWithKeys.push(`Press <${interactKey}> to get ${classLevelText} gifted,`);
                textsWithKeys.push(`one time only.`);
                textsWithKeys.push(`<${infoKey}> for more info.`);
            } else if (game.UI.inputType === "touch") {
                textsWithKeys.push(`Touch to get ${classLevelText} gifted,`);
                textsWithKeys.push(`one time only.`);
                interactAction = "interact1";
            }
            game.UI.paintClosesInteractableMoreInfo = true;
        } else {
            if (game.UI.inputType === "keyboard") {
                const infoKey = playerInputBindingToDisplayValue("More Info", game);
                textsWithKeys.push(`<${infoKey}> for more info.`);
                textsWithKeys.push(`Can not gift Abilities as this`);
                textsWithKeys.push(`Class can only be owned once!`);
                paintPos.y -= 20;
            } else if (game.UI.inputType === "touch") {
                textsWithKeys.push(`Can not gift Abilities as this`);
                textsWithKeys.push(`Class can only be owned once!`);
            }
            game.UI.paintClosesInteractableMoreInfo = true;
        }
    } else {
        const interactKey = playerInputBindingToDisplayValue("interact1", game);
        textsWithKeys.push(`No Abilities left to gift.`);
        if (game.UI.inputType === "keyboard") {
            textsWithKeys.push(`Kick Out with <${interactKey}>.`);
        } else if (game.UI.inputType === "touch") {
            textsWithKeys.push(`Touch to Kick Out.`);
            interactAction = "interact1";
        }
        paintPos.y -= 20;
    }
    ctx.fillStyle = "black";
    ctx.font = "20px Arial";
    const rectangle = paintTextLinesWithKeys(ctx, textsWithKeys, paintPos, 20, true, true);
    if (interactAction !== undefined) game.UI.rectangles.interactRectangle = [{ ...rectangle, interactAction: interactAction }];
}

function paintPausedText(ctx: CanvasRenderingContext2D, game: Game) {
    if (!game.state.paused || game.state.ended) return;

    const middleX = ctx.canvas.width / 2;
    ctx.font = "bold 60px Arial";
    paintTextWithOutline(ctx, "white", "black", "PAUSED", middleX, 60, true, 3);
}

function paintTouchMoveControl(ctx: CanvasRenderingContext2D, game: Game) {
    const touchInfo = game.UI.touchInfo;
    if (!touchInfo.touchMoveCornerBottomLeft) return;
    const myChar = findMyCharacter(game);
    if (!myChar) return;

    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    const paintPos: Position = {
        x: touchInfo.touchMoveCornerBottomLeft.x + touchInfo.touchMoveCornerSize / 2,
        y: ctx.canvas.height - touchInfo.touchMoveCornerBottomLeft.y + touchInfo.touchMoveCornerSize / 2,
    }
    if (touchInfo.touchStartMove !== undefined) {
        paintPos.x = touchInfo.touchStartMove.x;
        paintPos.y = touchInfo.touchStartMove.y;
    }
    ctx.beginPath();
    ctx.arc(paintPos.x, paintPos.y, touchInfo.touchMoveCornerSize / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.fillStyle = "black";
    ctx.arc(paintPos.x, paintPos.y, 5, 0, Math.PI * 2);
    const charDirection = myChar.moveDirection;
    ctx.fill();
    if (touchInfo.touchStartMove) {
        const touchLinePos = { x: paintPos.x, y: paintPos.y };
        moveByDirectionAndDistance(touchLinePos, charDirection, touchInfo.touchMoveCornerSize / 2, false);
        ctx.beginPath();
        ctx.moveTo(paintPos.x, paintPos.y);
        ctx.lineTo(touchLinePos.x, touchLinePos.y);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
}

function paintInputTypeInfo(ctx: CanvasRenderingContext2D, game: Game) {
    if (game.UI.inputType === "keyboard") {
        paintKeyInfo(ctx, game);
    } else if (game.UI.inputType === "touch") {
        paintTouchMoveControl(ctx, game);
    }
}

function paintKeyInfo(ctx: CanvasRenderingContext2D, game: Game) {
    if (game.UI.displayMovementKeyHint) paintMoveKeysHint(ctx);
    if (!game.clientKeyBindings) return;
    const fontSize = 16;
    const paintX = ctx.canvas.width - 170;
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

function paintTimeMeasures(ctx: CanvasRenderingContext2D, debug: Debugging | undefined, game: Game) {
    if (debug === undefined || debug.takeTimeMeasures !== true) return;
    const fontSize = 12;
    const startX = 0;
    const startY = 80;
    ctx.fillStyle = "white";
    ctx.fillRect(startX, startY - fontSize, 120, (debug.timeMeasuresData!.length + 1) * fontSize + 1);

    ctx.fillStyle = "black";
    ctx.font = fontSize + "px Arial";
    let totalTicks = 0;
    for (let i = 1; i < game.gameSpeedSettings.ticksPerPaint.length; i++) {
        totalTicks += game.gameSpeedSettings.ticksPerPaint[i];
    }
    const avgTickPerPaint = totalTicks / (game.gameSpeedSettings.ticksPerPaint.length - 1);

    for (let i = 0; i < debug.timeMeasuresData!.length; i++) {
        const data = debug.timeMeasuresData![i];
        const sum = data.timeMeasures.reduce((a, b) => a + b, 0);
        const avg = (sum / data.timeMeasures.length) || 0;
        if (i === 0) {
            ctx.fillText((1000 / avg).toFixed(1) + " FPS", startX, startY + i * fontSize);
            ctx.fillText((1000 / avg * avgTickPerPaint).toFixed(1) + " UPS", startX, startY + (i + 1) * fontSize);
        }
        ctx.fillText(avg.toFixed(2) + " " + data.name, startX, startY + (i + 2) * fontSize);
    }
}

function paintFightWipeUI(ctx: CanvasRenderingContext2D, game: Game) {
    if (!game.state.bossStuff.fightWipe) return;
    const retryKey = playerInputBindingToDisplayValue("interact1", game);
    const concedeKey = playerInputBindingToDisplayValue("interact2", game);
    const paintPos = {
        x: ctx.canvas.width / 2,
        y: 200,
    }
    let retryCounter = calculateFightRetryCounter(game);
    if (retryCounter === 0) return;
    const textRetryLines: string[] = [];
    const textConcedeLines: string[] = [];
    if (game.UI.inputType === "keyboard") {
        textRetryLines.push(`Press <${retryKey}> to use one fight retry. (${retryCounter} retries left).`);
        textConcedeLines.push(`Press <${concedeKey}> to concede.`);
    } else if (game.UI.inputType === "touch") {
        textRetryLines.push(`Touch to use one fight retry. (${retryCounter} retries left).`);
        textConcedeLines.push(`Touch to concede.`);
    }
    game.UI.rectangles.retryTextRectangles = [];
    const retryRec = paintTextLinesWithKeys(ctx, textRetryLines, paintPos, 20, true);
    game.UI.rectangles.retryTextRectangles.push(retryRec);
    paintPos.y += retryRec.height + 10;
    game.UI.rectangles.retryTextRectangles.push(paintTextLinesWithKeys(ctx, textConcedeLines, paintPos, 20, true));
}

function paintEndScreen(ctx: CanvasRenderingContext2D, highscores: Highscores, game: Game) {
    if (!game.state.ended) return;

    paintGameTitle(ctx);

    const paintPos = {
        x: ctx.canvas.width / 2,
        y: 200,
    }

    const restartKey = playerInputBindingToDisplayValue("Restart", game);
    const restartText: string[] = [];
    if (game.UI.inputType === "keyboard") {
        restartText.push(`Press <${restartKey}> to Restart.`);
        paintTextLinesWithKeys(ctx, restartText, paintPos, 20, true);
    } else if (game.UI.inputType === "touch") {
        restartText.push(`Touch this to Restart.`);
        game.UI.rectangles.restartTextRectangle = paintTextLinesWithKeys(ctx, restartText, paintPos, 30, true);
    }
    if (game.UI.lastHighscoreText) {
        paintPos.y += 50;
        paintTextLinesWithKeys(ctx, [`${game.UI.lastHighscoreText}`], paintPos, 20, true);
    }

    const endParts = createEndScreenMoreInfos(game);
    const spacing = 10;
    let totalWidth = -spacing;
    for (let part of endParts) {
        totalWidth += part.width + spacing;
    }

    let paintY = 300;
    let paintX = ctx.canvas.width / 2 - totalWidth / 2;
    for (let part of endParts) {
        paintMoreInfosPart(ctx, part, paintX, paintY);
        paintX += part.width + spacing;
    }
}

function paintGameTitle(ctx: CanvasRenderingContext2D) {
    const middleX = ctx.canvas.width / 2;

    ctx.font = "bold 60px Arial";
    paintTextWithOutline(ctx, "white", "black", "Helmys Game", middleX, 80, true, 3);
    ctx.font = "bold 24px Arial";
    paintTextWithOutline(ctx, "white", "black", "(Earliest Early Access)", middleX, 105, true, 2);
}

function paintMyCharacterStats(ctx: CanvasRenderingContext2D, game: Game) {
    const player = findPlayerByCliendId(game.multiplayer.myClientId, game.state.players);
    if (!player) return;
    paintPlayerStats(ctx, player, game);
}

function paintPlayerStats(ctx: CanvasRenderingContext2D, player: Player, game: Game) {
    const character = player.character;
    ctx.fillStyle = "black";
    ctx.font = "18px Arial";

    const playerUiWidth = Math.floor(ctx.canvas.width * 0.9);
    const playerUiHeight = 40;
    paintPlayerCharacterUI(ctx, player, { x: 5, y: 10 }, playerUiWidth, playerUiHeight, game);

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

function calculateUpgradePaintData(ctx: CanvasRenderingContext2D, character: Character, startY: number, game: Game): Rectangle[] | undefined {
    if (character.upgradeChoices.choices.length <= 0) return undefined;
    const upgradePaintDatas: Rectangle[] = [];
    const firstFontSize = 20;
    const addFontSize = 14;
    const optionSpacer = 50;
    const maxWidthes: number[] = [];
    let totalWidthEsitmate = 0;
    let keyDisplayWidth = 0;
    if (game.UI.inputType === "keyboard") keyDisplayWidth = 40;
    for (let choice of character.upgradeChoices.choices) {
        ctx.font = firstFontSize + "px Arial";
        let maxWidth = ctx.measureText(choice.displayText).width + keyDisplayWidth;

        if (game.UI.displayMoreInfos && choice.displayMoreInfoText) {
            for (let textIt = 0; textIt < choice.displayMoreInfoText.length; textIt++) {
                let text = choice.displayMoreInfoText[textIt];
                ctx.font = addFontSize + "px Arial";

                let width = ctx.measureText(text).width;
                if (width > maxWidth) maxWidth = width;
            }
        }
        maxWidthes.push(maxWidth);
        totalWidthEsitmate += maxWidth;
    }

    totalWidthEsitmate += optionSpacer * (character.upgradeChoices.choices.length - 1);
    let currentX = Math.max(5, ctx.canvas.width / 2 - totalWidthEsitmate / 2);
    for (let i = 0; i < character.upgradeChoices.choices.length; i++) {
        const choice = character.upgradeChoices.choices[i];
        const upgradeText: string[] = [choice.displayText];
        if (game.UI.displayMoreInfos && choice.displayMoreInfoText) upgradeText.push(...choice.displayMoreInfoText);
        const textWidthEstimate = maxWidthes[i];
        const rectHeight = firstFontSize + addFontSize * (upgradeText.length - 1) + 6;
        upgradePaintDatas.push({
            topLeft: {
                x: currentX,
                y: startY - firstFontSize - 2,
            },
            height: rectHeight + 3,
            width: textWidthEstimate,
        });
        currentX += textWidthEstimate + optionSpacer;
    }
    return upgradePaintDatas;
}

function paintUpgradeOptionsUI(ctx: CanvasRenderingContext2D, character: Character, game: Game) {
    game.UI.rectangles.upgradePaintRectangle = undefined;
    if (game.state.ended) return;
    if (isAutoUpgradeActive(game) && hasPlayerChoosenStartClassUpgrade(character)) return;
    if (character.upgradeChoices.choices.length <= 0) return;
    const firstFontSize = 20;
    const addFontSize = 14;
    const startY = (ctx.canvas.height * 0.75);
    let displayKeyHint = false;
    for (let choice of character.upgradeChoices.choices) {
        if (!game.UI.displayMoreInfos && choice.displayMoreInfoText) displayKeyHint = true;
    }
    if (game.UI.inputType === "keyboard") {
        if (displayKeyHint) {
            const hintPos = {
                x: ctx.canvas.width / 2,
                y: startY - 10 - firstFontSize,
            }
            if (character.upgradeChoices.displayText !== "") {
                hintPos.y -= firstFontSize + 15;
            }
            paintTextLinesWithKeys(ctx, ["<TAB> MoreInfo"], hintPos, firstFontSize, true, true);
        }
    }
    if (character.upgradeChoices.displayText !== "") {
        const hintPos = {
            x: ctx.canvas.width / 2,
            y: startY - 10 - firstFontSize,
        }
        paintTextLinesWithKeys(ctx, [character.upgradeChoices.displayText], hintPos, firstFontSize, true, true);
    }
    const upgradePaintData = calculateUpgradePaintData(ctx, character, startY, game);
    game.UI.rectangles.upgradePaintRectangle = upgradePaintData;
    if (upgradePaintData === undefined) return;
    for (let i = 0; i < character.upgradeChoices.choices.length; i++) {
        const choice = character.upgradeChoices.choices[i];
        const paintData = upgradePaintData[i];
        const upgradeText: string[] = [choice.displayText];
        if (game.UI.displayMoreInfos && choice.displayMoreInfoText) upgradeText.push(...choice.displayMoreInfoText);
        ctx.globalAlpha = game.UI.displayMoreInfos ? 0.75 : 0.4;
        ctx.fillStyle = "white";
        ctx.fillRect(paintData.topLeft.x, paintData.topLeft.y, paintData.width, paintData.height);
        ctx.globalAlpha = 1;

        if (game.UI.inputType === "keyboard") {
            paintKey(ctx, (i + 1).toString(), { x: paintData.topLeft.x, y: paintData.topLeft.y });
        }

        ctx.fillStyle = "black";
        for (let j = 0; j < upgradeText.length; j++) {
            const fontSize = j === 0 ? firstFontSize : addFontSize;
            ctx.font = fontSize + "px Arial";
            const text = upgradeText[j];
            let textY = paintData.topLeft.y + firstFontSize;
            textY += j > 0 ? (firstFontSize + addFontSize * (j - 1)) : 0;
            let textX = paintData.topLeft.x;
            if (game.UI.inputType === "keyboard") {
                textX = paintData.topLeft.x + (j === 0 ? 40 : 0);
            }
            paintTextWithOutline(ctx, "white", "black", text, textX, textY);
        }
    }
}
