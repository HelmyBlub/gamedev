import { calculateDistance, getNextId } from "../game.js";
import { Game, IdCounter } from "../gameModel.js";
import { calculatePosToChunkTileXY, changeTileIdOfMapChunk, changeTileIdOfPosition, getMapTileId, positionToChunkXY, TILE_ID_GRASS, TILE_ID_ICE, TILE_ID_POISON, TILE_VALUES } from "../map/map.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner } from "./ability.js";

export type AbilityPoisonTile = Ability & {
    radius: number,
    nextTickTime?: number,
}

export const ABILITY_NAME_POISON_TILE = "Poison Tile";

export function addAbilityPoisonTile() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_POISON_TILE] = {
        tickAbility: tickAbility,
        createAbility: createAbilityPoisonTile,
    };
}

export function createAbilityPoisonTile(
    idCounter: IdCounter,
): AbilityPoisonTile {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_POISON_TILE,
        radius: 1,
        passive: true,
        upgrades: {},
    };
}

function tickAbility(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const poisonTile = ability as AbilityPoisonTile;
    if (poisonTile.nextTickTime !== undefined && poisonTile.nextTickTime > game.state.time) return;
    const tickInterval = abilityOwner.baseMoveSpeed ? (40 / abilityOwner.baseMoveSpeed) * 16 : 0;
    poisonTile.nextTickTime = game.state.time + tickInterval;

    if (poisonTile.radius < 5) {
        const tile = getMapTileId(abilityOwner, game.state.map, game.state.idCounter, game);
        if (tile !== undefined && (tile === TILE_ID_GRASS || tile === TILE_ID_ICE)) {
            changeTileIdOfPosition(abilityOwner, TILE_ID_POISON, game);
        }
    } else {
        const tileRadius = Math.round(poisonTile.radius / game.state.map.tileSize);
        for (let i = -tileRadius; i <= tileRadius; i++) {
            for (let j = -tileRadius; j <= tileRadius; j++) {
                if (calculateDistance({ x: i, y: j }, { x: 0, y: 0 }) <= tileRadius) {
                    const position = {
                        x: abilityOwner.x + i * game.state.map.tileSize,
                        y: abilityOwner.y + j * game.state.map.tileSize,
                    };
                    const tile = getMapTileId(position, game.state.map, game.state.idCounter, game);
                    if (tile !== undefined && (tile === TILE_ID_GRASS || tile === TILE_ID_ICE)) {
                        changeTileIdOfPosition(position, TILE_ID_POISON, game);
                    }
                }
            }
        }
    }
}
