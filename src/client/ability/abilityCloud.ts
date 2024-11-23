import { getCameraPosition, getNextId } from "../game.js";
import { Game, IdCounter, Position } from "../gameModel.js";
import { getPointPaintPosition } from "../gamePaint.js";
import { moveByDirectionAndDistance } from "../map/map.js";
import { nextRandom } from "../randomNumberGenerator.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, PaintOrderAbility } from "./ability.js";
import { createAbilityObjectExplode } from "./abilityExplode.js";

export type AbilityCloud = Ability & {
}

export type AbilityObjectCloud = AbilityObject & {
    cloudTiles: Position[],
    moveDirection: number,
    moveSpeed: number,
    deleteTime: number,
    strikeInterval: number,
    lastStrikeTime?: number,
    currentTileSize: number,
    cloudTileSize: number,
    explosionRadius: number,
}

export const ABILITY_NAME_CLOUD = "Cloud";

export function addAbilityCloud() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_CLOUD] = {
        createAbility: createAbilityCloud,
        deleteAbilityObject: deleteAbilityObject,
        paintAbilityObject: paintAbilityObjectCloud,
        tickAbilityObject: tickAbilityObjectCloud,
    };
}

export function createAbilityObjectCloud(
    position: Position,
    faction: string,
    direction: number,
    strength: number,
    game: Game
): AbilityObjectCloud {
    const cloudTiles = generateCloud(7 + strength * 3, game);
    const object: AbilityObjectCloud = {
        type: ABILITY_NAME_CLOUD,
        cloudTiles: cloudTiles,
        deleteTime: game.state.time + 30000,
        moveDirection: direction,
        moveSpeed: 1.5,
        damage: 10 * strength,
        color: "white",
        faction: faction,
        x: position.x,
        y: position.y,
        strikeInterval: 500 + 4000 / strength,
        currentTileSize: 10,
        cloudTileSize: 40,
        explosionRadius: 15 + strength * 2,
    };
    return object;
}

function createAbilityCloud(
    idCounter: IdCounter,
    playerInputBinding?: string,
): AbilityCloud {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_CLOUD,
        passive: true,
        upgrades: {},
    };
}

function deleteAbilityObject(abilityObject: AbilityObject, game: Game): boolean {
    const cloud = abilityObject as AbilityObjectCloud;
    return game.state.time > cloud.deleteTime;
}

function paintAbilityObjectCloud(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "afterCharacterPaint") return;
    const cloud = abilityObject as AbilityObjectCloud;
    const cameraPosition = getCameraPosition(game);
    const paintPos = getPointPaintPosition(ctx, cloud, cameraPosition, game.UI.zoom, true);

    let alphaFactor = 1;
    const fadeTime = 5000;
    if (cloud.deleteTime < game.state.time + fadeTime) {
        alphaFactor *= (cloud.deleteTime - game.state.time) / fadeTime;
    }
    ctx.globalAlpha = 0.5 * alphaFactor;
    for (let tile of cloud.cloudTiles) {
        ctx.fillStyle = "white";
        ctx.fillRect(paintPos.x + tile.x * cloud.currentTileSize, paintPos.y + tile.y * cloud.currentTileSize, cloud.currentTileSize, cloud.currentTileSize);
    }
    ctx.globalAlpha = 1;

}

function tickAbilityObjectCloud(abilityObject: AbilityObject, game: Game) {
    const cloud = abilityObject as AbilityObjectCloud;
    moveByDirectionAndDistance(abilityObject, cloud.moveDirection, cloud.moveSpeed, false);
    if (cloud.currentTileSize < cloud.cloudTileSize) {
        cloud.currentTileSize += 0.25;
        if (cloud.currentTileSize > cloud.cloudTileSize) cloud.currentTileSize = cloud.cloudTileSize;
    } else {
        if (cloud.lastStrikeTime === undefined) cloud.lastStrikeTime = game.state.time;
        if (cloud.lastStrikeTime < game.state.time) {
            cloud.lastStrikeTime = game.state.time + cloud.strikeInterval;
            const strikeDelay = 2000;
            const randomCloudTileIndex = Math.floor(nextRandom(game.state.randomSeed) * cloud.cloudTiles.length);
            const randomPos: Position = {
                x: cloud.cloudTiles[randomCloudTileIndex].x * cloud.cloudTileSize + cloud.x + cloud.cloudTileSize / 2,
                y: cloud.cloudTiles[randomCloudTileIndex].y * cloud.cloudTileSize + cloud.y + cloud.cloudTileSize / 2,
            };
            const strikeObject = createAbilityObjectExplode(randomPos, cloud.damage, cloud.explosionRadius, abilityObject.faction, abilityObject.abilityIdRef, strikeDelay, game);
            game.state.abilityObjects.push(strikeObject);
        }
    }
}

function generateCloud(size: number, game: Game): Position[] {
    const cloudTiles: Position[] = [];
    cloudTiles.push({ x: 0, y: 0 });
    while (cloudTiles.length < size) {
        const randomTileIndex = Math.floor(nextRandom(game.state.randomSeed) * cloudTiles.length);
        const randomTile = cloudTiles[randomTileIndex];
        let sideOptions = [
            { x: randomTile.x - 1, y: randomTile.y },
            { x: randomTile.x + 1, y: randomTile.y },
            { x: randomTile.x, y: randomTile.y - 1 },
            { x: randomTile.x, y: randomTile.y + 1 },
        ]
        for (let tile of cloudTiles) {
            for (let i = sideOptions.length - 1; i >= 0; i--) {
                if (tile.x === sideOptions[i].x && tile.y === sideOptions[i].y) sideOptions.splice(i, 1);
            }
        }
        if (sideOptions.length > 0) {
            const randomSideIndex = Math.floor(nextRandom(game.state.randomSeed) * sideOptions.length);
            cloudTiles.push(sideOptions[randomSideIndex]);
        }
    }
    return cloudTiles;
}

