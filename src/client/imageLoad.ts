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
        result += Math.floor(nextRandom(seed) * 2);
    }
    return result;
}

function createRandomizedCharacter(gameImage: GameImage, randomizedPaintKey: string): CanvasImageSource {
    let canvas = document.createElement('canvas');
    canvas.width = gameImage.imageRef!.width;
    canvas.height = gameImage.imageRef!.height;
    let imageCtx: CanvasRenderingContext2D = canvas.getContext("2d")!;
    console.log(randomizedPaintKey);
    let spriteIndexes = randomizedPaintKey.split("_");
    let sy = 0;
    for (let i = 0; i < spriteIndexes.length; i++) {
        let offset = parseInt(spriteIndexes[i]) * gameImage.spriteRowWidths[i];
        imageCtx.drawImage(
            gameImage.imageRef!,
            offset,
            sy,
            gameImage.spriteRowWidths[i],
            gameImage.spriteRowHeights[i],
            0,
            sy,
            gameImage.spriteRowWidths[i],
            gameImage.spriteRowHeights[i],
        );
        sy += gameImage.spriteRowHeights[i];
    }
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
            let imageData = imageCtx.getImageData(0, paintY, gameImage.properties.canvas.width, gameImage.imageRef!.height);
            let newColorRGB = COLOR_CONVERSION[color];
            let toChangeColor = COLOR_CONVERSION[gameImage.properties.baseColor];
            replaceColor(imageData, newColorRGB, toChangeColor);
            imageCtx.putImageData(imageData, 0, paintY);
        }
    }
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

