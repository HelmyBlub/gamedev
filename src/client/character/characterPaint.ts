import { Position } from "../gameModel.js";
import { GAME_IMAGES, loadImage } from "../imageLoad.js";
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
            loadImage(characterImage, character.color, character.randomizedPaintKey);
            if (characterImage.properties?.canvas) {
                if (characterImageId === "slime") {
                    let spriteAnimation = Math.floor(performance.now() / 250) % 2;
                    let spriteColor = characterImage.properties.colorToSprite!.indexOf(character.color);
                    let spriteWidth = characterImage.spriteRowWidths[0];
                    let spriteHeight = characterImage.spriteRowHeights[0];
                    ctx.drawImage(
                        characterImage.properties.canvas!,
                        0 + spriteAnimation * spriteWidth,
                        0 + spriteColor * spriteHeight,
                        spriteWidth, spriteHeight,
                        paintX - character.width / 2,
                        paintY - character.height / 2,
                        character.width, character.height
                    );

                }
            } else if (characterImage.properties?.canvases && character.randomizedPaintKey && characterImage.properties?.canvases[character.randomizedPaintKey]) {
                let spriteWidth = characterImage.spriteRowWidths[0];
                let spriteHeight = 40;
                ctx.drawImage(
                    characterImage.properties.canvases[character.randomizedPaintKey],
                    0,
                    0,
                    spriteWidth, spriteHeight,
                    paintX - character.width / 2,
                    paintY - character.height / 2,
                    character.width, character.height
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
