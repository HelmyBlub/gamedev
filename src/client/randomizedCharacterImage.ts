import { CharacterImageLoadProperties } from "./character/characterModel.js";
import { COLOR_CONVERSION, GameImage, replaceColorInImageArea } from "./imageLoad.js";
import { RandomSeed, nextRandom } from "./randomNumberGenerator.js";

export type RandomizedCharacterImage = {
    headIndex: number,
    chestIndex: number,
    legsIndex: number,
    skinColor: string,
    clothColor: string,
}

export function createRandomizedCharacterImageData(gameImage: GameImage, seed: RandomSeed): RandomizedCharacterImage {
    const colorKeys = Object.keys(COLOR_CONVERSION);
    const properties: CharacterImageLoadProperties = gameImage.properties;
    const result: RandomizedCharacterImage = {
        headIndex: Math.floor(nextRandom(seed) * properties.headSpriteCounter),
        chestIndex: Math.floor(nextRandom(seed) * properties.chestSpriteCounter),
        legsIndex: Math.floor(nextRandom(seed) * properties.legsSpriteCounter),
        skinColor: colorKeys[Math.floor(nextRandom(seed) * colorKeys.length)],
        clothColor: colorKeys[Math.floor(nextRandom(seed) * colorKeys.length)],
    };

    return result;
}

export function randomizedCharacterImageToKey(randomizedCharacterImage: RandomizedCharacterImage) {
    let result = "";
    result += randomizedCharacterImage.headIndex;
    result += "_" + randomizedCharacterImage.chestIndex;
    result += "_" + randomizedCharacterImage.legsIndex;
    result += "|" + randomizedCharacterImage.skinColor;
    result += "|" + randomizedCharacterImage.clothColor;
    return result;
}

export function createRandomizedCharacter(gameImage: GameImage, randomizedCharacterImage: RandomizedCharacterImage): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const properties: CharacterImageLoadProperties = gameImage.properties;
    const walkinAnimationSpriteCount = properties.legsSpriteRows.length;
    const numberCharacterDirections = properties.directionSpriteCount;
    const characterSpriteHeight = gameImage.spriteRowHeights[0] + gameImage.spriteRowHeights[1] + gameImage.spriteRowHeights[2];
    canvas.width = gameImage.spriteRowWidths[0] * (numberCharacterDirections + 1);
    canvas.height = characterSpriteHeight * walkinAnimationSpriteCount;
    const imageCtx: CanvasRenderingContext2D = canvas.getContext("2d", { willReadFrequently: true })!;
    const spriteBodyPartIndexes = [randomizedCharacterImage.headIndex, randomizedCharacterImage.chestIndex, randomizedCharacterImage.legsIndex];
    let sy = 0;
    const borderWidth = 1;
    const totalCharacterSpritesWidth = numberCharacterDirections * (gameImage.spriteRowWidths[0] + borderWidth);
    for (let bodyPartIndex = 0; bodyPartIndex < spriteBodyPartIndexes.length; bodyPartIndex++) {
        const spriteIndex = spriteBodyPartIndexes[bodyPartIndex];
        for (let directionIndex = 0; directionIndex < numberCharacterDirections + 1; directionIndex++) {
            for (let walkingAnimationIndex = 0; walkingAnimationIndex < walkinAnimationSpriteCount; walkingAnimationIndex++) {
                let offsetSY = (characterSpriteHeight + borderWidth * 3) * walkingAnimationIndex;
                offsetSY -= (gameImage.spriteRowHeights[0] + borderWidth) * walkingAnimationIndex;
                if (bodyPartIndex === 0) {
                    offsetSY = 0;
                }
                const offsetDY = characterSpriteHeight * walkingAnimationIndex;

                let offsetSX = borderWidth + spriteIndex * totalCharacterSpritesWidth + (gameImage.spriteRowWidths[0] + borderWidth) * directionIndex;
                let offsetDX = gameImage.spriteRowWidths[0] * directionIndex;
                if (directionIndex === numberCharacterDirections) {
                    imageCtx.save();
                    imageCtx.translate(canvas.width, 0);
                    imageCtx.scale(-1, 1);
                    offsetSX = borderWidth + spriteIndex * totalCharacterSpritesWidth + (gameImage.spriteRowWidths[0] + borderWidth) * 1;
                    offsetDX = 0;
                }
                imageCtx.drawImage(
                    gameImage.imageRef!,
                    offsetSX,
                    sy + 1 + bodyPartIndex * 1 + offsetSY,
                    gameImage.spriteRowWidths[0],
                    gameImage.spriteRowHeights[bodyPartIndex],
                    offsetDX,
                    sy + offsetDY,
                    gameImage.spriteRowWidths[0],
                    gameImage.spriteRowHeights[bodyPartIndex],
                );
                if (directionIndex === numberCharacterDirections) {
                    imageCtx.restore();
                }
            }
        }
        sy += gameImage.spriteRowHeights[bodyPartIndex];
    }
    replaceColorInImageArea(imageCtx, 0, 0, canvas.width, canvas.height,
        COLOR_CONVERSION[randomizedCharacterImage.skinColor],
        COLOR_CONVERSION[properties.skinColor],
        false
    );
    replaceColorInImageArea(imageCtx, 0, 0, canvas.width, canvas.height,
        COLOR_CONVERSION[randomizedCharacterImage.clothColor],
        COLOR_CONVERSION[properties.clothColor],
        false
    );

    return canvas;
}