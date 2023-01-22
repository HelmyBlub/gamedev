import { Position } from "../gameModel.js";
import { GAME_IMAGES, loadImage } from "../imageLoad.js";
import { randomizedCharacterImageToKey } from "../randomizedCharacterImage.js";
import { Character } from "./characterModel.js";

export function paintCharacters(ctx: CanvasRenderingContext2D, characters: Character[], cameraPosition: Position) {
    for (let i = 0; i < characters.length; i++) {
        paintCharacter(ctx, characters[i], cameraPosition);
    }
}

function paintCharacter(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position) {
    if (character.isDead) return;
    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;
    let paintX = character.x - cameraPosition.x + centerX;
    let paintY = character.y - cameraPosition.y + centerY;
    if (paintX < -character.width || paintX > ctx.canvas.width
        || paintY < -character.height || paintY > ctx.canvas.height) return;

    let characterImageId = "slime";
    if (character.type === "levelingCharacter") characterImageId = "player";
    let characterImage = GAME_IMAGES[characterImageId];
    if (characterImage) {
        if (characterImage.imagePath !== undefined) {
            loadImage(characterImage, character.color, character.randomizedCharacterImage);
            if (characterImage.properties?.canvas) {
                if (characterImageId === "slime") {
                    let spriteAnimation = Math.floor(performance.now() / 250) % 2;
                    let spriteColor = characterImage.properties.colorToSprite!.indexOf(character.color);
                    let spriteWidth = characterImage.spriteRowWidths[0];
                    let spriteHeight = characterImage.spriteRowHeights[0];
                    ctx.drawImage(
                        characterImage.properties.canvas!,
                        0 + spriteAnimation * (spriteWidth + 1),
                        0 + spriteColor * (spriteHeight + 1),
                        spriteWidth, spriteHeight,
                        Math.floor(paintX - character.width / 2),
                        Math.floor(paintY - character.height / 2),
                        character.width, character.height
                    );

                }
            } else if (characterImage.properties?.canvases
                && character.randomizedCharacterImage
                && characterImage.properties?.canvases[randomizedCharacterImageToKey(character.randomizedCharacterImage)]
            ) {
                let spriteWidth = characterImage.spriteRowWidths[0];
                let spriteHeight = 40;
                let widthIndex = moveDirectionToSpriteIndex(character);
                let animationY = 0;
                if (character.isMoving) {
                    animationY = Math.floor(performance.now() / 150) % 4;
                    if (animationY === 2) animationY = 0;
                    if (animationY === 3) animationY = 2;
                }
                ctx.drawImage(
                    characterImage.properties.canvases[randomizedCharacterImageToKey(character.randomizedCharacterImage)],
                    widthIndex * spriteWidth,
                    animationY * spriteHeight,
                    spriteWidth,
                    spriteHeight,
                    Math.floor(paintX - character.width / 2),
                    Math.floor(paintY - character.height / 2),
                    character.width,
                    character.height
                );
            }
        } else {
            console.log("missing image path for enemy", characterImageId);
        }
    } else {
        ctx.fillStyle = character.color;
        ctx.beginPath();
        ctx.arc(
            paintX,
            paintY,
            character.width, 0, 2 * Math.PI);
        ctx.fill();
    }
}

function moveDirectionToSpriteIndex(character: Character): number {
    return (Math.floor(character.moveDirection / Math.PI / 2 * 4) + 3) % 4;
}