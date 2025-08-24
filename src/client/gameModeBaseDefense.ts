import { Character } from "./character/characterModel.js";
import { getCelestialDirection, getNextBossSpawnDistance } from "./character/enemy/bossEnemy.js";
import { CHARACTER_TYPE_ENEMY_WAVE, EnemyWaveCharacter } from "./character/enemy/enemyWave.js";
import { CHARACTER_TYPE_ENEMY_FIX_RESPAWN_POSITION, ENEMY_FIX_RESPAWN_POSITION_LEVEL_UP_DISTANCE, FixPositionRespawnEnemyCharacter } from "./character/enemy/fixPositionRespawnEnemyModel.js";
import { kingEnemySpawnAtPosition } from "./character/enemy/kingEnemy.js";
import { chunkGraphRectangleSetup } from "./character/pathing.js";
import { getTimeSinceFirstKill } from "./game.js";
import { Game, Position } from "./gameModel.js";
import { paintTextWithOutline } from "./gamePaint.js";
import { determineMapKeysInDistance, findNearNonBlockingPosition, GameMap, getMapMidlePosition, mapKeyToChunkXY } from "./map/map.js";
import { Player } from "./player.js";
import { nextRandom } from "./randomNumberGenerator.js";

export type GameModeBaseDefenseData = {
    currentWave: number,
    enemyAliveTickCount: number,
    removedStuckEnemies: boolean,
    mapCharactersToTick: Character[],
    kingSpawnWaves: number[],
    kingSpawned: boolean,
}

export const GAME_MODE_BASE_DEFENSE = "BaseDefense";

export function startBaseDefenseMode(game: Game) {
    if (game.state.timeFirstKill != undefined) return;
    game.state.gameMode = GAME_MODE_BASE_DEFENSE;
    game.state.timeFirstKill = game.state.time;
    game.state.gameModeData = {
        currentWave: 0,
        enemyAliveTickCount: 1,
        removedStuckEnemies: false,
        mapCharactersToTick: [],
        kingSpawnWaves: [20],
        kingSpawned: false,
    };
    determineActiveChunksForDefenseMode(game.state.map, game);
    transformFixPositionRespawnEnemiesToWaveEnemies(game);
    game.performance.pathingCache = {};
    if (game.UI.playerGlobalAlphaMultiplier > 0.5) {
        game.UI.playerGlobalAlphaMultiplier = 0.5;
    }
}

export function baseDefenseWaveToDistance(wave: number): number {
    return wave * ENEMY_FIX_RESPAWN_POSITION_LEVEL_UP_DISTANCE;
}

export function gameModeBaseDefenseTick(game: Game) {
    if (game.state.gameMode !== GAME_MODE_BASE_DEFENSE) return;
    const data = game.state.gameModeData!;
    if (data.enemyAliveTickCount === 0) {
        data.currentWave++;
        for (let spawnWave of data.kingSpawnWaves) {
            if (spawnWave === data.currentWave + 1) {
                spawnRandomKing(game);
                data.kingSpawned = true;
                break;
            }
        }
    }

    data.enemyAliveTickCount = 0;
    if (!data.removedStuckEnemies) {
        if (getTimeSinceFirstKill(game.state) > 1000) {
            const map = game.state.map;
            for (let i = 0; i < map.activeChunkKeys.length; i++) {
                const chunk = map.chunks[map.activeChunkKeys[i]];
                for (let j = chunk.characters.length - 1; j >= 0; j--) {
                    const character = chunk.characters[j];
                    if (!character.isMoving) {
                        chunk.characters.splice(j, 1);
                    }
                }
            }
            data.removedStuckEnemies = true;
        }
    }
}

function spawnRandomKing(game: Game) {
    const randomValueForDirection = Math.floor(nextRandom(game.state.randomSeed) * 4);
    const randomPos: Position = { x: 0, y: 0 };
    switch (randomValueForDirection) {
        case 0:
            randomPos.x = 1000
            break;
        case 1:
            randomPos.x = -1000
            break;
        case 2:
            randomPos.y = 1000
            break;
        case 3:
            randomPos.y = -1000
            break;
    }
    const spawnPos = findNearNonBlockingPosition(randomPos, game.state.map, game.state.idCounter, game);
    const randomCelestialDirection = getCelestialDirection(spawnPos, game.state.map);
    kingEnemySpawnAtPosition(spawnPos, randomCelestialDirection, game);
}

export function paintGameModeBaseDefeseWave(ctx: CanvasRenderingContext2D, player: Player, topLeft: Position, height: number, game: Game): number {
    const wave = game.state.gameModeData!.currentWave + 1;
    const fontSize = Math.floor(height / 2);
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.lineWidth = 2;
    ctx.font = `${fontSize}px Arial`;
    const margin = 1;
    const waveDisplayText = `Wave`;
    const waveDisplayPaintTextWidth = ctx.measureText(waveDisplayText).width;
    const waveValuePaintWidth = ctx.measureText(wave.toFixed(0)).width
    const wavePaintWidth = Math.max(waveDisplayPaintTextWidth, waveValuePaintWidth) + margin * 2;
    ctx.fillRect(topLeft.x, topLeft.y, wavePaintWidth, height);
    ctx.beginPath();
    ctx.rect(topLeft.x, topLeft.y, wavePaintWidth, height);
    ctx.stroke();
    paintTextWithOutline(ctx, "white", "black", waveDisplayText, topLeft.x + margin, topLeft.y + fontSize);
    paintTextWithOutline(ctx, "white", "black", `${wave}`, topLeft.x + Math.floor(wavePaintWidth / 2), topLeft.y + height - 1, true);
    return wavePaintWidth;
}

export function baseDefenseGetNextBossSpawnWave(game: Game): number {
    const distance = getNextBossSpawnDistance(game.state.bossStuff);
    const waveSpawn = Math.floor(distance / ENEMY_FIX_RESPAWN_POSITION_LEVEL_UP_DISTANCE);
    return waveSpawn;
}

export function transformFixPositionRespawnEnemyToWaveEnemy(fixPositionEnemy: FixPositionRespawnEnemyCharacter) {
    delete fixPositionEnemy.alertEnemyRange;
    delete (fixPositionEnemy as any).autoAggroRange;
    delete (fixPositionEnemy as any).maxAggroRange;
    delete (fixPositionEnemy as any).isAggroed;
    delete fixPositionEnemy.nextTickTime;
    delete fixPositionEnemy.respawnOnTime;
    delete (fixPositionEnemy as any).respawnTime;
    (fixPositionEnemy as any as EnemyWaveCharacter).testPorperty = 1;
    fixPositionEnemy.type = CHARACTER_TYPE_ENEMY_WAVE;
}


function determineActiveChunksForDefenseMode(map: GameMap, game: Game) {
    const keySet: Set<string> = new Set();
    const nearMapKeys = determineMapKeysInDistance(getMapMidlePosition(map), map, map.activeChunkRange, false);
    for (let mapKey of nearMapKeys) {
        keySet.add(mapKey);
        if (!game.performance.chunkGraphRectangles[mapKey]) {
            chunkGraphRectangleSetup(mapKeyToChunkXY(mapKey), game);
        }
    }
    map.activeChunkKeys = [...keySet];
}

function transformFixPositionRespawnEnemiesToWaveEnemies(game: Game) {
    for (let chunkKey of game.state.map.activeChunkKeys) {
        const chunk = game.state.map.chunks[chunkKey];
        for (let enemy of chunk.characters) {
            if (enemy.type === CHARACTER_TYPE_ENEMY_FIX_RESPAWN_POSITION) {
                transformFixPositionRespawnEnemyToWaveEnemy(enemy as FixPositionRespawnEnemyCharacter);
            }
        }
    }
}