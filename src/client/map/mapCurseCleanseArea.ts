import { setAbilityToBossLevel } from "../ability/ability.js";
import { getPlayerCharacters, resetCharacter } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { BOSS_FOUNTAIN_BEHAVIOR_FOLLOW_PLAYER, BOSS_FOUNTAIN_BEHAVIOR_MOVE_AROUND, CHARACTER_TYPE_CURSE_FOUNTAIN_BOSS, CurseFountainBossEnemy } from "../character/enemy/curseFountainBoss.js";
import { TAMER_PET_CHARACTER } from "../character/playerCharacters/tamer/tamerPetCharacter.js";
import { createCurse, removeCurses } from "../curse/curse.js";
import { CURSE_LIGHTNING } from "../curse/curseLightning.js";
import { changeCharacterAndAbilityIds, deepCopy } from "../game.js";
import { FACTION_ENEMY, Game, Position } from "../gameModel.js";
import { GameMap, MapChunk } from "./map.js";
import { areaSpawnOnDistanceGetAreaMiddlePosition, GameMapAreaSpawnOnDistance, MAP_AREA_SPAWN_ON_DISTANCE_TYPES_FUNCTIONS } from "./mapAreaSpawnOnDistance.js";
import { mapObjectCreateCleanseFountain } from "./mapObjectCleanseFountain.js";

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
    let bossCounter = 0;
    const bossHp = determineBossHp(game);
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
            boss.maxHp = bossHp;
            boss.hp = boss.maxHp;
            const curseLevelCopy = createCurse(curse.type, game.state.idCounter);
            curseLevelCopy.level = curse.level;
            if (curse.type === CURSE_LIGHTNING) {
                boss.aiBehavior = BOSS_FOUNTAIN_BEHAVIOR_FOLLOW_PLAYER;
            } else {
                boss.aiBehavior = BOSS_FOUNTAIN_BEHAVIOR_MOVE_AROUND;
            }
            boss.curses = [curseLevelCopy];
            game.state.bossStuff.bosses.push(boss);
            bossCounter++;
        }
        removeCurses(player, game);
    }
    fountainArea.bossCounter = bossCounter;
}

function determineBossHp(game: Game): number {
    let curseLevelSum = 0;
    for (let player of getPlayerCharacters(game.state.players)) {
        if (player.curses === undefined) continue;
        for (let curse of player.curses) {
            curseLevelSum += curse.level;
        }
    }
    const baseHp = 1_000_000_000;
    const hpFactor = 1 + curseLevelSum * curseLevelSum / 1_000;
    return baseHp * hpFactor;
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
    for (let ability of boss.abilities) {
        setAbilityToBossLevel(ability, 10);
    }
    boss.faction = FACTION_ENEMY;
    return boss;
}