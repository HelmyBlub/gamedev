import { createRandomizedCharacter, RandomizedCharacterImage, randomizedCharacterImageToKey } from "./randomizedCharacterImage.js";

export type GameImages = {
    [key: string]: GameImage,
}

export type RgbColor = {
    r: number,
    g: number,
    b: number,
}

export type GameImage = {
    spriteRowHeights: number[],
    spriteRowWidths: number[],
    imagePath?: string,
    imageRef?: HTMLImageElement,
    properties?: any,
}

export type DefaultGameImageProperties = {
    baseColor?: string,
    canvases?: {[key:string]: HTMLCanvasElement},
    canvas?: HTMLCanvasElement,
    colorToSprite?: string[],
}

export type ColorConversions = {
    [key: string]: RgbColor,
}

export const COLOR_CONVERSION: ColorConversions = {
    "green": { r: 0, g: 255, b: 0 },
    "black": { r: 0, g: 0, b: 0 },
    "red": { r: 255, g: 0, b: 0 },
    "blue": { r: 0, g: 0, b: 255 },
    "white": { r: 255, g: 255, b: 255 },
}

export const GAME_IMAGES: GameImages = {};

export function loadImage(gameImage: GameImage, color: string = "", randomizedCharacterImage: RandomizedCharacterImage | undefined = undefined) {
    if (gameImage.imageRef === undefined) {
        let image = new Image();
        image.src = gameImage.imagePath!;
        gameImage.imageRef = image;
    }
    if (color !== "" && gameImage.properties?.baseColor !== undefined) {
        createColorVariants(gameImage, color);
    } else if (randomizedCharacterImage !== undefined && gameImage.imageRef?.complete) {
        if (gameImage.properties === undefined) gameImage.properties = {};
        if (gameImage.properties!.canvases === undefined) gameImage.properties!.canvases = {};
        if (gameImage.properties?.canvases[randomizedCharacterImageToKey(randomizedCharacterImage)] === undefined) {
            gameImage.properties!.canvases[randomizedCharacterImageToKey(randomizedCharacterImage)] = createRandomizedCharacter(gameImage, randomizedCharacterImage);
        }
    }
}

export function replaceColorInIamgeArea(imageCtx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, newColorRGB: RgbColor, toChangeColor: RgbColor) {
    let imageData = imageCtx.getImageData(x, y, width, height);
    replaceColor(imageData, newColorRGB, toChangeColor);
    imageCtx.putImageData(imageData, x, y);
}

function createColorVariants(gameImage: GameImage, color: string) {
    if (gameImage.properties?.canvas === undefined && gameImage.imageRef?.complete) {
        let canvas = document.createElement('canvas');
        canvas.width = gameImage.imageRef!.width;
        canvas.height = (gameImage.imageRef!.height + 1) * Object.keys(COLOR_CONVERSION).length;
        let imageCtx: CanvasRenderingContext2D = canvas.getContext("2d")!;
        imageCtx.drawImage(gameImage.imageRef!, 0, 0);
        gameImage.properties!.canvas = canvas;
        gameImage.properties!.colorToSprite = [gameImage.properties!.baseColor!];
    }
    if (gameImage.properties?.canvas && gameImage.properties.colorToSprite?.indexOf(color) === -1) {
        if (color !== gameImage.properties.baseColor) {
            let paintY = (gameImage.imageRef!.height + 1) * gameImage.properties.colorToSprite.length;
            gameImage.properties.colorToSprite.push(color);
            let imageCtx: CanvasRenderingContext2D = gameImage.properties.canvas.getContext("2d", { willReadFrequently: true })!;
            imageCtx.drawImage(gameImage.imageRef!, 0, paintY);
            let newColorRGB = COLOR_CONVERSION[color];
            let toChangeColor = COLOR_CONVERSION[gameImage.properties.baseColor!];
            replaceColorInIamgeArea(imageCtx, 0, paintY, gameImage.properties.canvas.width, gameImage.imageRef!.height, newColorRGB, toChangeColor);
        }
    }
}

function replaceColor(imageData: ImageData, newColorRGB: RgbColor, toChangeColor: RgbColor) {
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

