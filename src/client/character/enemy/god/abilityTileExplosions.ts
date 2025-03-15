import { characterTakeDamage, getPlayerCharacters } from "../../character.js";
import { getCameraPosition, getNextId } from "../../../game.js";
import { FACTION_ENEMY, Game, IdCounter, Position } from "../../../gameModel.js";
import { getPointPaintPosition, paintTextWithOutline } from "../../../gamePaint.js";
import { nextRandom } from "../../../randomNumberGenerator.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, PaintOrderAbility } from "../../../ability/ability.js";
import { GodAbility } from "./godAbility.js";
import { GodEnemyCharacter, applyExponentialStackingDamageTakenDebuff } from "./godEnemy.js";
import { GAME_IMAGES, loadImage } from "../../../imageLoad.js";
import { Character } from "../../characterModel.js";


export const ABILITY_NAME_TILE_EXPLOSION = "Tile Explosion";
export type AbilityTileExplosion = GodAbility & {
    cooldown: number,
    cooldownFinishedTime?: number,
    spawnCount: number,
}

export type AbilityObjectTileExplosion = AbilityObject & {
    areaIdRef: number,
    damageDelay: number,
    damageTime: number,
    growCount: number,
    size: number,
}

const IMAGE_EXPLOSION = "explosion";
GAME_IMAGES[IMAGE_EXPLOSION] = {
    imagePath: "/images/explosion.png",
    spriteRowHeights: [],
    spriteRowWidths: [],
};

export function addGodAbilityTileExplosion() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_TILE_EXPLOSION] = {
        createAbility: godCreateAbilityTileExplosion,
        deleteAbilityObject: deleteObject,
        paintAbility: paintAbility,
        paintAbilityObject: paintAbilityObject,
        setAbilityToBossLevel: setAbilityToBossLevel,
        tickAbilityObject: tickAbilityObject,
        tickAI: tickAI,
    };
}

export function godCreateAbilityTileExplosion(
    idCounter: IdCounter,
    playerInputBinding?: string,
    areaIdRef?: number,
): AbilityTileExplosion {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_TILE_EXPLOSION,
        cooldown: 10000,
        spawnCount: 2,
        pickedUp: false,
        passive: false,
        playerInputBinding: playerInputBinding,
        upgrades: {},
        level: { level: 1 },
        areaIdRef: areaIdRef,
    };
}

function createAbilityObject(areaIdRef: number, position: Position, gameTime: number): AbilityObjectTileExplosion {
    const damageDelay = 1500;
    return {
        type: ABILITY_NAME_TILE_EXPLOSION,
        x: position.x,
        y: position.y,
        size: 40,
        damageDelay: damageDelay,
        damageTime: gameTime + damageDelay,
        growCount: 0,
        color: "black",
        damage: 25,
        faction: FACTION_ENEMY,
        areaIdRef: areaIdRef,
    }
}

function setAbilityToBossLevel(ability: Ability, level: number) {
    const abilityTileEx = ability as AbilityTileExplosion;
    abilityTileEx.level.level = level;
    abilityTileEx.spawnCount = level;
}

function paintAbility(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    const abiltiyTileExplosion = ability as AbilityTileExplosion;
    const position: Position = !abiltiyTileExplosion.pickedUp && abiltiyTileExplosion.pickUpPosition ? abiltiyTileExplosion.pickUpPosition : abilityOwner;
    const paintPos = getPointPaintPosition(ctx, position, cameraPosition, game.UI.zoom);
    if (abiltiyTileExplosion.pickedUp) {
        paintPos.x += 25;
        paintPos.y += 45;
    }
    const eyeImageRef = GAME_IMAGES[IMAGE_EXPLOSION];
    loadImage(eyeImageRef);
    const god = abilityOwner as GodEnemyCharacter;
    const sizeFactor = abiltiyTileExplosion.pickedUp ? 0.4 : 0.5 + abiltiyTileExplosion.level.level * 0.1;
    if (eyeImageRef.imageRef?.complete) {
        const explosionImage: HTMLImageElement = eyeImageRef.imageRef;
        ctx.drawImage(
            explosionImage,
            0,
            0,
            explosionImage.width,
            explosionImage.height,
            Math.floor(paintPos.x - explosionImage.width / 2),
            Math.floor(paintPos.y - explosionImage.height / 2),
            Math.floor(explosionImage.width * sizeFactor),
            Math.floor(explosionImage.height * sizeFactor)
        )
    }
    if (!abiltiyTileExplosion.pickedUp) {
        ctx.font = "bold 16px Arial";
        paintTextWithOutline(ctx, "white", "black", `Lvl ${abiltiyTileExplosion.level.level}`, paintPos.x, paintPos.y + 25, true, 2);
    }
}

function paintAbilityObject(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    const tileExplosions = abilityObject as AbilityObjectTileExplosion;
    const cameraPosition = getCameraPosition(game);
    const paintPos = getPointPaintPosition(ctx, abilityObject, cameraPosition, game.UI.zoom);

    if (paintOrder === "beforeCharacterPaint") {
        const fillPerCent = 1 - (tileExplosions.damageTime - game.state.time) / tileExplosions.damageDelay;
        if (tileExplosions.growCount === 0) {
            paintExplosionSquare(ctx, paintPos, tileExplosions.size, fillPerCent, abilityObject.color);
        } else {
            const godArea = game.state.map.areaSpawnOnDistance.find(a => a.id === tileExplosions.areaIdRef);
            if (!godArea || !godArea.spawnTopLeftChunk) return;
            const topLeftPos = {
                x: godArea.spawnTopLeftChunk.x * game.state.map.chunkLength * game.state.map.tileSize,
                y: godArea.spawnTopLeftChunk.y * game.state.map.chunkLength * game.state.map.tileSize,
            }
            const size = godArea.size * game.state.map.chunkLength * game.state.map.tileSize;
            //top, bottom row
            for (let i = -tileExplosions.growCount; i <= tileExplosions.growCount; i++) {
                const tempTilePosX = tileExplosions.x + i * game.state.map.tileSize;
                if (tempTilePosX < topLeftPos.x || tempTilePosX > topLeftPos.x + size) {
                    continue;
                }
                for (let j = -tileExplosions.growCount; j <= tileExplosions.growCount; j += tileExplosions.growCount * 2) {
                    const tempTilePosY = tileExplosions.y + j * game.state.map.tileSize;
                    if (tempTilePosY < topLeftPos.y || tempTilePosY > topLeftPos.y + size) {
                        continue;
                    }
                    const tempPaintPos = {
                        x: paintPos.x + i * game.state.map.tileSize,
                        y: paintPos.y + j * game.state.map.tileSize
                    };
                    paintExplosionSquare(ctx, tempPaintPos, tileExplosions.size, fillPerCent, abilityObject.color);
                }
            }
            //left, right columns
            for (let j = -tileExplosions.growCount + 1; j <= tileExplosions.growCount - 1; j++) {
                const tempTilePosY = tileExplosions.y + j * game.state.map.tileSize;
                if (tempTilePosY < topLeftPos.y || tempTilePosY > topLeftPos.y + size) {
                    continue;
                }
                for (let i = -tileExplosions.growCount; i <= tileExplosions.growCount; i += tileExplosions.growCount * 2) {
                    const tempTilePosX = tileExplosions.x + i * game.state.map.tileSize;
                    if (tempTilePosX < topLeftPos.x || tempTilePosX > topLeftPos.x + size) {
                        continue;
                    }
                    const tempPaintPos = {
                        x: paintPos.x + i * game.state.map.tileSize,
                        y: paintPos.y + j * game.state.map.tileSize
                    };
                    paintExplosionSquare(ctx, tempPaintPos, tileExplosions.size, fillPerCent, abilityObject.color);
                }
            }
        }
    }
}

function paintExplosionSquare(ctx: CanvasRenderingContext2D, paintPos: Position, size: number, fillPerCent: number, color: string) {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.rect(paintPos.x, paintPos.y, size, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.fillRect(paintPos.x, paintPos.y, size * fillPerCent, size);
}

function tickAI(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const tileExplosion = ability as AbilityTileExplosion;
    if (!tileExplosion.pickedUp) return;
    if (tileExplosion.cooldownFinishedTime === undefined) tileExplosion.cooldownFinishedTime = game.state.time;
    if (tileExplosion.cooldownFinishedTime < game.state.time) {
        tileExplosion.cooldownFinishedTime = game.state.time + tileExplosion.cooldown;
        const map = game.state.map;
        const godArea = map.areaSpawnOnDistance.find(a => a.id === tileExplosion.areaIdRef);
        if (!godArea || godArea.spawnTopLeftChunk === undefined) return;
        for (let i = 0; i < tileExplosion.spawnCount; i++) {
            const spawnTile = {
                x: godArea.spawnTopLeftChunk.x * map.chunkLength + 1,
                y: godArea.spawnTopLeftChunk.y * map.chunkLength + 1,
            }
            const tileCount = godArea.size * map.chunkLength - 2;
            spawnTile.x += Math.floor(tileCount * nextRandom(game.state.randomSeed));
            spawnTile.y += Math.floor(tileCount * nextRandom(game.state.randomSeed));
            const spawnPosition = {
                x: spawnTile.x * map.tileSize,
                y: spawnTile.y * map.tileSize,
            }
            const tileExplosionObject = createAbilityObject(godArea.id, spawnPosition, game.state.time);
            game.state.abilityObjects.push(tileExplosionObject);
        }
    }
}

function tickAbilityObject(abilityObject: AbilityObject, game: Game) {
    const tileExplosions = abilityObject as AbilityObjectTileExplosion;
    if (tileExplosions.damageTime <= game.state.time) {
        tileExplosions.damageTime += tileExplosions.damageDelay;
        const playerCharacters = getPlayerCharacters(game.state.players);
        const godArea = game.state.map.areaSpawnOnDistance.find(a => a.id === tileExplosions.areaIdRef);
        if (!godArea || !godArea.spawnTopLeftChunk) return;
        const topLeftPos = {
            x: godArea.spawnTopLeftChunk.x * game.state.map.chunkLength * game.state.map.tileSize,
            y: godArea.spawnTopLeftChunk.y * game.state.map.chunkLength * game.state.map.tileSize,
        }
        const size = godArea.size * game.state.map.chunkLength * game.state.map.tileSize;
        //top, bottom row
        if (tileExplosions.growCount <= 0) {
            checkExplosionSquareCharacterHit(playerCharacters, tileExplosions.x, tileExplosions.y, tileExplosions, game);
        } else {
            for (let i = -tileExplosions.growCount; i <= tileExplosions.growCount; i++) {
                const tempTilePosX = tileExplosions.x + i * game.state.map.tileSize;
                if (tempTilePosX < topLeftPos.x || tempTilePosX > topLeftPos.x + size) {
                    continue;
                }
                for (let j = -tileExplosions.growCount; j <= tileExplosions.growCount; j += tileExplosions.growCount * 2) {
                    const tempTilePosY = tileExplosions.y + j * game.state.map.tileSize;
                    if (tempTilePosY < topLeftPos.y || tempTilePosY > topLeftPos.y + size) {
                        continue;
                    }
                    checkExplosionSquareCharacterHit(playerCharacters, tempTilePosX, tempTilePosY, tileExplosions, game);
                }
            }
            //left, right columns
            for (let j = -tileExplosions.growCount + 1; j <= tileExplosions.growCount - 1; j++) {
                const tempTilePosY = tileExplosions.y + j * game.state.map.tileSize;
                if (tempTilePosY < topLeftPos.y || tempTilePosY > topLeftPos.y + size) {
                    continue;
                }
                for (let i = -tileExplosions.growCount; i <= tileExplosions.growCount; i += tileExplosions.growCount * 2) {
                    const tempTilePosX = tileExplosions.x + i * game.state.map.tileSize;
                    if (tempTilePosX < topLeftPos.x || tempTilePosX > topLeftPos.x + size) {
                        continue;
                    }
                    checkExplosionSquareCharacterHit(playerCharacters, tempTilePosX, tempTilePosY, tileExplosions, game);
                }
            }
        }
        tileExplosions.growCount++;
    }
}

function checkExplosionSquareCharacterHit(playerCharacters: Character[], tempTilePosX: number, tempTilePosY: number, tileExplosions: AbilityObjectTileExplosion, game: Game) {
    for (let char of playerCharacters) {
        if (char.x > tempTilePosX && char.x < tempTilePosX + tileExplosions.size
            && char.y > tempTilePosY && char.y < tempTilePosY + tileExplosions.size
        ) {
            characterTakeDamage(char, tileExplosions.damage, game, undefined, tileExplosions.type);
            applyExponentialStackingDamageTakenDebuff(char, game);
        }
    }
}

function deleteObject(abilityObject: AbilityObject, game: Game): boolean {
    const tileExplosion = abilityObject as AbilityObjectTileExplosion;
    return tileExplosion.growCount > 20;
}

