import { Game, Position } from "../gameModel.js";
import { GAME_IMAGES, loadImage } from "../imageLoad.js";
import { MAP_OBJECTS_FUNCTIONS, MapTileObject } from "./mapObjects.js";

export const IMAGE_FIRE_ANIMATION = "FireAnimation";
export const MAP_OBJECT_FIRE_ANIMATION = IMAGE_FIRE_ANIMATION;

GAME_IMAGES[IMAGE_FIRE_ANIMATION] = {
    imagePath: "/images/firepitFireAnimation.png",
    spriteRowHeights: [40],
    spriteRowWidths: [40],
};

export function addMapObjectFireAnimation() {
    MAP_OBJECTS_FUNCTIONS[MAP_OBJECT_FIRE_ANIMATION] = {
        paint: paintFireAnimation,
    }
}

function paintFireAnimation(ctx: CanvasRenderingContext2D, mapObject: MapTileObject, paintTopLeft: Position, game: Game) {
    const tileSize = game.state.map.tileSize;
    const animationImage = GAME_IMAGES[mapObject.name];
    loadImage(animationImage);
    if (animationImage.imageRef?.complete) {
        const paintX = paintTopLeft.x + mapObject.j * tileSize;
        const paintY = paintTopLeft.y + mapObject.i * tileSize;
        const spriteAnimation = Math.floor(game.state.time / 150) % 2;
        const spriteWidth = animationImage.spriteRowWidths[0];
        const spriteHeight = animationImage.spriteRowHeights[0];
        ctx.drawImage(
            animationImage.imageRef,
            0 + spriteAnimation * spriteWidth,
            0,
            spriteWidth, spriteHeight,
            Math.floor(paintX),
            Math.floor(paintY),
            spriteWidth, spriteHeight
        );
    }
}
