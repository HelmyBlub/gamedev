import { createAbility, findAbilityAndOwnerInCharacterById } from "../ability/ability.js";
import { ABILITY_NAME_ICE_AURA, AbilityIceAura } from "../ability/abilityIceAura.js";
import { Character } from "../character/characterModel.js";
import { calculateDistance, getNextId } from "../game.js";
import { FACTION_PLAYER, Game, IdCounter, Position } from "../gameModel.js";
import { changeTileIdOfPosition, getMapTileId, TILE_ID_GRASS, TILE_ID_ICE } from "../map/map.js";
import { MODIFIER_NAME_ICE } from "../map/modifiers/mapModifierIce.js";
import { nextRandom } from "../randomNumberGenerator.js";
import { Curse, CURSES_FUNCTIONS } from "./curse.js";

export const CURSE_ICE = "Curse Ice";

export type CurseIce = Curse & {
    tickInterval: number
    lastTickTime?: number,
    iceAuraIdRef?: number,
    radius: number,
}

export function addCurseIce() {
    CURSES_FUNCTIONS[CURSE_ICE] = {
        create: create,
        onCurseIncreased: onCurseIncreased,
        remove: remove,
        reset: reset,
        tick: tick,
        mapModifierName: MODIFIER_NAME_ICE,
    };
}

function create(idCounter: IdCounter): CurseIce {
    return {
        id: getNextId(idCounter),
        level: 1,
        type: CURSE_ICE,
        tickInterval: 1000,
        color: "blue",
        radius: 0,
    };
}

function remove(curse: Curse, target: Character, game: Game) {
    let ice = curse as CurseIce;
    if (ice.iceAuraIdRef) {
        const iceIndex = target.abilities.findIndex(a => a.id === ice.iceAuraIdRef);
        target.abilities.splice(iceIndex, 1);
    }
}

function reset(curse: Curse) {
    const ice = curse as CurseIce;
    ice.lastTickTime = undefined;
}

function onCurseIncreased(curse: Curse, curseTarget: Character, game: Game) {
    const ice = curse as CurseIce;
    if (ice.iceAuraIdRef === undefined) return;
    const abilityAndOwner = findAbilityAndOwnerInCharacterById(curseTarget, ice.iceAuraIdRef);
    if (!abilityAndOwner) return;
    const iceAura = abilityAndOwner.ability as AbilityIceAura;
    scaleAbilityIceAuraForCurseLevel(iceAura, ice.level, curseTarget.faction, ice);
}

function scaleAbilityIceAuraForCurseLevel(iceAura: AbilityIceAura, level: number, faction: string, curse: CurseIce) {
    if (faction === FACTION_PLAYER) {
        iceAura.damage = level * 100;
    } else {
        iceAura.damage = level * 10;
    }
    iceAura.slowFactor = 1 + 0.05 * level;
    const areaSize = 2000 + level * 2000;
    iceAura.radius = Math.sqrt(areaSize / Math.PI);
    curse.radius = iceAura.radius;
}

function tick(curse: Curse, target: Character, game: Game) {
    const ice = curse as CurseIce;
    if (ice.lastTickTime === undefined) ice.lastTickTime = game.state.time;
    if (ice.lastTickTime + ice.tickInterval < game.state.time) {
        if (ice.iceAuraIdRef === undefined) {
            const abilityIceAura = createAbility(ABILITY_NAME_ICE_AURA, game.state.idCounter) as AbilityIceAura;
            ice.iceAuraIdRef = abilityIceAura.id;
            if (target.faction === FACTION_PLAYER) abilityIceAura.doDamageBreakDown = true;
            target.abilities.push(abilityIceAura);
            scaleAbilityIceAuraForCurseLevel(abilityIceAura, ice.level, target.faction, ice);
        }
        changeRandomTilesToIce(target, ice.radius, Math.ceil(ice.level / 10), game);
        ice.lastTickTime = game.state.time;
    }
}


function changeRandomTilesToIce(centerPosition: Position, radius: number, counter: number, game: Game) {
    const tileRadius = Math.floor(radius / game.state.map.tileSize);
    for (let i = 0; i < counter; i++) {
        const x = Math.floor(nextRandom(game.state.randomSeed) * tileRadius * 2 - tileRadius);
        const y = Math.floor(nextRandom(game.state.randomSeed) * tileRadius * 2 - tileRadius);
        if (calculateDistance({ x: x, y: y }, { x: 0, y: 0 }) <= tileRadius) {
            const position = {
                x: centerPosition.x + x * game.state.map.tileSize,
                y: centerPosition.y + y * game.state.map.tileSize,
            };
            if (getMapTileId(position, game.state.map, game.state.idCounter, game) === TILE_ID_GRASS) {
                changeTileIdOfPosition(position, TILE_ID_ICE, game);
            }
        }
    }
}
