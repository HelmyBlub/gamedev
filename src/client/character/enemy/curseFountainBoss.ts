import { ABILITIES_FUNCTIONS } from "../../ability/ability.js";
import { tickCharacterDebuffs } from "../../debuff/debuff.js";
import { calculateDirection, calculateDistance, endGame } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { mapChunkXYAndTileXYToPosition } from "../../map/map.js";
import { GameMapAreaSpawnOnDistanceCleanseFountain } from "../../map/mapCurseCleanseArea.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { calculateAndSetMoveDirectionToPositionWithPathing, determineClosestCharacter, getPlayerCharacters, moveCharacterTick } from "../character.js";
import { Character, CHARACTER_TYPE_FUNCTIONS } from "../characterModel.js";
import { paintCharacterWithAbilitiesDefault, paintCharatersPets } from "../characterPaint.js";
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
        paintBigUiHpBarOnSpecialFight: paintHpBar,
        paintCharacterType: paintFountainBoss,
        tickFunction: tickFountainBoss,
    };
}

function paintFountainBoss(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) {
    if (character.state === "dead") return;
    const fountainBoss = character as CurseFountainBossEnemy;
    paintCharatersPets(ctx, [character], cameraPosition, game);
    paintCharacterWithAbilitiesDefault(ctx, character, cameraPosition, game);
}

function paintHpBar(ctx: CanvasRenderingContext2D, boss: Character, game: Game) {
    const fountainBoss = boss as CurseFountainBossEnemy;
    const area = game.state.map.areaSpawnOnDistance.find(a => a.id === fountainBoss.spawnAreaIdRef) as GameMapAreaSpawnOnDistanceCleanseFountain;
    if (!area) return;
    const max = area.bossCounter;
    if (!max) return;
    let fountainBossIndex = 0;
    for (let bossIt of game.state.bossStuff.bosses) {
        if (bossIt.type !== CHARACTER_TYPE_CURSE_FOUNTAIN_BOSS || bossIt.state !== "alive") continue;
        if (bossIt === boss) {
            break;
        }
        fountainBossIndex++;
    }

    if (max > 8 && fountainBossIndex >= 8) return;
    const fillAmount = Math.max(0, boss.hp / boss.maxHp);
    const spacing = 10;
    if (fillAmount <= 0) return
    const curseType = fountainBoss.curses![0].type;
    const hpBarWidth = Math.floor(ctx.canvas.width / 2) - spacing;
    const hpBarText = `${curseType} HP: ${(boss.hp / boss.maxHp * 100).toFixed(0)}%`;
    let hpBarLeft = 0;
    if (max === 1) {
        hpBarLeft = Math.floor(ctx.canvas.width / 4) + spacing / 2;
    } else {
        hpBarLeft = fountainBossIndex % 2 === 0 ? spacing / 2 : Math.floor(ctx.canvas.width / 2) + spacing / 2;
    }
    const hpBarHeight = max > 4 ? 10 : max > 1 ? 20 : 40;
    const fontSize = hpBarHeight - 2;
    const top = 22 + Math.floor(fountainBossIndex / 2) * (hpBarHeight + spacing / 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "red";
    ctx.fillRect(hpBarLeft, top, Math.ceil(hpBarWidth * fillAmount), hpBarHeight);
    ctx.beginPath();
    ctx.rect(hpBarLeft, top, hpBarWidth, hpBarHeight);
    ctx.stroke();

    ctx.fillStyle = "black";
    ctx.font = "bold " + fontSize + "px Arial";
    const textWidth = ctx.measureText(hpBarText).width;
    ctx.fillText(hpBarText, Math.floor((hpBarLeft + hpBarWidth / 2) - textWidth / 2), top + fontSize);
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

