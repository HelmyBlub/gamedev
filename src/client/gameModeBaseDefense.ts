import { Character } from "./character/characterModel.js";
import { getCelestialDirection, getNextBossSpawnDistance } from "./character/enemy/bossEnemy.js";
import { CHARACTER_TYPE_ENEMY_WAVE, EnemyWaveCharacter } from "./character/enemy/enemyWave.js";
import { CHARACTER_TYPE_ENEMY_FIX_RESPAWN_POSITION, ENEMY_FIX_RESPAWN_POSITION_LEVEL_UP_DISTANCE, FixPositionRespawnEnemyCharacter } from "./character/enemy/fixPositionRespawnEnemyModel.js";
import { createDefaultNextKing, KingEnemyCharacter, kingEnemySpawnAtPosition } from "./character/enemy/kingEnemy.js";
import { chunkGraphRectangleSetup } from "./character/pathing.js";
import { CHARACTER_TYPE_BOT } from "./character/playerCharacters/characterBot.js";
import { getTimeSinceFirstKill } from "./game.js";
import { CelestialDirection, Game, Position } from "./gameModel.js";
import { paintTextWithOutline } from "./gamePaint.js";
import { classBuildingPutLegendaryCharacterStuffBackIntoBuilding, legendaryAbilityGiveBlessing } from "./map/buildings/classBuilding.js";
import { determineMapKeysInDistance, findNearNonBlockingPosition, GameMap, getMapMidlePosition, mapKeyToChunkXY } from "./map/map.js";
import { createPlayer, Player } from "./player.js";
import { nextRandom } from "./randomNumberGenerator.js";

export type GameModeBaseDefenseData = {
    currentWave: number,
    enemyAliveTickCount: number,
    removedStuckEnemies: boolean,
    mapCharactersToTick: Character[],
    kingSpawnWaves: number[],
    availableKings: CelestialDirection[],
    startAlpha: number,
}

export const GAME_MODE_BASE_DEFENSE = "BaseDefense";

export function startBaseDefenseMode(game: Game) {
    if (game.state.timeFirstKill != undefined) return;
    game.state.gameMode = GAME_MODE_BASE_DEFENSE;
    game.state.timeFirstKill = game.state.time;
    baseDefenseSetGlobalAlpha(game);
    game.state.gameModeData = {
        currentWave: 0,
        enemyAliveTickCount: 1,
        removedStuckEnemies: false,
        mapCharactersToTick: [],
        kingSpawnWaves: [20, 40, 60, 80],
        availableKings: ["east", "north", "south", "west"],
        startAlpha: game.UI.playerGlobalAlphaMultiplier,
    };
    determineActiveChunksForDefenseMode(game.state.map, game);
    transformFixPositionRespawnEnemiesToWaveEnemies(game);
    game.performance.pathingCache = {};
    for (let i = game.state.pastPlayerCharacters.characters.length - 1; i >= 0; i--) {
        const pastChar = game.state.pastPlayerCharacters.characters.pop();
        if (pastChar) {
            pastChar.willTurnToPetOnDeath = false;
            pastChar.type = CHARACTER_TYPE_BOT;
            for (let ability of pastChar.abilities) {
                ability.disabled = false;
            }
            if (pastChar.pets) {
                for (let pet of pastChar.pets) {
                    for (let ability of pet.abilities) {
                        ability.disabled = false;
                    }
                }
            }
            const pastBotPlayer = createPlayer(-(i + 2), pastChar);
            pastBotPlayer.isBot = true;
            game.state.players.push(pastBotPlayer);
        }
    }
}

export function baseDefenseOnKingKilled(enemy: Character, game: Game) {
    const king = enemy as KingEnemyCharacter;
    if (king.characterClasses && game.state.gameMode === GAME_MODE_BASE_DEFENSE) {
        const celestialDirection = king.celestialDirection;
        if (!celestialDirection) {
            console.log("problem: undefined celestial direction");
            return;
        }
        const oldKing = game.state.bossStuff.nextKings[celestialDirection];
        if (oldKing) {
            legendaryAbilityGiveBlessing(celestialDirection, [oldKing]);
            classBuildingPutLegendaryCharacterStuffBackIntoBuilding(oldKing, game);
            king.state = "dead";
            game.state.bossStuff.nextKings[celestialDirection] = createDefaultNextKing(game.state.idCounter, game);
        }
    }
}

export function baseDefenseWaveToDistance(wave: number): number {
    return wave * ENEMY_FIX_RESPAWN_POSITION_LEVEL_UP_DISTANCE;
}

export function baseDefenseSetGlobalAlpha(game: Game) {
    if (game.UI.playerGlobalAlphaMultiplier > 0.5) {
        game.UI.playerGlobalAlphaMultiplier = 0.5;
    }
}

export function gameModeBaseDefenseTick(game: Game) {
    if (game.state.gameMode !== GAME_MODE_BASE_DEFENSE) return;
    const data = game.state.gameModeData!;
    if (data.enemyAliveTickCount === 0) {
        data.currentWave++;
        let index = 0;
        for (let spawnWave of data.kingSpawnWaves) {
            if (spawnWave === data.currentWave + 1) {
                spawnRandomKing(game, index);
                break;
            }
            index++;
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

function spawnRandomKing(game: Game, index: number) {
    const gameModeData = game.state.gameModeData!;
    const randomIndexAvailableKings = Math.floor(nextRandom(game.state.randomSeed) * gameModeData.availableKings.length);
    const randomCelestialDirection = gameModeData.availableKings[randomIndexAvailableKings];
    gameModeData.availableKings.splice(randomIndexAvailableKings, 1);
    const randomPos: Position = getMapMidlePosition(game.state.map);
    switch (randomCelestialDirection) {
        case "east":
            randomPos.x += 1000
            break;
        case "west":
            randomPos.x -= 1000
            break;
        case "south":
            randomPos.y += 1000
            break;
        case "north":
            randomPos.y -= 1000
            break;
    }
    const spawnPos = findNearNonBlockingPosition(randomPos, game.state.map, game.state.idCounter, game);
    const king = kingEnemySpawnAtPosition(spawnPos, randomCelestialDirection, game);

    if (index > 0) {
        king.maxHp *= Math.pow(5, index);
        king.hp = king.maxHp;
    }
    if (game.UI.playerGlobalAlphaMultiplier > 0.25) {
        game.UI.playerGlobalAlphaMultiplier = 0.25;
    }
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