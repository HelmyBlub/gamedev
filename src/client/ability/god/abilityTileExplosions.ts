import { characterTakeDamage, getPlayerCharacters } from "../../character/character.js";
import { getCameraPosition, getNextId } from "../../game.js";
import { FACTION_ENEMY, Game, IdCounter, Position } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, PaintOrderAbility } from "../ability.js";


export const ABILITY_NAME_TILE_EXPLOSION = "Tile Explosion";
export type AbilityTileExplosion = Ability & {
    cooldown: number,
    cooldownFinishedTime?: number,
    spawnCount: number,
}

export type AbilityObjectTileExplosion = AbilityObject & {
    damageDelay: number,
    damageTime: number,
    growCount: number,
    size: number,
}

export function addGodAbilityTileExplosion() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_TILE_EXPLOSION] = {
        createAbility: createAbility,
        deleteAbilityObject: deleteObject,
        paintAbilityObject: paintAbilityObject,
        tickAbilityObject: tickAbilityObject,
        tickBossAI: tickBossAI,
    };
}

function createAbility(
    idCounter: IdCounter,
    playerInputBinding?: string,
): AbilityTileExplosion {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_TILE_EXPLOSION,
        cooldown: 10000,
        spawnCount: 2,
        passive: false,
        playerInputBinding: playerInputBinding,
        upgrades: {},
    };
}

function createAbilityObject(position: Position, gameTime: number): AbilityObjectTileExplosion {
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
        damage: 250,
        faction: FACTION_ENEMY,
    }
}

function paintAbilityObject(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    const tileExplosions = abilityObject as AbilityObjectTileExplosion;
    const cameraPosition = getCameraPosition(game);
    const paintPos = getPointPaintPosition(ctx, abilityObject, cameraPosition);

    if (paintOrder === "beforeCharacterPaint") {
        const fillPerCent = 1 - (tileExplosions.damageTime - game.state.time) / tileExplosions.damageDelay;
        if (tileExplosions.growCount === 0) {
            ctx.beginPath();
            ctx.fillStyle = abilityObject.color;
            ctx.strokeStyle = abilityObject.color;
            ctx.lineWidth = 1;
            ctx.rect(paintPos.x, paintPos.y, tileExplosions.size, tileExplosions.size);
            ctx.stroke();
            ctx.beginPath();
            ctx.fillRect(paintPos.x, paintPos.y, tileExplosions.size * fillPerCent, tileExplosions.size);
        } else {
            const godArea = game.state.map.godArea;
            if (!godArea || !godArea.spawnTopLeftChunk) return;
            const topLeftPos = {
                x: godArea.spawnTopLeftChunk.x * game.state.map.chunkLength * game.state.map.tileSize,
                y: godArea.spawnTopLeftChunk.y * game.state.map.chunkLength * game.state.map.tileSize,
            }
            const size = godArea.size * game.state.map.chunkLength * game.state.map.tileSize;
            for (let i = -tileExplosions.growCount; i <= tileExplosions.growCount; i++) {
                for (let j = -tileExplosions.growCount; j <= tileExplosions.growCount; j++) {
                    if (Math.abs(i) !== tileExplosions.growCount && Math.abs(j) !== tileExplosions.growCount) continue;
                    const tempTilePos = {
                        x: tileExplosions.x + i * game.state.map.tileSize,
                        y: tileExplosions.y + j * game.state.map.tileSize
                    };
                    if (tempTilePos.x < topLeftPos.x || tempTilePos.x > topLeftPos.x + size
                        || tempTilePos.y < topLeftPos.y || tempTilePos.y > topLeftPos.y + size
                    ) {
                        continue;
                    }
                    const tempPaintPos = {
                        x: paintPos.x + i * game.state.map.tileSize,
                        y: paintPos.y + j * game.state.map.tileSize
                    };
                    ctx.beginPath();
                    ctx.fillStyle = abilityObject.color;
                    ctx.strokeStyle = abilityObject.color;
                    ctx.lineWidth = 1;
                    ctx.rect(tempPaintPos.x, tempPaintPos.y, tileExplosions.size, tileExplosions.size);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.fillRect(tempPaintPos.x, tempPaintPos.y, tileExplosions.size * fillPerCent, tileExplosions.size);
                }
            }
        }
    }
}

function tickBossAI(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const tileExplosion = ability as AbilityTileExplosion;
    if (tileExplosion.cooldownFinishedTime === undefined) tileExplosion.cooldownFinishedTime = game.state.time + tileExplosion.cooldown;
    if (tileExplosion.cooldownFinishedTime < game.state.time) {
        tileExplosion.cooldownFinishedTime = game.state.time + tileExplosion.cooldown;
        const map = game.state.map;
        const godArea = map.godArea;
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
            const tileExplosionObject = createAbilityObject(spawnPosition, game.state.time);
            game.state.abilityObjects.push(tileExplosionObject);
        }
    }
}

function tickAbilityObject(abilityObject: AbilityObject, game: Game) {
    const tileExplosion = abilityObject as AbilityObjectTileExplosion;
    if (tileExplosion.damageTime <= game.state.time) {
        tileExplosion.damageTime += tileExplosion.damageDelay;
        const playerCharacters = getPlayerCharacters(game.state.players);
        const godArea = game.state.map.godArea;
        if (!godArea || !godArea.spawnTopLeftChunk) return;
        const topLeftPos = {
            x: godArea.spawnTopLeftChunk.x * game.state.map.chunkLength * game.state.map.tileSize,
            y: godArea.spawnTopLeftChunk.y * game.state.map.chunkLength * game.state.map.tileSize,
        }
        const size = godArea.size * game.state.map.chunkLength * game.state.map.tileSize;
        for (let i = -tileExplosion.growCount; i <= tileExplosion.growCount; i++) {
            for (let j = -tileExplosion.growCount; j <= tileExplosion.growCount; j++) {
                if (Math.abs(i) !== tileExplosion.growCount && Math.abs(j) !== tileExplosion.growCount) continue;
                const tempTilePos = {
                    x: tileExplosion.x + i * game.state.map.tileSize,
                    y: tileExplosion.y + j * game.state.map.tileSize
                };

                if (tempTilePos.x < topLeftPos.x || tempTilePos.x > topLeftPos.x + size
                    || tempTilePos.y < topLeftPos.y || tempTilePos.y > topLeftPos.y + size
                ) {
                    continue;
                }
                for (let char of playerCharacters) {
                    if (char.x > tempTilePos.x && char.x < tempTilePos.x + tileExplosion.size
                        && char.y > tempTilePos.y && char.y < tempTilePos.y + tileExplosion.size
                    ) {
                        characterTakeDamage(char, tileExplosion.damage, game, undefined, tileExplosion.type);
                    }
                }
            }
        }
        tileExplosion.growCount++;
    }
}

function deleteObject(abilityObject: AbilityObject, game: Game): boolean {
    const tileExplosion = abilityObject as AbilityObjectTileExplosion;
    return tileExplosion.growCount > 20;
}

