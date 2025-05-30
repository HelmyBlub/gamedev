import { createAbilityObjectExplode } from "../ability/abilityExplode.js";
import { Character } from "../character/characterModel.js";
import { getNextId } from "../game.js";
import { FACTION_ENEMY, Game, IdCounter, Position } from "../gameModel.js";
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
        create: create,
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
        color: "white",
    };
}

function reset(curse: Curse) {
    const lightning = curse as CurseLightning;
    lightning.lastTickTime = undefined;
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
            if (!curse.cleansed) {
                strikeObject.specificDamageForFactionPlayer = lightning.level * 10;
            } else {
                if (target.faction === FACTION_ENEMY) {
                    strikeObject.damage = lightning.level * 10;
                } else {
                    strikeObject.faction = target.faction;
                }
            }
            game.state.abilityObjects.push(strikeObject);
        }
    }
}

