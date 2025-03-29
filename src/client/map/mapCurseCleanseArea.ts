import { getPlayerCharacters, resetCharacter } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { createBossWithLevel } from "../character/enemy/bossEnemy.js";
import { CHARACTER_TYPE_CURSE_FOUNTAIN_BOSS, CurseFountainBossEnemy } from "../character/enemy/curseFountainBoss.js";
import { CHARACTER_PET_TYPE_CLONE } from "../character/playerCharacters/characterPetTypeClone.js";
import { TAMER_PET_CHARACTER } from "../character/playerCharacters/tamer/tamerPetCharacter.js";
import { createCurse, Curse, removeCurses } from "../curse/curse.js";
import { CURSE_DARKNESS, CurseDarkness } from "../curse/curseDarkness.js";
import { CURSE_ICE, CurseIce } from "../curse/curseIce.js";
import { CURSE_POISON, CursePoison } from "../curse/cursePoison.js";
import { changeCharacterAndAbilityIds, deepCopy } from "../game.js";
import { FACTION_ENEMY, Game, Position } from "../gameModel.js";
import { chunkXYToMapKey, GameMap, MapChunk } from "./map.js";
import { areaSpawnOnDistanceGetAreaMiddlePosition, GameMapAreaSpawnOnDistance, MAP_AREA_SPAWN_ON_DISTANCE_TYPES_FUNCTIONS } from "./mapAreaSpawnOnDistance.js";
import { mapObjectCreateCleanseFountain } from "./mapObjectCleanseFountain.js";
import { MODIFIER_NAME_DARKNESS } from "./modifiers/mapModifierDarkness.js";

export const MAP_AREA_SPAWN_ON_DISTANCE_CURSE_CLEANSE = "Curse Cleanse Area";

export type GameMapAreaSpawnOnDistanceCleanseFountain = GameMapAreaSpawnOnDistance & {
    bossCounter?: number,
}

export function addMapAreaSpawnOnDistanceCurseCleanse() {
    MAP_AREA_SPAWN_ON_DISTANCE_TYPES_FUNCTIONS[MAP_AREA_SPAWN_ON_DISTANCE_CURSE_CLEANSE] = {
        startFight: startCurseFight,
        modifyChunkGeneration: modifyChunkGeneration,
    }
}

function modifyChunkGeneration(areaSpanOnDistance: GameMapAreaSpawnOnDistance, chunk: MapChunk, chunkX: number, chunkY: number, map: GameMap) {
    if (!areaSpanOnDistance.spawnTopLeftChunk) return;
    const signChunkX = areaSpanOnDistance.spawnTopLeftChunk.x + Math.floor(areaSpanOnDistance.size / 2);
    const signChunkY = areaSpanOnDistance.spawnTopLeftChunk.y + Math.floor(areaSpanOnDistance.size / 2);
    if (chunkX !== signChunkX || chunkY !== signChunkY) return;
    const cleanseFountain = mapObjectCreateCleanseFountain(3, 3, areaSpanOnDistance.id);
    chunk.objects.push(cleanseFountain);
}

function startCurseFight(spawnArea: GameMapAreaSpawnOnDistance, game: Game) {
    const fountainArea = spawnArea as GameMapAreaSpawnOnDistanceCleanseFountain;
    const spawnDistance = 400;
    const spawnOffsets: Position[] = [
        { x: -spawnDistance, y: -spawnDistance },
        { x: spawnDistance, y: -spawnDistance },
        { x: -spawnDistance, y: spawnDistance },
        { x: spawnDistance, y: spawnDistance },
    ];
    var bossCounter = 0;
    for (let player of getPlayerCharacters(game.state.players)) {
        if (player.curses === undefined) continue;
        for (let curse of player.curses) {
            const boss = copyCharacterForBoss(player, game);
            boss.spawnAreaIdRef = spawnArea.id;
            const middle = areaSpawnOnDistanceGetAreaMiddlePosition(spawnArea, game.state.map);
            if (spawnOffsets.length > bossCounter) {
                boss.x = middle!.x + spawnOffsets[bossCounter].x;
                boss.y = middle!.y + spawnOffsets[bossCounter].y;
            } else {
                boss.x = middle!.x - spawnDistance + (bossCounter - spawnOffsets.length + 1) * 50;
                boss.y = middle!.y - spawnDistance;
            }
            boss.maxHp = 5_000_000;
            boss.hp = boss.maxHp;
            const curseLevelCopy = createCurse(curse.type, game.state.idCounter);
            curseLevelCopy.level = curse.level;
            boss.curses = [curseLevelCopy];
            game.state.bossStuff.bosses.push(boss);
            bossCounter++;
        }
        removeCurses(player, game);
    }
    fountainArea.bossCounter = bossCounter;
}

function copyCharacterForBoss(character: Character, game: Game): CurseFountainBossEnemy {
    const boss: CurseFountainBossEnemy = deepCopy(character);
    if (boss.pets) {
        for (let i = boss.pets.length - 1; i >= 0; i--) {
            if (boss.pets[i].type === TAMER_PET_CHARACTER) continue;
            boss.pets.splice(i, 1);
        }
    }
    removeCurses(boss, game);
    boss.type = CHARACTER_TYPE_CURSE_FOUNTAIN_BOSS;
    resetCharacter(boss, game);
    changeCharacterAndAbilityIds(boss, game.state.idCounter);
    boss.faction = FACTION_ENEMY;
    return boss;
}