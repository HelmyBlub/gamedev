import { Character } from "../character/characterModel.js";
import { getCameraPosition } from "../game.js";
import { startBaseDefenseMode } from "../gameModeBaseDefense.js";
import { Game, Position } from "../gameModel.js";
import { getPointPaintPosition, paintTextLinesWithKeys } from "../gamePaint.js";
import { GAME_IMAGES, loadImage } from "../imageLoad.js";
import { playerInputBindingToDisplayValue } from "../input/playerInput.js";
import { findPlayerByCharacterId } from "../player.js";
import { mapKeyAndTileXYToPosition } from "./map.js";
import { findMapKeyForMapObject, MAP_OBJECTS_FUNCTIONS, MapTileObject } from "./mapObjects.js";

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
        interact1: interactStartBaseDefense,
        paintInteract: paintInteract,
    }
}

function paintFireAnimation(ctx: CanvasRenderingContext2D, mapObject: MapTileObject, paintTopLeft: Position, game: Game) {
    const tileSize = game.state.map.tileSize;
    const animationImage = GAME_IMAGES[mapObject.type];
    loadImage(animationImage);
    if (animationImage.imageRef?.complete) {
        const paintX = paintTopLeft.x + mapObject.y * tileSize;
        const paintY = paintTopLeft.y + mapObject.x * tileSize;
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

function interactStartBaseDefense(interacter: Character, mapObject: MapTileObject, game: Game) {
    startBaseDefenseMode(game);
}

function paintInteract(ctx: CanvasRenderingContext2D, mapObject: MapTileObject, interacter: Character, game: Game) {
    if (game.state.timeFirstKill != undefined) return;
    const key = findMapKeyForMapObject(mapObject, game.state.map);
    if (!key) return;
    const player = findPlayerByCharacterId(game.state.players, interacter.id);
    if (!player) return;
    const map = game.state.map;
    const cameraPosition = getCameraPosition(game);
    const topMiddlePos = mapKeyAndTileXYToPosition(key, mapObject.x, mapObject.y, map);
    topMiddlePos.y -= map.tileSize / 2;

    const texts = [];
    const interact1 = playerInputBindingToDisplayValue("interact1", game);
    if (game.UI.inputType === "touch") {
        texts.push(`Touch to start Base Defense Mode`);
    } else if (game.UI.inputType === "keyboard") {
        texts.push(`Press <${interact1}> to start Base Defense Mode`);
    }
    const paintPos = getPointPaintPosition(ctx, topMiddlePos, cameraPosition, game.UI.zoom, false);
    const rectangle = paintTextLinesWithKeys(ctx, texts, paintPos, 20, true, true);
    if (game.UI.inputType === "touch") game.UI.rectangles.interactRectangle = [{ ...rectangle, interactAction: "interact1" }];
}
