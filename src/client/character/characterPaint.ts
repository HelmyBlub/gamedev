import { Position } from "../gameModel.js";
import { Character, COLOR_CONVERSION, EnemyImage, ENEMY_IMAGES } from "./characterModel.js";

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
    let paintY = character.y - cameraPosition.y + centerY ;
    if (paintX < -character.size || paintX > ctx.canvas.width
        || paintY < -character.size || paintY > ctx.canvas.height) return;

    let characterImageId = "slime";
    if(character.type === "levelingCharacter") characterImageId = "player";
    if (ENEMY_IMAGES[characterImageId]) {
        if (ENEMY_IMAGES[characterImageId].imagePath !== undefined) {
            loadImage(ENEMY_IMAGES[characterImageId], character.color);
            if (ENEMY_IMAGES[characterImageId].canvas) {
                let spriteAnimation = Math.floor(performance.now()/250)%2;
                let spriteColor = ENEMY_IMAGES[characterImageId].colorToSprite!.indexOf(character.color);
                let spriteSize = ENEMY_IMAGES[characterImageId].spriteSize;
                ctx.drawImage(
                    ENEMY_IMAGES[characterImageId].canvas!,
                    0 + spriteAnimation * spriteSize,
                    0 + spriteColor * spriteSize + 1,
                    spriteSize, spriteSize,
                    paintX - character.size / 2,
                    paintY - character.size / 2,
                    character.size, character.size
                );
            }
        } else {
            console.log("missing image path for enemy", characterImageId);
        }
    } else{
        ctx.fillStyle = character.color;
        ctx.beginPath();
        ctx.arc(
            paintX,
            paintY,
            character.size, 0, 2 * Math.PI);
        ctx.fill();
    }       
}

function loadImage(enemyImage: EnemyImage, color: string){
    if (enemyImage.canvas === undefined) {
        if (enemyImage.imageRef === undefined) {
            let image = new Image();
            image.src = enemyImage.imagePath!;
            enemyImage.imageRef = image;
        }
        if (enemyImage.imageRef!.complete) {
            let canvas = document.createElement('canvas');
            canvas.width = enemyImage.imageRef!.width;
            canvas.height = enemyImage.imageRef!.height * Object.keys(COLOR_CONVERSION).length;
            let imageCtx: CanvasRenderingContext2D = canvas.getContext("2d")!;
            imageCtx.drawImage(enemyImage.imageRef!, 0, 0);
            enemyImage.canvas = canvas;
            enemyImage.colorToSprite = [enemyImage.baseColor];
        }
    }
    if (enemyImage.canvas && enemyImage.colorToSprite?.indexOf(color) === -1) {
        if(color !== enemyImage.baseColor){
            let paintY = enemyImage.imageRef!.height * enemyImage.colorToSprite.length;
            enemyImage.colorToSprite.push(color);
            let imageCtx: CanvasRenderingContext2D = enemyImage.canvas.getContext("2d")!;
            imageCtx.drawImage(enemyImage.imageRef!, 0, paintY);
            let imageData = imageCtx.getImageData(0, paintY, enemyImage.canvas.width, enemyImage.imageRef!.height);
            let data = imageData.data;
            let newColorRGB = COLOR_CONVERSION[color];
            let toChangeColor = COLOR_CONVERSION[enemyImage.baseColor];
            for(let pixelStart = 0; pixelStart < data.length; pixelStart += 4){
                if(data[pixelStart] === toChangeColor.r
                    && data[pixelStart+1] === toChangeColor.g
                    && data[pixelStart+2] === toChangeColor.b
                ){
                    data[pixelStart] = newColorRGB.r;
                    data[pixelStart+1] = newColorRGB.g;
                    data[pixelStart+2] = newColorRGB.b;
                }else if(data[pixelStart] === newColorRGB.r
                    && data[pixelStart+1] === newColorRGB.g
                    && data[pixelStart+2] === newColorRGB.b
                ){
                    data[pixelStart] = 255;
                    data[pixelStart+1] = 255;
                    data[pixelStart+2] = 255;
                }
            }
            imageCtx.putImageData(imageData, 0, paintY);
        }
    }
}