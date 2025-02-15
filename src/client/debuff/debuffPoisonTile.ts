import { characterTakeDamage } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { CHARACTER_TYPE_BOSS_ENEMY } from "../character/enemy/bossEnemy.js";
import { CHARACTER_TYPE_GOD_ENEMY } from "../character/enemy/god/godEnemy.js";
import { CHARACTER_TYPE_KING_ENEMY } from "../character/enemy/kingEnemy.js";
import { FACTION_ENEMY, Game } from "../gameModel.js";
import { BUFF_NAME_POISON_TILE_IMMUNITY } from "./buffImmunityPoisonTile.js";
import { DEBUFFS_FUNCTIONS, Debuff } from "./debuff.js";

export const DEBUFF_NAME_POISON_TILE = "Poison Tile";
const DURATION = 500;
const DAMAGE_HP_PER_CENT = 4;
export type DebuffPoisonTile = Debuff & {
    tickInterval: number,
    nextTickTime?: number,
}

export function addDebuffPoisonTile() {
    DEBUFFS_FUNCTIONS[DEBUFF_NAME_POISON_TILE] = {
        refreshDebuffEffect: refreshDebuffEffect,
        tickDebuffEffect: tickDebuff,
        allowMultiple: true,
    };
}

export function createDebuffPoisonTile(
    time: number,
): DebuffPoisonTile {
    const baseTickInterval = 250;
    return {
        name: DEBUFF_NAME_POISON_TILE,
        tickInterval: baseTickInterval,
        removeTime: time + DURATION,
    };
}

function refreshDebuffEffect(newDebuff: Debuff, currentDebuff: Debuff, targetCharacter: Character, game: Game) {
    currentDebuff.removeTime = newDebuff.removeTime;
}

function tickDebuff(debuff: Debuff, targetCharacter: Character, game: Game) {
    const debuffDOT = debuff as DebuffPoisonTile;
    if (debuffDOT.nextTickTime === undefined || debuffDOT.nextTickTime <= game.state.time) {
        debuffDOT.nextTickTime = debuffDOT.tickInterval + game.state.time;
        if (targetCharacter.debuffs.find(d => d.name === BUFF_NAME_POISON_TILE_IMMUNITY)) return;
        let damage = targetCharacter.hp / 100 * DAMAGE_HP_PER_CENT;
        if (targetCharacter.faction === FACTION_ENEMY) {
            if (targetCharacter.type === CHARACTER_TYPE_KING_ENEMY) {
                damage = targetCharacter.hp / 500 * DAMAGE_HP_PER_CENT;
            } else if (targetCharacter.type === CHARACTER_TYPE_GOD_ENEMY) {
                damage = targetCharacter.hp / 2000 * DAMAGE_HP_PER_CENT;
            } else if (targetCharacter.type === CHARACTER_TYPE_BOSS_ENEMY) {
                damage = targetCharacter.hp / 200 * DAMAGE_HP_PER_CENT;
            }
        }
        if (damage < 1) return;
        characterTakeDamage(targetCharacter, damage, game, debuffDOT.abilityIdRef, DEBUFF_NAME_POISON_TILE);
    }
}

