import { createCharacter, ENEMY_FACTION, PLAYER_FACTION } from "../character/characterModel.js";
import { handleCommand } from "../commands.js";
import { closeGame, detectProjectileToCharacterHit, gameRestart } from "../game.js";
import { Game } from "../gameModel.js";
import { createGame } from "../main.js";
import { addEnemyToMap, createMap, GameMap } from "../map/map.js";
import { createNewChunkTiles } from "../map/mapGeneration.js";
import { websocketConnect } from "../multiplayerConenction.js";
import { PlayerInput } from "../playerInput.js";
import { createProjectile, Projectile } from "../projectile.js";
import { nextRandom, RandomSeed } from "../randomNumberGenerator.js";
import { testInputs } from "./testInputs.js";
import { testMultiplayerInputs } from "./testMultiplayerInputs.js";

export function testGame(game: Game) {
    runGameWithPlayerInputs(game, testInputs);
    //runGameWithPlayerInputs(game, testMultiplayerInputs);
}

//---------------------//
function runGameWithPlayerInputs(game: Game, playerInputs: PlayerInput[]) {
    const playerIds = getClientIds(playerInputs);
    if(playerIds.length > 1){
        runGameWithPlayerInputsMultiplayer(game, playerInputs, playerIds);
    }else{
        runGameWithPlayerInputsSinglePlayer(game, playerInputs);
    }

}
async function runGameWithPlayerInputsMultiplayer(game: Game, playerInputs: PlayerInput[], playerIds: number[]){
    const playerCount = playerIds.length;
    const games: Game[] = [game];
    if(!game.multiplayer.websocket){
        websocketConnect(game);
        game.testing = {
            startTime: performance.now(),
        };
    }
    for(let i = 1; i< playerCount; i++){
        games.push(createGame(undefined, true));
        websocketConnect(games[i]);
        games[i].testing = {
            startTime: performance.now(),
            doNotPaint: true,
        };
    }

    const waitForMultiplayerConnections = getUntilPromise(() => {
        for(const tGame of games){
            if(!tGame.multiplayer.websocket) return false;
        }
        return true;
    }, 50);
    await waitForMultiplayerConnections;

    game.state.ended = true;
    handleCommand(game, { command: "restart", clientId: game.multiplayer.myClientId, testing: true });
    const waitForRestart = getUntilPromise(() => {
        for(const tGame of games){
            if(tGame.state.ended) return false;
        }
        return true;
    }, 50);
    await waitForRestart;

    for (const input of playerInputs) {
        let playerIndex = playerIds.findIndex((value) => input.clientId === value);
        input.clientId = games[playerIndex].multiplayer.myClientId;
        if(input.executeTime > games[playerIndex].state.time + 2000){
            await getUntilPromise(() => input.executeTime < games[playerIndex].state.time + 2000, 50);
        }
        handleCommand(games[playerIndex], input);
    }        

    for(let i = 1; i< playerCount; i++){
        closeGame(games[i]);
    }
}

// time: 14172.899999999907
// time: 12625.199999999953, with chunkPaintCache
function runGameWithPlayerInputsSinglePlayer(game: Game, playerInputs: PlayerInput[]){
    game.testing = {
        startTime: performance.now(),
        frameSkipAmount: 60,
        zeroTimeout: true,
    };
    game.state.ended = true;
    handleCommand(game, { command: "restart", clientId: game.multiplayer.myClientId, testing: true });

    const myPromise = getUntilPromise(() => !game.state.ended, 50);
    myPromise.then(() => {
        for (const input of playerInputs) {
            input.clientId = game.multiplayer.myClientId;
            handleCommand(game, input);
        }        
    });
}

function getClientIds( playerInputs: PlayerInput[]): number[]{
    let clients: Set<number> = new Set<number>();
    for(const playerInput of playerInputs){
        clients.add(playerInput.clientId);
    }
    return [...clients];
}


function getUntilPromise(fn: Function, time = 1000) {
    return new Promise((resolve) => {
        const timer = setInterval(() => {
            if (fn()) {
                clearInterval(timer);
                resolve(true);
            }
        }, time);
    });
}




//---------------------//

function createTestCharacter(id: number, x: number, y: number) {
    return createCharacter(id, x, y, 5, "black", 0.5, 1000, 1, ENEMY_FACTION, "randomSpawnFollowingEnemy", true);
}

function createTestProjectiles(x: number, y: number, pierceCount: number = 10, timeToLive: number = 1000) {
    return createProjectile(x, y, 0, 2, PLAYER_FACTION, 2, 0, pierceCount, timeToLive);
}


// time 4520 4520, firefox, only 1 iteration
// time 2.566000000005588 256.6000000005588, firefox, 100 iterations, 
function testDetectProjectileToCharacterHitPerformance() {
    let iterations = 100;
    let numberEnemies = 1000000;
    let numberProjectiles = 100;
    let projectiles: Projectile[] = [];
    let map: GameMap = createMap();
    let randomSeed: RandomSeed = { seed: 0 };
    for (let i = 0; i < numberEnemies; i++) {
        let posX = nextRandom(randomSeed) * 10000;
        let posY = nextRandom(randomSeed) * 10000;
        createNewChunk(map, Math.floor(posY / (map.tileSize * map.chunkLength)), Math.floor(posX / (map.tileSize * map.chunkLength)));
        addEnemyToMap(map, createTestCharacter(i, posX, posY));
    }
    for (let i = 0; i < numberProjectiles; i++) {
        projectiles.push(createTestProjectiles(nextRandom(randomSeed) * 200, nextRandom(randomSeed) * 200));
    }

    let startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
        detectProjectileToCharacterHit(map, projectiles);
    }
    let time = performance.now() - startTime;
    console.log("time", time / iterations, time);
}

function createNewChunk(map: GameMap, chunkI: number, chunkJ: number) {
    let key = `${chunkI}_${chunkJ}`;
    if (map.chunks[key] !== undefined) return;
    let newChunk = { tiles: createNewChunkTiles(map.chunkLength, chunkI, chunkJ, map.seed!), characters: [] };
    map.chunks[key] = newChunk;
}