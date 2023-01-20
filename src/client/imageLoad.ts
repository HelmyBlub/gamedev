import { nextRandom, RandomSeed } from "./randomNumberGenerator.js";

type GameImages = {
    [key: string]: GameImage,
}

type GameImage = {
    spriteRowHeights: number[],
    spriteRowWidths: number[],
    imagePath?: string,
    imageRef?: HTMLImageElement,
    properties?: any,
}

type ColorConversions = {
    [key: string]: { r: number, g: number, b: number },
}

const COLOR_CONVERSION: ColorConversions = {
    "green": { r: 0, g: 255, b: 0 },
    "black": { r: 0, g: 0, b: 0 },
    "red": { r: 255, g: 0, b: 0 },
    "blue": { r: 0, g: 0, b: 255 },
    "white": { r: 255, g: 255, b: 255 },
}

export const GAME_IMAGES: GameImages = {};

export function loadImage(gameImage: GameImage, color: string = "", randomizedPaintKey: string | undefined = undefined) {
    if (gameImage.imageRef === undefined) {
        let image = new Image();
        image.src = gameImage.imagePath!;
        gameImage.imageRef = image;
    }
    if (color !== "" && gameImage.properties?.baseColor !== undefined) {
        createColorVariants(gameImage, color);
    } else if (randomizedPaintKey !== undefined && gameImage.imageRef?.complete) {
        if (gameImage.properties === undefined) gameImage.properties = {};
        if (gameImage.properties.canvases === undefined) gameImage.properties.canvases = {};
        if (gameImage.properties?.canvases[randomizedPaintKey] === undefined) {
            gameImage.properties.canvases[randomizedPaintKey] = createRandomizedCharacter(gameImage, randomizedPaintKey);
        }
    }
}

export function createRandomizedCharacterPaintKey(gameImage: GameImage, seed: RandomSeed): string {
    let result = "";
    for (let i = 0; i < gameImage.spriteRowHeights.length; i++) {
        if (i > 0) result += "_";
        result += Math.floor(nextRandom(seed) * gameImage.properties.spriteCounter[i]);
    }
    result += "|" + Math.floor(nextRandom(seed) * Object.keys(COLOR_CONVERSION).length);
    result += "|" + Math.floor(nextRandom(seed) * Object.keys(COLOR_CONVERSION).length);

    return result;
}

function createRandomizedCharacter(gameImage: GameImage, randomizedPaintKey: string): CanvasImageSource {
    let canvas = document.createElement('canvas');
    let numberCharacterDirections = gameImage.properties.spriteCharacterDirection.length;
    canvas.width = gameImage.spriteRowWidths[0] * (numberCharacterDirections + 1);
    canvas.height = gameImage.imageRef!.height;
    let imageCtx: CanvasRenderingContext2D = canvas.getContext("2d")!;
    let paintKeyParts = randomizedPaintKey.split("|");
    let spriteIndexes = paintKeyParts[0].split("_");
    let sy = 0;
    let borderWidth = 1;
    let totalCharacterSpritesWidth = numberCharacterDirections * (gameImage.spriteRowWidths[0] + borderWidth);
    for (let i = 0; i < spriteIndexes.length; i++) {
        let spriteIndex = parseInt(spriteIndexes[i]);
        for (let directionIndex = 0; directionIndex < numberCharacterDirections + 1; directionIndex++) {
            let offsetSX = borderWidth + spriteIndex * totalCharacterSpritesWidth + (gameImage.spriteRowWidths[0] + borderWidth) * directionIndex;
            let offsetDX = gameImage.spriteRowWidths[0] * directionIndex;
            if(directionIndex === numberCharacterDirections){
                imageCtx.save();
                imageCtx.translate(canvas.width, 0);
                imageCtx.scale(-1,1);
                offsetSX = borderWidth + spriteIndex * totalCharacterSpritesWidth + (gameImage.spriteRowWidths[0] + borderWidth) * 1;
                offsetDX = 0;
            }
            imageCtx.drawImage(
                gameImage.imageRef!,
                offsetSX,
                sy + 1 + i * 1,
                gameImage.spriteRowWidths[0],
                gameImage.spriteRowHeights[i],
                offsetDX,
                sy,
                gameImage.spriteRowWidths[0],
                gameImage.spriteRowHeights[i],
            );
            if(directionIndex === numberCharacterDirections){
                imageCtx.restore();
            }
        }
        sy += gameImage.spriteRowHeights[i];
    }
    replaceColorInIamgeArea(imageCtx, 0, 0, canvas.width, canvas.height,
        COLOR_CONVERSION[Object.keys(COLOR_CONVERSION)[parseInt(paintKeyParts[1])]],
        COLOR_CONVERSION[gameImage.properties.skinColor]
    );
    replaceColorInIamgeArea(imageCtx, 0, 0, canvas.width, canvas.height,
        COLOR_CONVERSION[Object.keys(COLOR_CONVERSION)[parseInt(paintKeyParts[2])]],
        COLOR_CONVERSION[gameImage.properties.clothColor]
    );

    return canvas;
}

function createColorVariants(gameImage: GameImage, color: string) {
    if (gameImage.properties?.canvas === undefined && gameImage.imageRef?.complete) {
        let canvas = document.createElement('canvas');
        canvas.width = gameImage.imageRef!.width;
        canvas.height = gameImage.imageRef!.height * Object.keys(COLOR_CONVERSION).length;
        let imageCtx: CanvasRenderingContext2D = canvas.getContext("2d")!;
        imageCtx.drawImage(gameImage.imageRef!, 0, 0);
        gameImage.properties.canvas = canvas;
        gameImage.properties.colorToSprite = [gameImage.properties.baseColor];
    }
    if (gameImage.properties?.canvas && gameImage.properties.colorToSprite?.indexOf(color) === -1) {
        if (color !== gameImage.properties.baseColor) {
            let paintY = gameImage.imageRef!.height * gameImage.properties.colorToSprite.length;
            gameImage.properties.colorToSprite.push(color);
            let imageCtx: CanvasRenderingContext2D = gameImage.properties.canvas.getContext("2d")!;
            imageCtx.drawImage(gameImage.imageRef!, 0, paintY);
            let newColorRGB = COLOR_CONVERSION[color];
            let toChangeColor = COLOR_CONVERSION[gameImage.properties.baseColor];
            replaceColorInIamgeArea(imageCtx, 0, paintY, gameImage.properties.canvas.width, gameImage.imageRef!.height, newColorRGB, toChangeColor);
        }
    }
}

function replaceColorInIamgeArea(imageCtx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, newColorRGB: any, toChangeColor: any) {
    let imageData = imageCtx.getImageData(x, y, width, height);
    replaceColor(imageData, newColorRGB, toChangeColor);
    imageCtx.putImageData(imageData, x, y);
}

function replaceColor(imageData: ImageData, newColorRGB: any, toChangeColor: any) {
    let data = imageData.data;
    for (let pixelStart = 0; pixelStart < data.length; pixelStart += 4) {
        if (data[pixelStart] === toChangeColor.r
            && data[pixelStart + 1] === toChangeColor.g
            && data[pixelStart + 2] === toChangeColor.b
        ) {
            data[pixelStart] = newColorRGB.r;
            data[pixelStart + 1] = newColorRGB.g;
            data[pixelStart + 2] = newColorRGB.b;
        } else if (data[pixelStart] === newColorRGB.r
            && data[pixelStart + 1] === newColorRGB.g
            && data[pixelStart + 2] === newColorRGB.b
        ) {
            data[pixelStart] = 255;
            data[pixelStart + 1] = 255;
            data[pixelStart + 2] = 255;
        }
    }
}

