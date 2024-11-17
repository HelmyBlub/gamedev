import { calculateDirection, getCameraPosition, getNextId } from "../game.js";
import { FACTION_ENEMY, FACTION_PLAYER, Game, IdCounter, Position } from "../gameModel.js";
import { getPointPaintPosition } from "../gamePaint.js";
import { moveByDirectionAndDistance } from "../map/map.js";
import { nextRandom } from "../randomNumberGenerator.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, PaintOrderAbility, detectAbilityObjectCircleToCharacterHit, AbilityObjectCircle, findAbilityById } from "./ability.js";

export type AbilityCloud = Ability & {
}

export type AbilityObjectCloud = AbilityObject & {
    cloudTiles: Position[],
    moveDirection: number,
    moveSpeed: number,
    deleteTime: number,
}

export const ABILITY_NAME_CLOUD = "Cloud";

export function addAbilityCloud() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_CLOUD] = {
        createAbility: createAbilityCircleAround,
        deleteAbilityObject: deleteAbilityObject,
        paintAbilityObject: paintAbilityObjectCircleAround,
        tickAbilityObject: tickAbilityObjectCircleAround,
    };
}

export function createAbilityObjectCloud(
    position: Position,
    faction: string,
    size: number,
    direction: number,
    game: Game
): AbilityObjectCloud {
    const cloudTiles = generateCloud(size, game);
    const object: AbilityObjectCloud = {
        type: ABILITY_NAME_CLOUD,
        cloudTiles: cloudTiles,
        deleteTime: game.state.time + 20000,
        moveDirection: direction,
        moveSpeed: 1,
        damage: 0,
        color: "red",
        faction: faction,
        x: position.x,
        y: position.y,
    };
    return object;
}

function createAbilityCircleAround(
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

function paintAbilityObjectCircleAround(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "afterCharacterPaint") return;
    const cloud = abilityObject as AbilityObjectCloud;
    const cameraPosition = getCameraPosition(game);
    const paintPos = getPointPaintPosition(ctx, cloud, cameraPosition, game.UI.zoom, true);
    const cloudTileSize = 40;

    let alphaFactor = 1;
    const fadeTime = 5000;
    if (cloud.deleteTime < game.state.time + fadeTime) {
        alphaFactor *= (cloud.deleteTime - game.state.time) / fadeTime;
    }
    ctx.globalAlpha = 0.5 * alphaFactor;
    for (let tile of cloud.cloudTiles) {
        ctx.fillStyle = "white";
        ctx.fillRect(paintPos.x + tile.x * cloudTileSize, paintPos.y + tile.y * cloudTileSize, cloudTileSize, cloudTileSize);
    }
    ctx.globalAlpha = 1;

}

function tickAbilityObjectCircleAround(abilityObject: AbilityObject, game: Game) {
    const cloud = abilityObject as AbilityObjectCloud;
    moveByDirectionAndDistance(abilityObject, cloud.moveDirection, cloud.moveSpeed, false);
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

