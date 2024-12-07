import { createAbilityObjectExplode } from "../ability/abilityExplode.js";
import { Character } from "../character/characterModel.js";
import { getCameraPosition, getNextId } from "../game.js";
import { Game, IdCounter, Position } from "../gameModel.js";
import { getPointPaintPosition, paintTextWithOutline } from "../gamePaint.js";
import { MODIFIER_NAME_LIGHTNING } from "../map/modifiers/mapModifierLightning.js";
import { nextRandom } from "../randomNumberGenerator.js";
import { Curse, CURSES_FUNCTIONS } from "./curse.js";

export const CURSE_LIGHTNING = "Curse Lightning";

export type CurseLightning = Curse & {
    tickInterval: number
    lastTickTime?: number,
}

export function addCurseLightning() {
    CURSES_FUNCTIONS[CURSE_LIGHTNING] = {
        copy: copy,
        create: create,
        paint: paint,
        reset: reset,
        tick: tick,
        mapModifierName: MODIFIER_NAME_LIGHTNING,
    };
}

function create(idCounter: IdCounter): CurseLightning {
    return {
        id: getNextId(idCounter),
        level: 1,
        type: CURSE_LIGHTNING,
        tickInterval: 1000,
    };
}

function reset(curse: Curse) {
    const lightning = curse as CurseLightning;
    lightning.lastTickTime = undefined;
}

function copy(curse: Curse, idCounter: IdCounter): Curse {
    const copy = create(idCounter);
    copy.level = curse.level;
    return copy;
}

function paint(ctx: CanvasRenderingContext2D, curse: Curse, target: Character, game: Game) {
    const darkness = curse as CurseLightning;
    if (darkness.visualizeFadeTimer !== undefined && darkness.visualizeFadeTimer > game.state.time) {
        const cameraPosition = getCameraPosition(game);
        const paintPos = getPointPaintPosition(ctx, target, cameraPosition, game.UI.zoom);
        ctx.font = "30px Arial";
        paintTextWithOutline(ctx, "white", "black", `Curse ${CURSE_LIGHTNING} Level ${Math.floor(curse.level)}`, paintPos.x, paintPos.y - 30, true, 3);
    }
}

function tick(curse: Curse, target: Character, game: Game) {
    const lightning = curse as CurseLightning;
    if (lightning.lastTickTime === undefined) lightning.lastTickTime = game.state.time;
    if (lightning.lastTickTime + lightning.tickInterval < game.state.time) {
        lightning.lastTickTime = game.state.time;
        const strikeDelay = 3000;
        const spawnAreaRadius = 100 + lightning.level * 12;
        const explosionRadius = 30 + 2 * lightning.level;
        const damage = 1000 * Math.pow(lightning.level, 2);
        const spawnCounter = Math.ceil(lightning.level / 10);
        for (let i = 0; i < spawnCounter; i++) {
            const randomPos: Position = {
                x: target.x + nextRandom(game.state.randomSeed) * spawnAreaRadius * 2 - spawnAreaRadius,
                y: target.y + nextRandom(game.state.randomSeed) * spawnAreaRadius * 2 - spawnAreaRadius,
            };
            const strikeObject = createAbilityObjectExplode(randomPos, damage, explosionRadius, "", curse.id, strikeDelay, game);
            strikeObject.specificDamageForFactionPlayer = lightning.level * 10;
            game.state.abilityObjects.push(strikeObject);
        }
    }
}

