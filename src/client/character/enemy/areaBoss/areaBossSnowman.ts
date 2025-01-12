import { Ability } from "../../../ability/ability.js";
import { tickCharacterDebuffs } from "../../../debuff/debuff.js";
import { calculateDistance, getNextId } from "../../../game.js";
import { FACTION_ENEMY, Game, IdCounter, Position } from "../../../gameModel.js";
import { getPointPaintPosition } from "../../../gamePaint.js";
import { GAME_IMAGES, loadImage } from "../../../imageLoad.js";
import { changeTileIdOfMapChunk, findNearNonBlockingPosition, getMapTileId, positionToChunkXY, positionToGameMapTileXY, TILE_ID_GRASS, TILE_ID_ICE } from "../../../map/map.js";
import { findMapModifierById, removeMapModifier } from "../../../map/modifiers/mapModifier.js";
import { determineClosestCharacter, getPlayerCharacters } from "../../character.js";
import { Character, createCharacter } from "../../characterModel.js";
import { paintCharacterHpBar } from "../../characterPaint.js";
import { calculatePosToChunkTileXY } from "../../../map/map.js";
import { AREA_BOSS_FUNCTIONS, AreaBossEnemy, CHARACTER_TYPE_AREA_BOSS } from "./areaBoss.js";
import { addAbilityCurseIce, createObjectCurseIce } from "./abilityCurseIce.js";

export type AreaBossEnemySnowman = AreaBossEnemy & {
};

export const AREA_BOSS_TYPE_SNOWMAN = "Snowman";
export const IMAGE_AREA_BOSS_TYPE_SNOWMAN = "Snowman";

GAME_IMAGES[IMAGE_AREA_BOSS_TYPE_SNOWMAN] = {
    imagePath: "/images/snowman.png",
    spriteRowHeights: [40],
    spriteRowWidths: [40],
};

export function addAreaBossTypeSnowman() {
    AREA_BOSS_FUNCTIONS[AREA_BOSS_TYPE_SNOWMAN] = {
        onDeath: onDeath,
        paint: paint,
        tick: tick,
    };
    addAbilityCurseIce();
}

export function createAreaBossIceSnowman(idCounter: IdCounter, spawn: Position, mapModifierIdRef: number, game: Game): AreaBossEnemySnowman {
    const bossSize = 40;
    const color = "black";
    const dummyValue = 1;
    const nonBlockingSpawn = findNearNonBlockingPosition(spawn, game.state.map, game.state.idCounter, game);

    const baseCharacter = createCharacter(getNextId(idCounter), nonBlockingSpawn.x, nonBlockingSpawn.y, bossSize, bossSize, color, dummyValue, dummyValue, FACTION_ENEMY, CHARACTER_TYPE_AREA_BOSS, dummyValue);
    const abilities: Ability[] = [];
    baseCharacter.abilities = abilities;
    const areaBoss: AreaBossEnemySnowman = { ...baseCharacter, mapModifierIdRef: mapModifierIdRef, areaBossType: AREA_BOSS_TYPE_SNOWMAN };
    areaBoss.isUnMoveAble = true;
    areaBoss.isDamageImmune = true;
    areaBoss.isDebuffImmune = true;
    return areaBoss;
}

function onDeath(character: Character, game: Game) {
    const areaBoss = character as AreaBossEnemySnowman;
    const curse = createObjectCurseIce(areaBoss, game);
    if (curse) game.state.abilityObjects.push(curse);
    removeMapModifier(areaBoss.mapModifierIdRef, game);
    const tileRadius = 5;
    for (let i = -tileRadius; i <= tileRadius; i++) {
        for (let j = -tileRadius; j <= tileRadius; j++) {
            if (calculateDistance({ x: i, y: j }, { x: 0, y: 0 }) <= tileRadius) {
                const position = {
                    x: character.x + i * game.state.map.tileSize,
                    y: character.y + j * game.state.map.tileSize,
                };
                if (getMapTileId(position, game.state.map, game.state.idCounter, game) === TILE_ID_ICE) {
                    const chunkXY = positionToChunkXY(position, game.state.map);
                    const tileXY = calculatePosToChunkTileXY(position, game.state.map);
                    changeTileIdOfMapChunk(chunkXY.x, chunkXY.y, tileXY.x, tileXY.y, TILE_ID_GRASS, game);
                }
            }
        }
    }
}

function paint(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) {
    if (character.state === "dead") return;
    const areaBoss = character as AreaBossEnemySnowman;
    const areaBossPaintPos = getPointPaintPosition(ctx, character, cameraPosition, game.UI.zoom);
    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";

    const characterImage = GAME_IMAGES[IMAGE_AREA_BOSS_TYPE_SNOWMAN];
    loadImage(characterImage, character.paint.color, undefined);
    if (characterImage.imageRef) {
        const paintPos = getPointPaintPosition(ctx, character, cameraPosition, game.UI.zoom);
        if (paintPos.x < -character.width || paintPos.x > ctx.canvas.width / game.UI.zoom.factor
            || paintPos.y < -character.height || paintPos.y > ctx.canvas.height / game.UI.zoom.factor) return;
        const spriteWidth = characterImage.spriteRowWidths[0];
        const spriteHeight = characterImage.spriteRowHeights[0];
        ctx.drawImage(
            characterImage.imageRef,
            0,
            0,
            spriteWidth, spriteHeight,
            Math.floor(paintPos.x - character.width / 2),
            Math.floor(paintPos.y - character.height / 2),
            character.width, character.height
        );
        if (areaBoss.isDamageImmune) {
            const gradient = ctx.createConicGradient((game.state.time / 500), paintPos.x, paintPos.y);
            gradient.addColorStop(0, "black");
            gradient.addColorStop(0.5, "white");
            gradient.addColorStop(1, "black");
            ctx.beginPath();
            ctx.lineWidth = 3;
            ctx.strokeStyle = gradient;
            ctx.arc(paintPos.x, paintPos.y, 20, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            const hpBarPos = {
                x: Math.floor(areaBossPaintPos.x - character.width / 2),
                y: Math.floor(areaBossPaintPos.y - character.height / 2)
            };
            paintCharacterHpBar(ctx, character, hpBarPos);
        }
    }

}

function tick(enemy: Character, game: Game) {
    if (enemy.state === "dead") return;
    const snowman = enemy as AreaBossEnemySnowman;
    const modifier = findMapModifierById(snowman.mapModifierIdRef, game);
    if (!modifier) return;
    if (snowman.isDamageImmune) {
        const closestPlayer = determineClosestCharacter(snowman, getPlayerCharacters(game.state.players));
        if (closestPlayer.minDistanceCharacter && closestPlayer.minDistance < game.state.map.tileSize) {
            const snowmanTile = positionToGameMapTileXY(game.state.map, snowman);
            const playerTile = positionToGameMapTileXY(game.state.map, closestPlayer.minDistanceCharacter);
            if (snowmanTile.x === playerTile.x && snowmanTile.y === playerTile.y) {
                snowman.isDamageImmune = false;
            }
        }
    }
    tickCharacterDebuffs(enemy, game);
}
