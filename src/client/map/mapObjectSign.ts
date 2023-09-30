import { getCameraPosition } from "../game.js";
import { CelestialDirection, Game, Position } from "../gameModel.js";
import { getPointPaintPosition, paintTextWithOutline } from "../gamePaint.js";
import { GAME_IMAGES, loadImage } from "../imageLoad.js";
import { mapKeyAndTileIjToPosition } from "./map.js";
import { MAP_OBJECTS_FUNCTIONS, MapTileObject, findMapKeyForMapObject } from "./mapObjects.js";

export type MapTileObjectNextEndbossSign = MapTileObject & {
    endBossDirection: CelestialDirection,
}
export const MAP_OBJECT_END_BOSS_SIGN = "EndBossSign";
export const IMAGE_SIGN = "Sign";

GAME_IMAGES[IMAGE_SIGN] = {
    imagePath: "/images/sign.png",
    spriteRowHeights: [40],
    spriteRowWidths: [40],
};


export function addMapObjectBossSign() {
    MAP_OBJECTS_FUNCTIONS[MAP_OBJECT_END_BOSS_SIGN] = {
        paint: paintEndBossSign,
        paintInteract: paintInteractSign,
    }
}

function paintInteractSign(ctx: CanvasRenderingContext2D, mapObject: MapTileObject, game: Game) {
    const key = findMapKeyForMapObject(mapObject, game.state.map);
    if (!key) return;
    const endBossSign = mapObject as MapTileObjectNextEndbossSign;
    const map = game.state.map;
    const cameraPosition = getCameraPosition(game);
    const position = mapKeyAndTileIjToPosition(key, mapObject.i, mapObject.j, map);
    const paintPos = getPointPaintPosition(ctx, position, cameraPosition);
    const fontSize = 20;
    let texts = [
        `King of the ${endBossSign.endBossDirection}`,
        `Distance = ${map.endBossArea!.numberChunksUntil * map.chunkLength * map.tileSize}`
    ]
    paintPos.y -= texts.length * fontSize + map.tileSize / 2;

    let textMaxWidth = 0;
    ctx.font = `${fontSize}px Arial`;
    for (let text of texts) {
        const textWidth = ctx.measureText(text).width;
        if (textWidth > textMaxWidth) textMaxWidth = textWidth;
    }
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = "white";
    ctx.fillRect(paintPos.x - Math.floor(textMaxWidth / 2) - 1, paintPos.y - fontSize - 1, textMaxWidth + 2, fontSize * texts.length + 2)
    ctx.globalAlpha = 1;
    ctx.fillStyle = "black";
    for (let text of texts) {
        paintTextWithOutline(ctx, "white", "black", text, paintPos.x, paintPos.y, true);
        paintPos.y += fontSize;
    }

}

function paintEndBossSign(ctx: CanvasRenderingContext2D, mapObject: MapTileObject, paintTopLeft: Position, game: Game) {
    const endBossSign = mapObject as MapTileObjectNextEndbossSign;
    const tileSize = game.state.map.tileSize;
    const signImage = GAME_IMAGES[IMAGE_SIGN];
    loadImage(signImage);
    if (signImage.imageRef?.complete) {
        const paintX = paintTopLeft.x + mapObject.i * tileSize;
        const paintY = paintTopLeft.y + mapObject.j * tileSize;
        const spriteWidth = signImage.spriteRowWidths[0];
        const spriteHeight = signImage.spriteRowHeights[0];
        switch (endBossSign.endBossDirection) {
            case "north":
                ctx.translate(paintX + spriteWidth / 2, paintY + spriteHeight / 2);
                ctx.rotate(- Math.PI / 2);
                ctx.scale(-1, 1);
                ctx.translate(-paintX - spriteWidth / 2, -paintY - spriteHeight / 2);
                break;
            case "east":
                ctx.translate(paintX + spriteWidth / 2, paintY + spriteHeight / 2);
                ctx.scale(-1, 1);
                ctx.translate(-paintX - spriteWidth / 2, -paintY - spriteHeight / 2);
                break;
            case "south":
                ctx.translate(paintX + spriteWidth / 2, paintY + spriteHeight / 2);
                ctx.rotate(- Math.PI / 2);
                ctx.translate(-paintX - spriteWidth / 2, -paintY - spriteHeight / 2);
                break;
        }
        ctx.drawImage(
            signImage.imageRef,
            Math.floor(paintX),
            Math.floor(paintY),
            spriteWidth, spriteHeight
        );
        ctx.resetTransform();
        ctx.restore();
    }
}

