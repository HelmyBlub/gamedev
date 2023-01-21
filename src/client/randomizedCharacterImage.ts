import { COLOR_CONVERSION, GameImage, replaceColorInIamgeArea } from "./imageLoad.js";
import { RandomSeed, nextRandom } from "./randomNumberGenerator.js";

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

export function createRandomizedCharacter(gameImage: GameImage, randomizedPaintKey: string): CanvasImageSource {
    let canvas = document.createElement('canvas');
    let walkinAnimationSpriteCount = gameImage.properties.animationSpriteCount;
    let numberCharacterDirections = gameImage.properties.spriteCharacterDirection.length;
    let characterSpriteHeight = gameImage.spriteRowHeights[0]+gameImage.spriteRowHeights[1]+gameImage.spriteRowHeights[2];
    canvas.width = gameImage.spriteRowWidths[0] * (numberCharacterDirections + 1);
    canvas.height = characterSpriteHeight * walkinAnimationSpriteCount;
    let imageCtx: CanvasRenderingContext2D = canvas.getContext("2d")!;
    let paintKeyParts = randomizedPaintKey.split("|");
    let spriteBodyPartIndexes = paintKeyParts[0].split("_");
    let sy = 0;
    let borderWidth = 1;
    let totalCharacterSpritesWidth = numberCharacterDirections * (gameImage.spriteRowWidths[0] + borderWidth);
    for (let bodyPartIndex = 0; bodyPartIndex < spriteBodyPartIndexes.length; bodyPartIndex++) {
        let spriteIndex = parseInt(spriteBodyPartIndexes[bodyPartIndex]);
        for (let directionIndex = 0; directionIndex < numberCharacterDirections + 1; directionIndex++) {
            for (let walkingAnimationIndex = 0; walkingAnimationIndex < walkinAnimationSpriteCount; walkingAnimationIndex++) {
                let offsetSY = (characterSpriteHeight + borderWidth * 3) * walkingAnimationIndex;
                offsetSY -= (gameImage.spriteRowHeights[0] + borderWidth) * walkingAnimationIndex;
                if(bodyPartIndex === 0){
                    offsetSY = 0;
                }
                let offsetDY = characterSpriteHeight * walkingAnimationIndex;

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
                    sy + 1 + bodyPartIndex * 1 + offsetSY,
                    gameImage.spriteRowWidths[0],
                    gameImage.spriteRowHeights[bodyPartIndex],
                    offsetDX,
                    sy + offsetDY,
                    gameImage.spriteRowWidths[0],
                    gameImage.spriteRowHeights[bodyPartIndex],
                );
                if(directionIndex === numberCharacterDirections){
                    imageCtx.restore();
                }
            }
        }
        sy += gameImage.spriteRowHeights[bodyPartIndex];
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