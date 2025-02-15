import { Character } from "../character/characterModel.js";
import { Game } from "../gameModel.js";
import { DEBUFFS_FUNCTIONS, Debuff } from "./debuff.js";

export const BUFF_NAME_POISON_TILE_IMMUNITY = "Poison Tile Immunity";
export type BuffImmunity = Debuff & {
}

export function addBuffPoisonTileImmunity() {
    DEBUFFS_FUNCTIONS[BUFF_NAME_POISON_TILE_IMMUNITY] = {
    };
}

export function createBuffPoisonTileImmunity(
    duration?: number,
    gameTime?: number,
): BuffImmunity {
    return {
        name: BUFF_NAME_POISON_TILE_IMMUNITY,
        isBuff: true,
        removeTime: (duration && gameTime) ? duration + gameTime : undefined,
    };
}
