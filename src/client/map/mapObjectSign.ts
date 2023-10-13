import { resetCharacter } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { paintCharacters } from "../character/characterPaint.js";
import { CHARACTER_TYPE_END_BOSS_ENEMY } from "../character/enemy/endBossEnemy.js";
import { deepCopy, getCameraPosition } from "../game.js";
import { CelestialDirection, Game, Position } from "../gameModel.js";
import { getPointPaintPosition, paintTextWithOutline } from "../gamePaint.js";
import { GAME_IMAGES, loadImage } from "../imageLoad.js";
import { mapKeyAndTileXYToPosition } from "./map.js";
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
    const topMiddlePos = mapKeyAndTileXYToPosition(key, mapObject.x, mapObject.y, map);
    const fontSize = 20;
    const texts = [
        `King of the ${endBossSign.endBossDirection}`,
        `Distance = ${map.endBossArea!.numberChunksUntil * map.chunkLength * map.tileSize}`
    ]
    const endBoss = game.state.bossStuff.nextEndbosses[endBossSign.endBossDirection];
    let textMaxWidth = endBoss!.width;
    const rectHeight = fontSize * texts.length + 2 + endBoss!.height + 60;
    topMiddlePos.y -= rectHeight + map.tileSize / 2;
    const paintPos = getPointPaintPosition(ctx, topMiddlePos, cameraPosition);

    ctx.font = `${fontSize}px Arial`;
    for (let text of texts) {
        const textWidth = ctx.measureText(text).width;
        if (textWidth > textMaxWidth) textMaxWidth = textWidth;
    }
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = "white";
    ctx.fillRect(paintPos.x - Math.floor(textMaxWidth / 2) - 1, paintPos.y - 1, textMaxWidth + 2, rectHeight)
    ctx.globalAlpha = 1;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "black";
    for (let text of texts) {
        paintPos.y += fontSize;
        topMiddlePos.y += fontSize;
        paintTextWithOutline(ctx, "white", "black", text, paintPos.x, paintPos.y, true);
    }

    if (endBoss) {
        const endBossCopy: Character = deepCopy(endBoss);
        topMiddlePos.y += endBoss!.height / 2 + 20;
        endBossCopy.x = topMiddlePos.x;
        endBossCopy.y = topMiddlePos.y;
        endBossCopy.moveDirection = Math.PI / 2;
        endBossCopy.type = CHARACTER_TYPE_END_BOSS_ENEMY;
        resetCharacter(endBossCopy);
        topMiddlePos.y += 20;
        if (endBossCopy.pets) {
            let offsetX = -endBossCopy.pets.length * 10;
            for (let pet of endBossCopy.pets) {
                pet.x = topMiddlePos.x + offsetX;
                pet.y = topMiddlePos.y;
                offsetX += 20;
            }
        }
        paintCharacters(ctx, [endBossCopy], cameraPosition, game);
    }
}

function paintEndBossSign(ctx: CanvasRenderingContext2D, mapObject: MapTileObject, paintTopLeft: Position, game: Game) {
    const endBossSign = mapObject as MapTileObjectNextEndbossSign;
    const tileSize = game.state.map.tileSize;
    const signImage = GAME_IMAGES[IMAGE_SIGN];
    loadImage(signImage);
    if (signImage.imageRef?.complete) {
        const paintX = paintTopLeft.x + mapObject.x * tileSize;
        const paintY = paintTopLeft.y + mapObject.y * tileSize;
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

