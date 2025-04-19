import { findMyCharacter } from "./character/character.js";
import { getCameraPosition } from "./game.js";
import { Game, Position } from "./gameModel.js";
import { paintTextWithOutline } from "./gamePaint.js";
import { getImage } from "./imageLoad.js";

export type PaintTextData = {
    text: string,
    paintPosition: Position,
    color: string,
    fontSize: string,
    removeTime: number,
    outlined?: boolean,
}

export type PaintStackTextsData = {
    paintMiddleOffset: Position,
    color: string,
    fontSize: number,
    textStack: PaintStackTextData[],
}

export type PaintStackTextData = {
    text: string,
    countdownTimer?: number,
    removeTime: number,
    isRealRemoveTime?: boolean,
    idRef?: number,
    image?: string,
}

export function createDefaultStackTextsData(): PaintStackTextsData {
    return {
        paintMiddleOffset: { x: 30, y: 0 },
        color: "black",
        fontSize: 20,
        textStack: [],
    }
}

export function addPaintFloatingTextInfoForMyself(text: string, game: Game, timer: number | undefined, characterId: number, idRef?: number, image?: string) {
    const myChar = findMyCharacter(game);
    if (myChar && myChar.id === characterId) {
        pushStackPaintTextData(game.UI.stackTextsData, text, game.state.time, timer, false, idRef, image);
    }
}

export function pushStackPaintTextData(paintStackTextsData: PaintStackTextsData, text: string, currentTime: number, timer?: number, isRealRemoveTime?: boolean, idRef?: number, image?: string) {
    const removeTime = currentTime + 1500;
    if (idRef !== undefined) {
        let found = paintStackTextsData.textStack.find((d) => d.idRef === idRef);
        if (found) {
            found.removeTime = removeTime;
            if (timer) found.countdownTimer = currentTime + timer;
            return;
        }
    }
    const countDownEndTime = timer !== undefined ? timer + currentTime : undefined
    paintStackTextsData.textStack.push(createStackPaintTextData(text, removeTime, countDownEndTime, isRealRemoveTime, idRef, image));
}

function createStackPaintTextData(text: string, removeTime: number, countDownEndTime?: number, isRealRemoveTime?: boolean, idRef?: number, image?: string): PaintStackTextData {
    return {
        text: text,
        removeTime: removeTime,
        countdownTimer: countDownEndTime,
        isRealRemoveTime: isRealRemoveTime,
        idRef: idRef,
        image: image,
    }
}

export function createPaintTextData(position: Position, text: string, color: string, fontSize: string, currentTime: number, duration: number = 1000, outlined: boolean = false): PaintTextData {
    return {
        text: text,
        paintPosition: { x: position.x, y: position.y },
        color: color,
        fontSize: fontSize,
        removeTime: currentTime + duration,
        outlined: outlined,
    }
}

export function displayTextAtCameraPosition(text: string, game: Game) {
    let textPosition1 = getCameraPosition(game);
    textPosition1.y += 24;
    game.UI.displayTextData.push(createPaintTextData(textPosition1, text, "black", "24", game.state.time, 5000));
}

export function paintTextData(ctx: CanvasRenderingContext2D, damageNumbersData: PaintTextData[] | undefined, cameraPosition: Position, time: number, game: Game) {
    if (damageNumbersData === undefined) return;
    const centerX = ctx.canvas.width / game.UI.zoom.factor / 2;
    const centerY = ctx.canvas.height / game.UI.zoom.factor / 2;
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
            if (data.outlined) {
                paintTextWithOutline(ctx, "white", data.color, data.text, paintX, paintY + timeLeft);
            } else {
                ctx.fillText(data.text, paintX, paintY + timeLeft);
            }
        }
    }
}

export function paintStackTextData(ctx: CanvasRenderingContext2D, paintStackTextsData: PaintStackTextsData, time: number) {
    let paintPos = {
        x: ctx.canvas.width / 2 + paintStackTextsData.paintMiddleOffset.x,
        y: ctx.canvas.height / 2 + paintStackTextsData.paintMiddleOffset.y,
    }
    ctx.fillStyle = paintStackTextsData.color;
    ctx.font = paintStackTextsData.fontSize + "px Arial";
    const verticalSpacing = 2;
    for (let i = paintStackTextsData.textStack.length - 1; i >= 0; i--) {
        const data = paintStackTextsData.textStack[i];
        let isTimedOut = false;
        if (data.isRealRemoveTime) {
            if (data.removeTime <= performance.now()) {
                isTimedOut = true;
            }

        } else {
            if (data.removeTime <= time) {
                isTimedOut = true;
            }
        }
        if (isTimedOut) {
            paintStackTextsData.textStack.splice(i, 1);
        } else {
            let xOffset = 0;
            let text = data.text;
            if (data.countdownTimer) {
                const countdown = data.countdownTimer - time;
                if (countdown <= 0) {
                    text = `(ready) ${text}`;
                } else {
                    text = `(${((countdown) / 1000).toFixed(1)}s) ${text}`;
                }
            }
            if (data.image) {
                const image = getImage(data.image);
                if (image) {
                    ctx.drawImage(image, 0, 0, 40, 40,
                        paintPos.x,
                        paintPos.y - paintStackTextsData.fontSize + 1,
                        paintStackTextsData.fontSize,
                        paintStackTextsData.fontSize
                    );
                    xOffset += paintStackTextsData.fontSize + 2;
                }
            }
            paintTextWithOutline(ctx, "white", "black", text, paintPos.x + xOffset, paintPos.y);
            paintPos.y -= paintStackTextsData.fontSize + verticalSpacing;
        }
    }
}
