import { getNextId } from "../../game.js";
import { Game, IdCounter, Position } from "../../gameModel.js";
import { MODIFY_SHAPE_NAME_CIRCLE } from "./mapShapeCircle.js";
import { GAME_MAP_MODIFIER_FUNCTIONS, GameMapModifier } from "./mapModifier.js";
import { GameMapArea, getShapeMiddle } from "./mapModifierShapes.js";
import { GameMapAreaRect, MODIFY_SHAPE_NAME_RECTANGLE } from "./mapShapeRectangle.js";
import { MODIFY_SHAPE_NAME_CELESTIAL_DIRECTION } from "./mapShapeCelestialDirection.js";
import { MapChunk } from "../map.js";
import { createAbilityPoisonTile } from "../../ability/abilityPoisonTile.js";
import { createBuffPoisonTileImmunity } from "../../debuff/buffImmunityPoisonTile.js";
import { applyDebuff } from "../../debuff/debuff.js";

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
    //    const areaBoss = createAreaBossLighntingCloudMachine(game.state.idCounter, spawn, modifier.id, game);
    //    game.state.bossStuff.bosses.push(areaBoss);
}

function onChunkCreateModify(modifier: GameMapModifier, mapChunk: MapChunk, chunkX: number, chunkY: number, game: Game) {
    const middle = getShapeMiddle(modifier.area, game);
    for (let enemy of mapChunk.characters) {
        console.log(enemy);
        const poison = createAbilityPoisonTile(game.state.idCounter);
        enemy.abilities.push(poison);
        const poisonImmunity = createBuffPoisonTileImmunity();
        applyDebuff(poisonImmunity, enemy, game);
    }
}