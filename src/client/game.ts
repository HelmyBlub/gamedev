import { countAlivePlayerCharacters, detectCharacterDeath, findCharacterById, tickCharacters } from "./character/character.js";
import { paintAll } from "./gamePaint.js";
import { gameInitPlayers } from "./player.js";
import { tickPlayerInputs } from "./playerInput.js";
import { tickProjectiles } from "./projectile.js";
import { Character } from "./character/characterModel.js";
import { Position, GameState, Game } from "./gameModel.js";
import { createFixPositionRespawnEnemy } from "./character/enemy/fixPositionRespawnEnemy.js";

export function calculateDirection(startPos: Position, targetPos: Position): number {
    let direction = 0;

    let yDiff = (startPos.y - targetPos.y);
    let xDiff = (startPos.x - targetPos.x);

    if (xDiff >= 0) {
        direction = - Math.PI + Math.atan(yDiff / xDiff);
    } else if (yDiff <= 0) {
        direction = - Math.atan(xDiff / yDiff) + Math.PI / 2;
    } else {
        direction = - Math.atan(xDiff / yDiff) - Math.PI / 2;
    }

    return direction;
}

export function getNextId(state: GameState) {
    return state.idCounter++;
}

export function gameRestart(game: Game) {
    gameInit(game);
}

export function gameInit(game: Game) {
    game.state.projectiles = [];
    game.state.characters = [];
    game.state.players = [];
    game.state.killCounter = 0;
    game.state.ended = false;
    game.state.triggerRestart = false;
    game.state.restartAfterTick = false;
    game.state.time = 0;
    game.realStartTime = performance.now();
    game.state.playerInputs = [];
    game.clientKeyBindings = [];
    game.performance = {};
    gameInitPlayers(game);
    if (game.multiplayer.websocket !== null) {
        game.multiplayer.maxServerGameTime = 0;
        game.multiplayer.smoothedGameTime = 0;
        game.realStartTime = game.multiplayer.lastRestartReceiveTime!;
        game.state.playerInputs = game.multiplayer.cachePlayerInputs!;
    }
}

export function getCameraPosition(game: Game): Position {
    let cameraPosition: Position = { x: 0, y: 0 };
    if (game.camera.characterId !== undefined) {
        let character = findCharacterById(game.state.characters, game.camera.characterId);
        if (character !== null) cameraPosition = character;
    }

    return cameraPosition;
}

export function calculateDistance(objectA: { x: number, y: number }, objectB: { x: number, y: number }) {
    let xDiff = objectA.x - objectB.x;
    let yDiff = objectA.y - objectB.y;
    return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
}

export function runner(game: Game) {
    const tickInterval = 16;
    const timeNow = performance.now();

    if (game.multiplayer.websocket === null) {
        while (!game.state.ended && timeNow > game.realStartTime + game.state.time) {
            tick(tickInterval, game);
        }
    } else {
        let counter = 0;
        while (!game.state.ended && (game.multiplayer.maxServerGameTime >= game.state.time + tickInterval || game.state.triggerRestart) && counter < 50) {
            counter++;
            let delayDiff = game.multiplayer.delay - game.multiplayer.minDelay;
            if (timeNow < game.realStartTime + game.state.time + game.multiplayer.updateInterval + delayDiff) {
                break;
            }
            tick(tickInterval, game);
        }
        if (counter >= 50) {
            console.log("game can not keep up");
        }
    }

    paintAll(game.ctx, game);
    if(game.state.ended && game.state.triggerRestart){
        gameRestart(game);
    }
    setTimeout(() => runner(game), tickInterval);
}

function gameEndedCheck(game: Game) {
    let alivePlayersCount = countAlivePlayerCharacters(game.state.characters)
    if (alivePlayersCount === 0) {
        return true;
    }
    return false;
}

function endGame(state: GameState) {
    state.ended = true;
    state.highscores.scores.push(state.killCounter);
    state.highscores.scores.sort((a, b) => b - a);
    if (state.highscores.scores.length > state.highscores.maxLength) {
        state.highscores.scores.pop();
    }
}

function tick(gameTimePassed: number, game: Game) {
    if (!game.state.ended) {
        game.state.time += gameTimePassed;
        tickPlayerInputs(game.state.playerInputs, game.state.time, game);
        createFixPositionRespawnEnemy(game);
        //createRandomSpawnFollowingEnemy(game);
        tickCharacters(game.state.characters, game);
        tickProjectiles(game.state.projectiles, game.state.time);
        detectProjectileToCharacterHit(game.state);
        detectCharacterDeath(game.state.characters, game.state, game.avaialbleUpgrades);
        if (gameEndedCheck(game)) endGame(game.state);
        if (game.state.restartAfterTick) gameRestart(game);
    }
}

function detectProjectileToCharacterHit(state: GameState) {
    let characters: Character[] = state.characters;

    for (let projIt = 0; projIt < state.projectiles.length; projIt++) {
        let projectile = state.projectiles[projIt];
        for (let charIt = characters.length - 1; charIt >= 0; charIt--) {
            let c = characters[charIt];
            if (c.isDead || c.faction === projectile.faction) continue;
            let distance = calculateDistance(c, projectile);
            if (distance < projectile.size + c.size) {
                c.hp -= projectile.damage;
                c.wasHitRecently = true;
                projectile.pierceCount--;
                if (projectile.pierceCount < 0) break;
            }
        }
    }
}
