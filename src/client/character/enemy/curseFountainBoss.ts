import { ABILITIES_FUNCTIONS } from "../../ability/ability.js";
import { tickCharacterDebuffs } from "../../debuff/debuff.js";
import { calculateDirection, calculateDistance, endGame } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { mapChunkXYAndTileXYToPosition } from "../../map/map.js";
import { GameMapAreaSpawnOnDistanceCleanseFountain } from "../../map/mapCurseCleanseArea.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { calculateAndSetMoveDirectionToPositionWithPathing, determineClosestCharacter, getPlayerCharacters, moveCharacterTick } from "../character.js";
import { Character, CHARACTER_TYPE_FUNCTIONS } from "../characterModel.js";
import { PathingCache } from "../pathing.js";

export const BOSS_FOUNTAIN_BEHAVIOR_FOLLOW_PLAYER = "follow player";
export const BOSS_FOUNTAIN_BEHAVIOR_MOVE_AROUND = "move around";

export type CurseFountainBossEnemy = Character & {
    spawnAreaIdRef: number,
    aiBehavior?: string,
    moveTo?: Position,
}

export const CHARACTER_TYPE_CURSE_FOUNTAIN_BOSS = "CurseFountainBoss";

export function addCurseFountainBossType() {
    CHARACTER_TYPE_FUNCTIONS[CHARACTER_TYPE_CURSE_FOUNTAIN_BOSS] = {
        onCharacterKill: onDeath,
        tickFunction: tickFountainBoss,
    };
}

function tickFountainBoss(enemy: Character, game: Game, pathingCache: PathingCache | null) {
    if (enemy.state === "dead") return;
    const fountainBoss = enemy as CurseFountainBossEnemy;
    if (fountainBoss.aiBehavior === BOSS_FOUNTAIN_BEHAVIOR_FOLLOW_PLAYER) {
        const playerCharacters = getPlayerCharacters(game.state.players);
        let closest = determineClosestCharacter(enemy, playerCharacters);
        calculateAndSetMoveDirectionToPositionWithPathing(enemy, closest.minDistanceCharacter, game.state.map, pathingCache, game.state.idCounter, game.state.time, game);
    } else if (fountainBoss.aiBehavior === BOSS_FOUNTAIN_BEHAVIOR_MOVE_AROUND) {
        if (!fountainBoss.moveTo) {
            const spawnArea = game.state.map.areaSpawnOnDistance.find(a => a.id === fountainBoss.spawnAreaIdRef);
            if (spawnArea) {
                const topLeft = mapChunkXYAndTileXYToPosition(spawnArea.spawnTopLeftChunk!.x, spawnArea.spawnTopLeftChunk!.y, 1, 1, game.state.map);
                const size = spawnArea.size * game.state.map.chunkLength * game.state.map.tileSize - game.state.map.tileSize * 3;
                fountainBoss.moveTo = {
                    x: topLeft.x + nextRandom(game.state.randomSeed) * size,
                    y: topLeft.y + nextRandom(game.state.randomSeed) * size,
                }
            }
        }
        if (calculateDistance(fountainBoss, fountainBoss.moveTo!) < fountainBoss.baseMoveSpeed) {
            fountainBoss.moveTo = undefined;
            fountainBoss.isMoving = false;
        }
        if (fountainBoss.moveTo) {
            fountainBoss.moveDirection = calculateDirection(fountainBoss, fountainBoss.moveTo);
            fountainBoss.isMoving = true;
        }
    }

    moveCharacterTick(enemy, game.state.map, game.state.idCounter, game);
    for (let ability of enemy.abilities) {
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions) {
            if (abilityFunctions.tickAI) abilityFunctions.tickAI(enemy, ability, game);
        }
    }
    tickCharacterDebuffs(enemy, game);
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
    } else {
        if (fountainBoss.aiBehavior === BOSS_FOUNTAIN_BEHAVIOR_FOLLOW_PLAYER) {
            for (let boss of game.state.bossStuff.bosses) {
                if (boss.type === CHARACTER_TYPE_CURSE_FOUNTAIN_BOSS && boss.state === "alive" && boss !== fountainBoss) {
                    const otherFountainBoss = boss as CurseFountainBossEnemy;
                    otherFountainBoss.aiBehavior = BOSS_FOUNTAIN_BEHAVIOR_FOLLOW_PLAYER;
                    otherFountainBoss.moveTo = undefined;
                    break;
                }
            }
        }
    }
}

