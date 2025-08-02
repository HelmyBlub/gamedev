import { ABILITY_NAME_TOWER, AbilityTower } from "../ability/abilityTower.js";
import { resetCharacter } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { paintCharacters } from "../character/characterPaint.js";
import { CHARACTER_TYPE_KING_ENEMY, kingCreateMoreInfos, modifyCharacterToKing } from "../character/enemy/kingEnemy.js";
import { deepCopy, getCameraPosition } from "../game.js";
import { CelestialDirection, Game, Position } from "../gameModel.js";
import { getPointPaintPosition, paintTextLinesWithKeys } from "../gamePaint.js";
import { GAME_IMAGES, loadImage } from "../imageLoad.js";
import { playerInputBindingToDisplayValue } from "../input/playerInput.js";
import { MoreInfosPartContainer } from "../moreInfo.js";
import { mapKeyAndTileXYToPosition } from "./map.js";
import { MAP_OBJECTS_FUNCTIONS, MapTileObject, findMapKeyForMapObject } from "./mapObjects.js";

export type MapTileObjectNextKingSign = MapTileObject & {
    kingDirection: CelestialDirection,
}
export const MAP_OBJECT_KING_SIGN = "KingSign";
export const IMAGE_SIGN = "Sign";

GAME_IMAGES[IMAGE_SIGN] = {
    imagePath: "/images/sign.png",
    spriteRowHeights: [40],
    spriteRowWidths: [40],
};


export function addMapObjectKingSign() {
    MAP_OBJECTS_FUNCTIONS[MAP_OBJECT_KING_SIGN] = {
        createMoreInfos: createMoreInfosKingSign,
        paint: paintKingSign,
        paintInteract: paintInteractSign,
    }
}

function paintInteractSign(ctx: CanvasRenderingContext2D, mapObject: MapTileObject, interacter: Character, game: Game) {
    const key = findMapKeyForMapObject(mapObject, game.state.map);
    if (!key) return;
    const kingSign = mapObject as MapTileObjectNextKingSign;
    const map = game.state.map;
    const cameraPosition = getCameraPosition(game);
    const signMiddlePosition = mapKeyAndTileXYToPosition(key, mapObject.x, mapObject.y, map);
    const signTopMiddlePosition = { x: signMiddlePosition.x, y: signMiddlePosition.y - map.tileSize / 2 };
    const fontSize = 20;
    const infoKey = playerInputBindingToDisplayValue("More Info", game);
    const texts = [
        `King of the ${kingSign.kingDirection}`,
        `Distance = ${map.kingArea!.numberChunksUntil * map.chunkLength * map.tileSize}`,
    ]
    if (game.UI.inputType === "keyboard") {
        texts.push(`Press <${infoKey}> for more info.`);
    }
    const paintPos = getPointPaintPosition(ctx, signTopMiddlePosition, cameraPosition, game.UI.zoom, false);
    const king = game.state.bossStuff.nextKings[kingSign.kingDirection];
    let textMaxWidth = king!.width;
    const rectHeight = fontSize * texts.length + 2 + king!.height + 60;
    paintPos.y -= rectHeight;

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
    paintTextLinesWithKeys(ctx, texts, paintPos);

    const paintPosSignZoomed = getPointPaintPosition(ctx, signTopMiddlePosition, cameraPosition, game.UI.zoom);
    paintPosSignZoomed.y -= (king!.height + 60) / 2 / game.UI.zoom.factor;
    const kingPositionToFitForPaint: Position = {
        x: signTopMiddlePosition.x - (paintPos.x) / game.UI.zoom.factor + paintPosSignZoomed.x * game.UI.zoom.factor,
        y: signTopMiddlePosition.y - (paintPos.y + rectHeight) / game.UI.zoom.factor + paintPosSignZoomed.y * game.UI.zoom.factor,
    }

    if (king) {
        const kingCopy: Character = deepCopy(king);
        modifyCharacterToKing(kingCopy, game);
        kingCopy.x = kingPositionToFitForPaint.x;
        kingCopy.y = kingPositionToFitForPaint.y;
        kingCopy.moveDirection = Math.PI / 2;
        kingCopy.type = CHARACTER_TYPE_KING_ENEMY;
        resetCharacter(kingCopy, game);
        kingPositionToFitForPaint.y += 20;
        if (kingCopy.pets) {
            let offsetX = -kingCopy.pets.length * 10;
            for (let pet of kingCopy.pets) {
                pet.x = kingPositionToFitForPaint.x + offsetX;
                pet.y = kingPositionToFitForPaint.y;
                offsetX += 20;
            }
        }
        for (let ability of kingCopy.abilities) {
            if (ability.name === ABILITY_NAME_TOWER) {
                const tower = ability as AbilityTower;
                if (tower.abilityObjectsAttached) {
                    tower.abilityObjectsAttached = undefined;
                }
            }
        }
        paintCharacters(ctx, [kingCopy], cameraPosition, game);
    }
}

function createMoreInfosKingSign(mapObject: MapTileObject, game: Game): MoreInfosPartContainer | undefined {
    const kingSign = mapObject as MapTileObjectNextKingSign;
    return kingCreateMoreInfos(game, kingSign.kingDirection, mapObject.type);
}

function paintKingSign(ctx: CanvasRenderingContext2D, mapObject: MapTileObject, paintTopLeft: Position, game: Game) {
    const kingSign = mapObject as MapTileObjectNextKingSign;
    const tileSize = game.state.map.tileSize;
    const signImage = GAME_IMAGES[IMAGE_SIGN];
    loadImage(signImage);
    if (signImage.imageRef?.complete) {
        const paintX = paintTopLeft.x + mapObject.x * tileSize;
        const paintY = paintTopLeft.y + mapObject.y * tileSize;
        const spriteWidth = signImage.spriteRowWidths[0];
        const spriteHeight = signImage.spriteRowHeights[0];
        ctx.save();
        switch (kingSign.kingDirection) {
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
        ctx.restore();
    }
}

