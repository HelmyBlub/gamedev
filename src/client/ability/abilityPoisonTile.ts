import { getNextId } from "../game.js";
import { Game, IdCounter } from "../gameModel.js";
import { changeTileIdOfPosition, getMapTileId, TILE_ID_GRASS, TILE_ID_ICE, TILE_ID_POISON, TILE_VALUES } from "../map/map.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner } from "./ability.js";

export type AbilityPoisonTile = Ability & {
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
        passive: true,
        upgrades: {},
    };
}

function tickAbility(abilityOwner: AbilityOwner, ability: AbilityPoisonTile, game: Game) {
    const tile = getMapTileId(abilityOwner, game.state.map, game.state.idCounter, game);
    if (tile !== undefined && (tile === TILE_ID_GRASS || tile === TILE_ID_ICE)) {
        changeTileIdOfPosition(abilityOwner, TILE_ID_POISON, game);
    }
}
