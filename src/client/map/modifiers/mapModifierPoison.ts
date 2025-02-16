import { calculateDistance, getNextId } from "../../game.js";
import { Game, IdCounter, Position } from "../../gameModel.js";
import { MODIFY_SHAPE_NAME_CIRCLE } from "./mapShapeCircle.js";
import { GAME_MAP_MODIFIER_FUNCTIONS, GameMapModifier } from "./mapModifier.js";
import { GameMapArea, getShapeMiddle } from "./mapModifierShapes.js";
import { GameMapAreaRect, MODIFY_SHAPE_NAME_RECTANGLE } from "./mapShapeRectangle.js";
import { MODIFY_SHAPE_NAME_CELESTIAL_DIRECTION } from "./mapShapeCelestialDirection.js";
import { MapChunk, mapChunkXYAndTileXYToPosition, TILE_ID_GRASS } from "../map.js";
import { createAbilityPoisonTile } from "../../ability/abilityPoisonTile.js";
import { createBuffPoisonTileImmunity } from "../../debuff/buffImmunityPoisonTile.js";
import { applyDebuff } from "../../debuff/debuff.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { createAreaBossPoisonPlant } from "../../character/enemy/areaBoss/areaBossPoisonPlant.js";

export const MODIFIER_NAME_POISON = "Poison";
export type MapModifierPoison = GameMapModifier & {
}

export function addMapModifierPoison() {
    GAME_MAP_MODIFIER_FUNCTIONS[MODIFIER_NAME_POISON] = {
        create: create,
        onGameInit: onGameInit,
        onChunkCreateModify: onChunkCreateModify,
    };
}

export function create(
    area: GameMapArea,
    idCounter: IdCounter,
): MapModifierPoison {
    return {
        id: getNextId(idCounter),
        type: MODIFIER_NAME_POISON,
        area: area,
        areaPerLevel: 1000000,
        level: 1,
    };
}

function onGameInit(modifier: GameMapModifier, game: Game) {
    let spawn: Position | undefined = undefined;

    if (modifier.area.type === MODIFY_SHAPE_NAME_RECTANGLE || modifier.area.type === MODIFY_SHAPE_NAME_CIRCLE) {
        const area = modifier.area as GameMapAreaRect;
        if (game.state.activeCheats && game.state.activeCheats.indexOf("closeCurses") !== -1) {
            area.x = -1500;
            area.y = 1500;
        }
    }
    if (modifier.area.type === MODIFY_SHAPE_NAME_CELESTIAL_DIRECTION) {
        return;
    }
    spawn = getShapeMiddle(modifier.area, game);
    if (spawn === undefined) return;
    const areaBoss = createAreaBossPoisonPlant(game.state.idCounter, spawn, modifier.id, game);
    game.state.bossStuff.bosses.push(areaBoss);
}

function onChunkCreateModify(modifier: GameMapModifier, mapChunk: MapChunk, chunkX: number, chunkY: number, game: Game) {
    const middle = getShapeMiddle(modifier.area, game);
    const chunkPos = mapChunkXYAndTileXYToPosition(chunkX, chunkY, 3, 3, game.state.map);
    if (!middle) {
        console.log("does this happen?");
        return;
    }
    const distance = calculateDistance(middle, chunkPos);
    onChunkCreateAddAbilityToEnemies(mapChunk, distance, game);
    onChunkCreateRemoveBlockingTilesAroundAreaBoss(mapChunk, middle, chunkX, chunkY, game);
}

function onChunkCreateRemoveBlockingTilesAroundAreaBoss(mapChunk: MapChunk, middle: Position, chunkX: number, chunkY: number, game: Game) {
    let closeToAreaBoss = false;
    for (let x = 0; x < mapChunk.tiles.length; x++) {
        const tileX = mapChunk.tiles[x];
        for (let y = 0; y < tileX.length; y++) {
            const chunkPos = mapChunkXYAndTileXYToPosition(chunkX, chunkY, x, y, game.state.map);
            const distance = calculateDistance(middle, chunkPos);
            if (distance < 500) {
                tileX[y] = TILE_ID_GRASS;
                closeToAreaBoss = true;
            }
        }
    }
    if (closeToAreaBoss) mapChunk.characters = [];
}

function onChunkCreateAddAbilityToEnemies(mapChunk: MapChunk, distance: number, game: Game) {
    const distanceProbabilityFactor = 0.05 + Math.exp(-distance / 1000) * 0.95;
    let giveAbilityProbability = distanceProbabilityFactor;
    if (mapChunk.characters.length > 30) {
        giveAbilityProbability *= 0.2;
    } else if (mapChunk.characters.length > 4) {
        giveAbilityProbability *= 0.4;
    }
    for (let enemy of mapChunk.characters) {
        if (giveAbilityProbability === 1 || nextRandom(game.state.randomSeed) < giveAbilityProbability) {
            const poison = createAbilityPoisonTile(game.state.idCounter);
            enemy.abilities.push(poison);
            const poisonImmunity = createBuffPoisonTileImmunity();
            applyDebuff(poisonImmunity, enemy, game);
        }
    }
}