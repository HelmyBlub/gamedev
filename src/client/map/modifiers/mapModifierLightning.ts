import { calculateDirection, calculateDistance, getNextId } from "../../game.js";
import { FACTION_ENEMY, Game, IdCounter, Position } from "../../gameModel.js";
import { moveByDirectionAndDistance } from "../map.js";
import { MODIFY_SHAPE_NAME_CIRCLE } from "./mapShapeCircle.js";
import { GAME_MAP_MODIFIER_FUNCTIONS, GameMapModifier } from "./mapModifier.js";
import { GameMapArea, getShapeMiddle, isPositionInsideShape } from "./mapModifierShapes.js";
import { GameMapAreaRect, MODIFY_SHAPE_NAME_RECTANGLE } from "./mapShapeRectangle.js";
import { createAbilityObjectCloud } from "../../ability/abilityCloud.js";
import { getPlayerCharacters } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { createAreaBossLighntingCloudMachine } from "../../character/enemy/areaBoss/areaBossCloudMachine.js";
import { MODIFY_SHAPE_NAME_CELESTIAL_DIRECTION } from "./mapShapeCelestialDirection.js";

export const MODIFIER_NAME_LIGHTNING = "Lightning";
export type MapModifierLightning = GameMapModifier & {
    spawnInterval: number,
    nextSpawnTimeCheck?: number,
    centerRadius: number,
}

export function addMapModifierLightning() {
    GAME_MAP_MODIFIER_FUNCTIONS[MODIFIER_NAME_LIGHTNING] = {
        create: create,
        onGameInit: onGameInit,
        tick: tick,
    };
}

export function create(
    area: GameMapArea,
    idCounter: IdCounter,
): MapModifierLightning {
    return {
        id: getNextId(idCounter),
        type: MODIFIER_NAME_LIGHTNING,
        area: area,
        areaPerLevel: 2000000,
        spawnInterval: 3000,
        centerRadius: 800,
        level: 1,
    };
}

function tick(modifier: GameMapModifier, game: Game) {
    const lightning = modifier as MapModifierLightning;
    if (lightning.nextSpawnTimeCheck === undefined) lightning.nextSpawnTimeCheck = 0;

    if (game.state.time >= lightning.nextSpawnTimeCheck) {
        lightning.nextSpawnTimeCheck = game.state.time + lightning.spawnInterval;
        let playerInside: Character | undefined = undefined;
        for (let playerChar of getPlayerCharacters(game.state.players)) {
            if (isPositionInsideShape(modifier.area, playerChar, game)) {
                playerInside = playerChar;
                break;
            }
        }
        if (playerInside) {
            const middle = getShapeMiddle(modifier.area, game);
            if (middle) {
                const cloudSpawn = getCloudSpawnPosition(playerInside, middle, lightning.centerRadius, game);
                const direction = calculateDirection(middle, cloudSpawn);
                const strength = Math.min(Math.max(10000 / calculateDistance(middle, cloudSpawn), 1), 10);
                game.state.abilityObjects.push(createAbilityObjectCloud(cloudSpawn, FACTION_ENEMY, direction, strength, game));
            }
        }
    }
}

function getCloudSpawnPosition(playerPosition: Position, middle: Position, radius: number, game: Game): Position {
    const distanceFromPlayer = 1500;
    let position = { x: playerPosition.x, y: playerPosition.y };
    const distance = calculateDistance(position, middle);
    if (distance < radius * 2) {
        position = { x: middle.x, y: middle.y };
        let direction = calculateDirection(middle, playerPosition);
        direction += nextRandom(game.state.randomSeed) - 0.5;
        moveByDirectionAndDistance(position, direction, radius, false);
    } else {
        let direction = calculateDirection(position, middle);
        direction += nextRandom(game.state.randomSeed) - 0.5;
        moveByDirectionAndDistance(position, direction, distanceFromPlayer, false);
    }
    return position;
}

function onGameInit(modifier: GameMapModifier, game: Game) {
    let spawn: Position | undefined = undefined;

    if (modifier.area.type === MODIFY_SHAPE_NAME_RECTANGLE || modifier.area.type === MODIFY_SHAPE_NAME_CIRCLE) {
        const area = modifier.area as GameMapAreaRect;
        if (game.state.activeCheats && game.state.activeCheats.indexOf("closeCurses") !== -1) {
            area.x = 1500;
            area.y = -1500;
        }
    }
    const lightning = modifier as MapModifierLightning;
    lightning.nextSpawnTimeCheck = undefined;
    if (lightning.area.type === MODIFY_SHAPE_NAME_CELESTIAL_DIRECTION) {
        return;
    }
    spawn = getShapeMiddle(modifier.area, game);
    if (spawn === undefined) return;
    const areaBoss = createAreaBossLighntingCloudMachine(game.state.idCounter, spawn, modifier.id, game);
    game.state.bossStuff.bosses.push(areaBoss);
}
