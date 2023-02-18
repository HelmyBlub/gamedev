import { CharacterImageLoadProperties } from "./character/characterModel.js";
import { COLOR_CONVERSION, GameImage, replaceColorInIamgeArea } from "./imageLoad.js";
import { RandomSeed, nextRandom } from "./randomNumberGenerator.js";

export type RandomizedCharacterImage = {
    headIndex: number,
    chestIndex: number,
    legsIndex: number,
    skinColor: string,
    clothColor: string,
}

export function createRandomizedCharacterImageData(gameImage: GameImage, seed: RandomSeed): RandomizedCharacterImage {
    let colorKeys = Object.keys(COLOR_CONVERSION);
    let properties: CharacterImageLoadProperties = gameImage.properties;
    let result: RandomizedCharacterImage = {
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
    let canvas = document.createElement('canvas');
    let properties: CharacterImageLoadProperties = gameImage.properties;
    let walkinAnimationSpriteCount = properties.legsSpriteRows.length;
    let numberCharacterDirections = properties.directionSpriteCount;
    let characterSpriteHeight = gameImage.spriteRowHeights[0] + gameImage.spriteRowHeights[1] + gameImage.spriteRowHeights[2];
    canvas.width = gameImage.spriteRowWidths[0] * (numberCharacterDirections + 1);
    canvas.height = characterSpriteHeight * walkinAnimationSpriteCount;
    let imageCtx: CanvasRenderingContext2D = canvas.getContext("2d", { willReadFrequently: true })!;
    let spriteBodyPartIndexes = [randomizedCharacterImage.headIndex, randomizedCharacterImage.chestIndex, randomizedCharacterImage.legsIndex];
    let sy = 0;
    let borderWidth = 1;
    let totalCharacterSpritesWidth = numberCharacterDirections * (gameImage.spriteRowWidths[0] + borderWidth);
    for (let bodyPartIndex = 0; bodyPartIndex < spriteBodyPartIndexes.length; bodyPartIndex++) {
        let spriteIndex = spriteBodyPartIndexes[bodyPartIndex];
        for (let directionIndex = 0; directionIndex < numberCharacterDirections + 1; directionIndex++) {
            for (let walkingAnimationIndex = 0; walkingAnimationIndex < walkinAnimationSpriteCount; walkingAnimationIndex++) {
                let offsetSY = (characterSpriteHeight + borderWidth * 3) * walkingAnimationIndex;
                offsetSY -= (gameImage.spriteRowHeights[0] + borderWidth) * walkingAnimationIndex;
                if (bodyPartIndex === 0) {
                    offsetSY = 0;
                }
                let offsetDY = characterSpriteHeight * walkingAnimationIndex;

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
    replaceColorInIamgeArea(imageCtx, 0, 0, canvas.width, canvas.height,
        COLOR_CONVERSION[randomizedCharacterImage.skinColor],
        COLOR_CONVERSION[properties.skinColor]
    );
    replaceColorInIamgeArea(imageCtx, 0, 0, canvas.width, canvas.height,
        COLOR_CONVERSION[randomizedCharacterImage.clothColor],
        COLOR_CONVERSION[properties.clothColor]
    );

    return canvas;
}