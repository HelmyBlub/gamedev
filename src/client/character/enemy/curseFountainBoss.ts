import { endGame } from "../../game.js";
import { Game } from "../../gameModel.js";
import { GameMapAreaSpawnOnDistanceCleanseFountain } from "../../map/mapCurseCleanseArea.js";
import { getPlayerCharacters } from "../character.js";
import { Character, CHARACTER_TYPE_FUNCTIONS } from "../characterModel.js";

export type CurseFountainBossEnemy = Character & {
    spawnAreaIdRef: number,
}

export const CHARACTER_TYPE_CURSE_FOUNTAIN_BOSS = "CurseFountainBoss";

export function addCurseFountainBossType() {
    CHARACTER_TYPE_FUNCTIONS[CHARACTER_TYPE_CURSE_FOUNTAIN_BOSS] = {
        onCharacterKill: onDeath,
    };
}

function onDeath(character: Character, game: Game) {
    const fountainBoss = character as CurseFountainBossEnemy;
    const fountainArea = game.state.map.areaSpawnOnDistance.find(a => a.id === fountainBoss.spawnAreaIdRef) as GameMapAreaSpawnOnDistanceCleanseFountain;
    if (!fountainArea) return;
    fountainArea.bossCounter!--;
    if (fountainArea.bossCounter === 0) {
        for (let player of getPlayerCharacters(game.state.players)) {
            if (player.curses === undefined || player.characterClasses === undefined) continue;
            for (let charClass of player.characterClasses) {
                if (charClass.curses === undefined) continue;
                for (let curse of charClass.curses) {
                    curse.cleansed = true;
                }
            }
        }
        endGame(game, false, false);
    }
}

